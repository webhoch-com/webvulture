<?php

namespace App\Domain\Scraping;

use App\Domain\Storage\LeadStorageService;
use App\Models\Lead;
use App\Models\ScrapeJob;
use App\Models\WebsiteAnalysis;
use App\Support\Enums\LeadStatus;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ScraperService
{
    public function __construct(
        protected HomepageExtractor $extractor,
        protected LeadStorageService $store,
        protected AssetDownloader $assets,
    ) {}

    public function scrape(Lead $lead): WebsiteAnalysis
    {
        if (! $lead->website) {
            throw new \RuntimeException("Lead #{$lead->id} has no website.");
        }

        // Reuse existing scrape if fresh (scraped within 7 days + raw exists)
        if ($this->canReuse($lead)) {
            Log::info("Reusing cached scrape for lead#{$lead->id}");

            return $lead->websiteAnalysis;
        }

        $job = ScrapeJob::create([
            'lead_id' => $lead->id,
            'url' => $lead->website,
            'status' => 'running',
        ]);

        try {
            [$html, $finalUrl, $status] = $this->fetch($lead->website);

            // ── Persist raw HTML to filesystem ────────────────────────────────
            $htmlPath = $this->store->writeRaw($lead->id, 'homepage.html', $html);

            // ── Extract structured data ────────────────────────────────────────
            $extracted = $this->extractor->extract($html, $finalUrl);

            // ── Crawl nav pages (same domain, up to 5) ────────────────────────
            $navPages = [];
            foreach (array_slice($extracted['nav_links'] ?? [], 0, 5) as $label => $navUrl) {
                if ($navUrl === $finalUrl) {
                    continue;
                }
                try {
                    [$navHtml] = $this->fetch($navUrl);
                    $filename = 'page-'.preg_replace('/[^a-z0-9]/', '-', strtolower($label)).'.html';
                    $this->store->writeRaw($lead->id, $filename, $navHtml);
                    $navPages[$label] = $navUrl;
                } catch (\Throwable $e) {
                    Log::debug("Nav page [{$label}] failed: {$e->getMessage()}");
                }
            }

            // ── Download assets (logo + content/hero/gallery images) ─────────
            $logoAsset = $this->assets->downloadLogo($lead->id, $extracted['logo_url'] ?? null, $finalUrl);

            $imagesToDownload = [];
            foreach ($extracted['hero_images'] ?? [] as $img) {
                $imagesToDownload[] = ['src' => $img['src'], 'alt' => $img['alt'] ?? '', 'role' => 'hero'];
            }
            foreach ($extracted['gallery_images'] ?? [] as $img) {
                $imagesToDownload[] = ['src' => $img['src'], 'alt' => $img['alt'] ?? '', 'role' => 'gallery'];
            }
            foreach ($extracted['images'] ?? [] as $img) {
                $imagesToDownload[] = ['src' => $img['src'], 'alt' => $img['alt'] ?? '', 'role' => 'content'];
            }
            $downloadedAssets = $this->assets->downloadAll($lead->id, $imagesToDownload, $finalUrl);
            $heroDownloaded = array_values(array_filter($downloadedAssets, fn ($a) => $a['role'] === 'hero'));
            $galleryDownloaded = array_values(array_filter($downloadedAssets, fn ($a) => $a['role'] === 'gallery'));

            // ── Persist extracted JSON ────────────────────────────────────────
            $metadata = [
                'scraped_at' => now()->toIso8601String(),
                'source_url' => $lead->website,
                'final_url' => $finalUrl,
                'http_status' => $status,
                'nav_pages_crawled' => $navPages,
                'logo_asset' => $logoAsset,
                'downloaded_assets_count' => count($downloadedAssets),
            ];
            $extractedPath = $this->store->writeExtracted($lead->id, array_merge($metadata, $extracted));

            // ── Upsert DB record ───────────────────────────────────────────────
            $analysis = WebsiteAnalysis::updateOrCreate(
                ['lead_id' => $lead->id],
                [
                    'crawled_at' => now(),
                    'final_url' => $finalUrl,
                    'http_status' => $status,
                    'title' => $extracted['title'],
                    'meta_description' => $extracted['meta_description'],
                    'logo_url' => $extracted['logo_url'],
                    'logo_path' => $logoAsset['local_path'] ?? null,
                    'logo_mime' => $logoAsset['mime'] ?? null,
                    'favicon_url' => $extracted['favicon_url'] ?? null,
                    'contact' => $extracted['contact'],
                    'services' => $extracted['services'],
                    'images' => $extracted['images'],
                    'hero_images' => $heroDownloaded,
                    'gallery_images' => $galleryDownloaded,
                    'downloaded_assets' => $downloadedAssets,
                    'socials' => $extracted['socials'],
                    'nav_links' => $this->normalizeNavLinks($extracted['nav_links'] ?? []),
                    'brand_colors' => $extracted['brand_colors'] ?? [],
                    'primary_color' => $extracted['primary_color'] ?? null,
                    'secondary_color' => $extracted['secondary_color'] ?? null,
                    'accent_color' => $extracted['accent_color'] ?? null,
                    'heading_font_family' => $extracted['heading_font_family'] ?? null,
                    'body_font_family' => $extracted['body_font_family'] ?? null,
                    'font_imports' => $extracted['font_imports'] ?? [],
                    'text_content' => $extracted['text_content'],
                    'sections' => $extracted['sections'] ?? [],
                    'raw_html_path' => $htmlPath,
                    'extracted_json_path' => $extractedPath,
                    'storage_root' => $this->store->root($lead->id),
                    'status' => 'done',
                    'error' => null,
                ],
            );

            $job->update(['status' => 'done', 'finished_at' => now()]);
            $lead->update(['status' => LeadStatus::Scraped]);

            return $analysis;
        } catch (\Throwable $e) {
            Log::warning("Scrape failed lead#{$lead->id}: {$e->getMessage()}");

            WebsiteAnalysis::updateOrCreate(
                ['lead_id' => $lead->id],
                ['status' => 'failed', 'error' => $e->getMessage(), 'crawled_at' => now()],
            );
            $job->update(['status' => 'failed', 'error' => $e->getMessage(), 'finished_at' => now()]);

            throw $e;
        }
    }

    protected function canReuse(Lead $lead): bool
    {
        $analysis = $lead->websiteAnalysis;
        if (! $analysis || $analysis->status !== 'done') {
            return false;
        }
        if (! $this->store->rawExists($lead->id, 'homepage.html')) {
            return false;
        }

        // Fresh if crawled within 7 days
        return $analysis->crawled_at && $analysis->crawled_at->gt(now()->subDays(7));
    }

    protected function fetch(string $url): array
    {
        $this->assertSafeUrl($url);

        $response = Http::withHeaders([
            'User-Agent' => 'Mozilla/5.0 (compatible; WebVultureBot/1.0; +https://webvulture.app)',
            'Accept' => 'text/html,application/xhtml+xml,*/*;q=0.8',
            'Accept-Language' => 'en-US,en;q=0.5',
        ])
            ->withOptions(['allow_redirects' => ['max' => 5, 'track_redirects' => true]])
            ->timeout(15)
            ->get($url);

        $finalUrl = $response->transferStats?->getEffectiveUri()?->__toString() ?? $url;

        // After redirects: re-validate the final URL — defenses against open-redirect chaining.
        if ($finalUrl !== $url) {
            $this->assertSafeUrl($finalUrl);
        }

        $html = $response->body();

        if (empty(trim($html))) {
            throw new \RuntimeException("Empty response from $url");
        }

        return [$html, $finalUrl, $response->status()];
    }

    /**
     * SSRF guard: block internal/loopback/private addresses to prevent attackers
     * from feeding internal URLs via manipulated Google Places listings.
     */
    private function assertSafeUrl(string $url): void
    {
        $parsed = parse_url($url);
        $scheme = strtolower($parsed['scheme'] ?? '');
        if (! in_array($scheme, ['http', 'https'], true)) {
            throw new \RuntimeException("Blocked non-HTTP scheme in URL: {$scheme}");
        }
        $host = strtolower($parsed['host'] ?? '');
        if ($host === '' || $host === 'localhost' || $host === '::1') {
            throw new \RuntimeException("Blocked localhost in URL");
        }
        // Block RFC1918 + link-local + loopback IPv4 + IPv6 unique-local
        if (preg_match('/^(127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|0\.0\.0\.0)/', $host)) {
            throw new \RuntimeException("Blocked private/loopback address: {$host}");
        }
        if (preg_match('/^(fc[0-9a-f]{2}:|fd[0-9a-f]{2}:|fe80:)/', $host)) {
            throw new \RuntimeException("Blocked IPv6 private address: {$host}");
        }
        // Resolve and re-check (defense against DNS rebinding to private IPs)
        $records = @dns_get_record($host, DNS_A);
        if (is_array($records)) {
            foreach ($records as $r) {
                $ip = $r['ip'] ?? '';
                if ($ip && preg_match('/^(127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|0\.0\.0\.0)/', $ip)) {
                    throw new \RuntimeException("Blocked DNS-resolved private address: {$ip} (host: {$host})");
                }
            }
        }
    }

    /**
     * Reshape the extractor's label-keyed nav-links into the [{label, href}]
     * array shape the generator/templates consume, while filtering pure
     * page-chrome labels and capping count + length.
     *
     * The extractor returns ['Über uns' => 'https://...', 'Kontakt' => '...'].
     * Templates need a stable ordered list, with junk labels removed.
     */
    protected function normalizeNavLinks(array $raw): array
    {
        $junkRe = '/^(zum inhalt|skip to|cookie|toggle|search|suche|login|anmelden|menu|menü|navigation)\b/i';
        $out = [];
        foreach ($raw as $label => $href) {
            if (! is_string($label) || ! is_string($href)) {
                continue;
            }
            $label = trim($label);
            $href = trim($href);
            if ($label === '' || $href === '' || mb_strlen($label) > 40) {
                continue;
            }
            if (! preg_match('#^https?://#i', $href)) {
                continue;
            }
            if (preg_match($junkRe, $label)) {
                continue;
            }
            $out[] = ['label' => $label, 'href' => $href];
            if (count($out) >= 8) {
                break;
            }
        }

        return $out;
    }
}
