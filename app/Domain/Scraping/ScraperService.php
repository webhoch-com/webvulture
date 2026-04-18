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
    ) {}

    public function scrape(Lead $lead): WebsiteAnalysis
    {
        if (!$lead->website) {
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
                if ($navUrl === $finalUrl) continue;
                try {
                    [$navHtml] = $this->fetch($navUrl);
                    $filename = 'page-'.preg_replace('/[^a-z0-9]/', '-', strtolower($label)).'.html';
                    $this->store->writeRaw($lead->id, $filename, $navHtml);
                    $navPages[$label] = $navUrl;
                } catch (\Throwable $e) {
                    Log::debug("Nav page [{$label}] failed: {$e->getMessage()}");
                }
            }

            // ── Persist extracted JSON ────────────────────────────────────────
            $metadata = [
                'scraped_at' => now()->toIso8601String(),
                'source_url' => $lead->website,
                'final_url' => $finalUrl,
                'http_status' => $status,
                'nav_pages_crawled' => $navPages,
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
                    'contact' => $extracted['contact'],
                    'services' => $extracted['services'],
                    'images' => $extracted['images'],
                    'socials' => $extracted['socials'],
                    'brand_colors' => $extracted['brand_colors'] ?? [],
                    'text_content' => $extracted['text_content'],
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
        if (!$analysis || $analysis->status !== 'done') {
            return false;
        }
        if (!$this->store->rawExists($lead->id, 'homepage.html')) {
            return false;
        }
        // Fresh if crawled within 7 days
        return $analysis->crawled_at && $analysis->crawled_at->gt(now()->subDays(7));
    }

    protected function fetch(string $url): array
    {
        $response = Http::withHeaders([
            'User-Agent' => 'Mozilla/5.0 (compatible; WebVultureBot/1.0; +https://webvulture.app)',
            'Accept' => 'text/html,application/xhtml+xml,*/*;q=0.8',
            'Accept-Language' => 'en-US,en;q=0.5',
        ])
            ->withOptions(['allow_redirects' => ['max' => 5, 'track_redirects' => true]])
            ->timeout(15)
            ->get($url);

        $finalUrl = $response->transferStats?->getEffectiveUri()?->__toString() ?? $url;
        $html = $response->body();

        if (empty(trim($html))) {
            throw new \RuntimeException("Empty response from $url");
        }

        return [$html, $finalUrl, $response->status()];
    }
}
