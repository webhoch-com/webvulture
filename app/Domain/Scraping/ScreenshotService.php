<?php

namespace App\Domain\Scraping;

use App\Domain\Storage\LeadStorageService;
use Illuminate\Support\Facades\Log;
use Spatie\Browsershot\Browsershot;

class ScreenshotService
{
    protected static ?string $resolvedChromePath = null;

    public function __construct(protected LeadStorageService $store) {}

    /**
     * Capture screenshots:
     * - homepage-desktop: 1440px full-page
     * - homepage-mobile:  390px full-page
     * - homepage-atf:     1440px viewport only (above fold)
     * - section-{n}:      each <section>/<article>/<main> element clipped
     *
     * Returns map of slot => relative_storage_path.
     */
    public function capture(int $leadId, string $url): array
    {
        $chromePath = $this->chromePath();
        $screenshots = [];

        // ─── Full-page shots ────────────────────────────────────────────────
        $fullPageCaptures = [
            'homepage-desktop' => ['width' => 1440, 'height' => 900,  'fullPage' => true,  'mobile' => false],
            'homepage-mobile' => ['width' => 390,  'height' => 844,  'fullPage' => true,  'mobile' => true],
            'homepage-atf' => ['width' => 1440, 'height' => 900,  'fullPage' => false, 'mobile' => false],
        ];

        foreach ($fullPageCaptures as $name => $opts) {
            try {
                $path = $this->store->screenshotPath($leadId, "{$name}.png");
                $absPath = $this->store->absolutePath($path);
                @mkdir(dirname($absPath), 0755, true);

                $shot = $this->baseShot($url, $chromePath, $opts['width'], $opts['height']);

                if ($opts['fullPage']) {
                    $shot->fullPage();
                }
                if ($opts['mobile']) {
                    $shot->mobile()->touch();
                }

                $shot->save($absPath);
                $screenshots[$name] = $path;
                Log::info("Screenshot OK: {$name}");
            } catch (\Throwable $e) {
                Log::warning("Screenshot failed [{$name}] lead#{$leadId}: {$e->getMessage()}");
            }
        }

        // ─── Section screenshots via JS injection ───────────────────────────
        try {
            $sections = $this->captureSections($leadId, $url, $chromePath);
            $screenshots = array_merge($screenshots, $sections);
        } catch (\Throwable $e) {
            Log::warning("Section screenshots failed lead#{$leadId}: {$e->getMessage()}");
        }

        return $screenshots;
    }

    protected function captureSections(int $leadId, string $url, string $chromePath): array
    {
        $screenshots = [];

        // Use Browsershot evaluate to get section bounding boxes
        $shot = $this->baseShot($url, $chromePath, 1440, 900);

        $sectionsJson = $shot->evaluate(<<<'JS'
            JSON.stringify(
                Array.from(document.querySelectorAll('section, [class*="section"], [id*="section"], main > div, header'))
                    .filter(el => {
                        const r = el.getBoundingClientRect();
                        return r.height > 100 && r.width > 200;
                    })
                    .slice(0, 8)
                    .map((el, i) => {
                        const r = el.getBoundingClientRect();
                        return {
                            index: i,
                            top: Math.round(window.scrollY + r.top),
                            left: Math.round(r.left),
                            width: Math.round(r.width),
                            height: Math.min(Math.round(r.height), 1200),
                            label: el.id || el.className.split(' ')[0] || 'section-' + i,
                        };
                    })
            )
        JS);

        $sections = json_decode($sectionsJson, true) ?? [];

        foreach ($sections as $section) {
            $i = $section['index'];
            $name = 'section-'.$i;
            try {
                $path = $this->store->screenshotPath($leadId, "{$name}.png");
                $absPath = $this->store->absolutePath($path);
                @mkdir(dirname($absPath), 0755, true);

                $this->baseShot($url, $chromePath, 1440, 900)
                    ->clip(
                        $section['left'],
                        $section['top'],
                        $section['width'],
                        $section['height'],
                    )
                    ->save($absPath);

                $screenshots[$name] = $path;
                Log::info("Section screenshot OK: {$name} (label: {$section['label']})");
            } catch (\Throwable $e) {
                Log::warning("Section screenshot [{$name}] failed: {$e->getMessage()}");
            }
        }

        return $screenshots;
    }

    protected function baseShot(string $url, string $chromePath, int $width, int $height): Browsershot
    {
        return Browsershot::url($url)
            ->setChromePath($chromePath)
            ->windowSize($width, $height)
            ->timeout(45)
            ->noSandbox()
            ->addChromiumArguments([
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-extensions',
                '--no-first-run',
                '--headless',
            ])
            ->dismissDialogs()
            ->waitUntilNetworkIdle();
    }

    protected function chromePath(): string
    {
        if (self::$resolvedChromePath) {
            return self::$resolvedChromePath;
        }

        if ($envPath = config('services.browsershot.chrome_path')) {
            return self::$resolvedChromePath = (string) $envPath;
        }

        try {
            $nodeBin = (string) config('services.browsershot.node_binary', 'node');
            $output = shell_exec(
                "{$nodeBin} -e \"try{console.log(require('puppeteer').executablePath())}catch(e){process.exit(1)}\" 2>/dev/null"
            );
            $path = trim((string) $output);
            if ($path && file_exists($path)) {
                Log::info("Using puppeteer Chrome: {$path}");

                return self::$resolvedChromePath = $path;
            }
        } catch (\Throwable) {
        }

        $linuxPaths = [
            '/usr/bin/chromium',
            '/usr/bin/chromium-browser',
            '/usr/bin/google-chrome',
            '/usr/bin/google-chrome-stable',
            '/snap/bin/chromium',
        ];

        foreach ($linuxPaths as $p) {
            if (file_exists($p)) {
                return self::$resolvedChromePath = $p;
            }
        }

        $mac = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
        if (file_exists($mac)) {
            return self::$resolvedChromePath = $mac;
        }

        throw new \RuntimeException(
            'No Chrome binary found. Set CHROME_PATH env or run: npm install puppeteer'
        );
    }
}
