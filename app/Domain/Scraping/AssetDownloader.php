<?php

namespace App\Domain\Scraping;

use App\Domain\Storage\LeadStorageService;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AssetDownloader
{
    private const MAX_BYTES = 5 * 1024 * 1024;
    private const MIN_BYTES = 1024;
    private const TIMEOUT = 10;
    private const MAX_IMAGES = 30;

    // Raster only — SVG bewusst ausgenommen, weil Stored-XSS-Risiko zu hoch ist:
    // SVG kann <script> und Event-Handler enthalten, und Browser interpretieren
    // sie bei direkter Navigation (rechte Maustaste → Bild öffnen) als Dokument
    // im selben Origin wie die Hosting-App. Logos aus dem Web sind in >95% PNG/WEBP/JPG.
    // Falls SVG später zurück soll: nur mit serverseitigem DOMDocument-Sanitizer.
    private const ALLOWED_MIMES = [
        'image/jpeg' => 'jpg',
        'image/jpg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
        'image/gif' => 'gif',
    ];

    public function __construct(
        protected LeadStorageService $store,
    ) {}

    /**
     * Download an array of image URLs into storage/app/public/leads/{id}/assets/.
     *
     * @param  array<int, array{src: string, alt?: string, role?: string}>  $images
     * @return array<int, array{src_original: string, public_url: string, local_path: string, role: string, alt: string, bytes: int}>
     */
    public function downloadAll(int $leadId, array $images, string $baseUrl): array
    {
        $downloaded = [];
        $seen = [];

        foreach (array_slice($images, 0, self::MAX_IMAGES) as $img) {
            $src = $img['src'] ?? null;
            if (!$src || isset($seen[$src])) {
                continue;
            }
            $seen[$src] = true;

            $result = $this->downloadOne($leadId, $src, $baseUrl);
            if (!$result) {
                continue;
            }

            $downloaded[] = array_merge($result, [
                'src_original' => $src,
                'role' => $img['role'] ?? 'content',
                'alt' => $img['alt'] ?? '',
            ]);
        }

        return $downloaded;
    }

    /**
     * Download a single asset (typically the logo). Returns asset descriptor or null.
     *
     * @return array{src_original: string, public_url: string, local_path: string, role: string, alt: string, bytes: int, mime: ?string}|null
     */
    public function downloadLogo(int $leadId, ?string $logoUrl, string $baseUrl): ?array
    {
        if (!$logoUrl) {
            return null;
        }

        $result = $this->downloadOne($leadId, $logoUrl, $baseUrl, prefix: 'logo');
        if (!$result) {
            return null;
        }

        return array_merge($result, [
            'src_original' => $logoUrl,
            'role' => 'logo',
            'alt' => 'Logo',
        ]);
    }

    /**
     * @return array{public_url: string, local_path: string, bytes: int, mime: ?string}|null
     */
    private function downloadOne(int $leadId, string $url, string $baseUrl, string $prefix = ''): ?array
    {
        try {
            $resolved = $this->resolveUrl($url, $baseUrl);
            if (!$this->isHttpUrl($resolved)) {
                return null;
            }
            // Pre-flight URL-blocklist: kick out obvious icon/sprite/placeholder
            // assets BEFORE we make a network request. Saves bandwidth + avoids
            // ugly Windows-icon-style "gallery images" and Marmor-Boden background
            // tiles that bled into earlier deploys.
            if ($this->urlLooksLikeNonContentAsset($resolved)) {
                Log::debug("AssetDownloader: skipped non-content URL {$resolved}");
                return null;
            }
            if (!$this->isPublicHost($resolved)) {
                Log::debug("AssetDownloader: rejected non-public host for {$resolved}");
                return null;
            }

            $response = Http::withHeaders([
                'User-Agent' => 'Mozilla/5.0 (compatible; WebVultureBot/1.0; +https://webvulture.app)',
                'Accept' => 'image/*,*/*;q=0.8',
            ])
                ->withOptions(['allow_redirects' => false])
                ->timeout(self::TIMEOUT)
                ->get($resolved);

            if (!$response->successful()) {
                return null;
            }

            $contents = $response->body();
            $bytes = strlen($contents);
            if ($bytes < self::MIN_BYTES || $bytes > self::MAX_BYTES) {
                return null;
            }

            $mime = strtolower($response->header('Content-Type') ?? '');
            $mime = trim(explode(';', $mime)[0]);

            $ext = self::ALLOWED_MIMES[$mime] ?? $this->guessExtensionFromUrl($resolved);
            if (!$ext) {
                return null;
            }

            // Dimension-based filter: drop tiny icons, banner-strips, and
            // extreme aspect ratios (likely sprites/decorations rather than
            // real photos). Logos are exempted because we want them small.
            $dims = @getimagesizefromstring($contents);
            $width = is_array($dims) ? (int) ($dims[0] ?? 0) : 0;
            $height = is_array($dims) ? (int) ($dims[1] ?? 0) : 0;
            if ($prefix !== 'logo') {
                if ($width > 0 && $height > 0) {
                    // Min 400x300 for content/gallery: smaller assets are usually
                    // sponsor/Verbands-Logos (Jimdo's "dimension=201x10000" pattern
                    // produces ~200px wide rasterized association badges). Real
                    // Vereinsfotos are at least 600+ wide.
                    if ($width < 400 || $height < 300) {
                        Log::debug("AssetDownloader: dropped small {$width}x{$height} {$resolved}");
                        return null;
                    }
                    $aspect = $width / $height;
                    // Wider than 3:1 = banner/hero strip, doesn't crop to a square
                    // gallery tile without losing the subject. Taller than 1:3 = vertical
                    // banner, equally bad. We keep moderate landscape (3:2, 16:9) and
                    // moderate portrait (3:4) which are common photo aspects.
                    if ($aspect > 3 || $aspect < 0.33) {
                        Log::debug("AssetDownloader: dropped extreme-aspect {$width}x{$height} {$resolved}");
                        return null;
                    }
                }
            } else {
                // Logo: allow small dimensions but reject literal icons (<48px).
                if ($width > 0 && $height > 0 && ($width < 48 || $height < 48)) {
                    return null;
                }
            }

            $hash = substr(sha1($resolved.'|'.$bytes), 0, 16);
            $filename = ($prefix ? $prefix.'-' : '').$hash.'.'.$ext;

            $localPath = $this->store->writePublicAsset($leadId, $filename, $contents);
            $publicUrl = $this->store->publicAssetUrl($localPath);

            return [
                'public_url' => $publicUrl,
                'local_path' => $localPath,
                'bytes' => $bytes,
                'mime' => $mime ?: null,
                'width' => $width ?: null,
                'height' => $height ?: null,
            ];
        } catch (\Throwable $e) {
            Log::debug("AssetDownloader: failed for {$url}: {$e->getMessage()}");
            return null;
        }
    }

    private function isHttpUrl(string $url): bool
    {
        $scheme = parse_url($url, PHP_URL_SCHEME);
        return in_array($scheme, ['http', 'https'], true);
    }

    /**
     * URL-pattern blocklist for assets that shouldn't end up in the gallery —
     * icons, sprites, placeholders, tracking pixels, theme decorations.
     *
     * Catches the cases that produced "Drucker-/Dokument-Icon"-tiles, tiled
     * background patterns (Marmor-Boden), spacer pixels and similar.
     */
    private function urlLooksLikeNonContentAsset(string $url): bool
    {
        $lower = strtolower($url);
        $needles = [
            'icon', 'sprite', 'spacer', 'pixel', 'tracking',
            'placeholder', 'transparent', 'blank',
            'logo-thumbnail', 'thumb', 'avatar', 'emoji',
            'background-pattern', 'pattern.', 'texture',
            'arrow-', 'chevron', 'bullet',
            'wp-includes/images/', 'jimdo-static/static/imageicon',
            'favicon',
            // Banner/Hero/Theme-decoration assets — usually wide hero strips
            // that look terrible cropped to gallery tiles. Producers commonly
            // upload these as "slide_*", "banner_*", "header.jpg", etc.
            '/slide_', '/slide-', '/banner_', '/banner-', '/banner/',
            '/header_', '/header-', 'wallpaper', 'background.jpg',
            // Floor/wall pattern photos — appeared as "slide_boden.jpg"
            // (German for "ground/floor"). Not a Vereinsbild.
            'boden', 'wand.jpg', 'floor.', 'wall.',
        ];
        // Jimdo CDN dimension=NNNxMMM small-image pattern — typically a
        // ~200px logo upload that gets rendered as Verbands-/Bezirks-Badge.
        if (preg_match('/jimcdn\.com.*dimension=(\d+)x/', $url, $m)) {
            $w = (int) $m[1];
            if ($w > 0 && $w < 350) {
                return true;
            }
        }
        foreach ($needles as $n) {
            if (str_contains($lower, $n)) return true;
        }
        // Filename consists only of digits or single chars (often UI elements)
        $path = parse_url($url, PHP_URL_PATH) ?? '';
        $name = pathinfo($path, PATHINFO_FILENAME);
        if (strlen($name) <= 2) return true;

        return false;
    }

    /**
     * SSRF guard: refuse to fetch URLs whose host resolves to a private/loopback/link-local IP.
     *
     * Mitigates `<img src=http://169.254.169.254/...>` (AWS IMDS) attacks via scraped pages.
     * Checks BOTH A (IPv4) and AAAA (IPv6) records — gethostbynamel() alone misses IPv6,
     * which means an attacker could publish A=8.8.8.8 + AAAA=fe80::1 and bypass the guard.
     * The narrow window between this check and the actual HTTP request still permits
     * a determined DNS-rebinding attack with very-short-TTL records, but blocking the
     * common cases (literal private IPs, AAAA missing) eliminates all reflexive exploits.
     */
    private function isPublicHost(string $url): bool
    {
        $host = parse_url($url, PHP_URL_HOST);
        if (!$host) {
            return false;
        }
        // Strip IPv6 literal brackets: parse_url returns [::1] including brackets.
        $host = trim($host, '[]');

        // If host is a literal IP, validate it directly (covers IPv4 + IPv6 literals).
        if (filter_var($host, FILTER_VALIDATE_IP)) {
            return (bool) filter_var(
                $host,
                FILTER_VALIDATE_IP,
                FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE,
            );
        }

        $allIps = [];

        // IPv4 (A records)
        $a = @gethostbynamel($host);
        if (is_array($a)) {
            $allIps = array_merge($allIps, $a);
        }

        // IPv6 (AAAA records) — gethostbynamel doesn't return these.
        $aaaa = @dns_get_record($host, DNS_AAAA);
        if (is_array($aaaa)) {
            foreach ($aaaa as $rec) {
                if (!empty($rec['ipv6'])) {
                    $allIps[] = $rec['ipv6'];
                }
            }
        }

        if (empty($allIps)) {
            return false;
        }

        foreach ($allIps as $ip) {
            if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                return false;
            }
        }
        return true;
    }

    private function guessExtensionFromUrl(string $url): ?string
    {
        $path = parse_url($url, PHP_URL_PATH) ?? '';
        $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
        return in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'gif'], true)
            ? ($ext === 'jpeg' ? 'jpg' : $ext)
            : null;
    }

    private function resolveUrl(string $src, string $baseUrl): string
    {
        if (str_starts_with($src, 'http')) {
            return $src;
        }
        if (str_starts_with($src, '//')) {
            return 'https:'.$src;
        }
        $base = parse_url($baseUrl);
        $scheme = $base['scheme'] ?? 'https';
        $host = $base['host'] ?? '';
        if (!$host) {
            return $src;
        }
        if (str_starts_with($src, '/')) {
            return "{$scheme}://{$host}{$src}";
        }
        // dirname() returns '.' for empty input, '\' on Windows, '/' for root.
        // Normalize all of these to a clean leading-slash directory.
        $basePath = $base['path'] ?? '/';
        $dir = $basePath === '/' ? '' : rtrim(dirname($basePath), '\\.');
        if ($dir === '' || $dir === '.') {
            $dir = '';
        }
        return "{$scheme}://{$host}{$dir}/{$src}";
    }
}
