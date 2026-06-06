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
        protected LogoColorExtractor $logoColor,
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

        // ── URL-Normalisierung: Wenn der Lead auf eine Subpage zeigt
        // (häufig /kontakt, /impressum o.ä., weil Google Places die Detail-URL
        // statt der Startseite zurückgibt), holen wir uns die Domain-Root als
        // tatsächliche Homepage. Sonst wird die Kontakt-Seite als Homepage
        // gescraped und Templates rendern leere About/Gallery-Sections.
        $homepageUrl = $this->normalizeToHomepage($lead->website);

        $job = ScrapeJob::create([
            'lead_id' => $lead->id,
            'url' => $homepageUrl,
            'status' => 'running',
        ]);

        try {
            [$html, $finalUrl, $status] = $this->fetch($homepageUrl);

            // ── Persist raw HTML to filesystem ────────────────────────────────
            $htmlPath = $this->store->writeRaw($lead->id, 'homepage.html', $html);

            // ── Extract structured data ────────────────────────────────────────
            $extracted = $this->extractor->extract($html, $finalUrl);

            // ── Crawl nav pages (same domain, up to 20) ───────────────────────
            // Vorher: 5 — viel zu wenig für eine ordentliche Inventur einer
            // Vereins- oder Firmenseite. HomepageExtractor::navLinks() liefert
            // jetzt bis zu 30 deduplizierte Same-Domain-Links (Header + Content
            // + Footer); wir crawlen davon die ersten 20 für sections/gallery
            // -Konsolidierung. Hard-Cap als Schutz gegen unbegrenztes Crawlen.
            $navPages = [];
            $navHtmls = [];
            $crawledUrls = [strtolower($finalUrl) => true];
            $navCap = 20;
            foreach (array_slice($extracted['nav_links'] ?? [], 0, $navCap) as $label => $navUrl) {
                $key = strtolower(rtrim($navUrl, '/'));
                if (isset($crawledUrls[$key]) || isset($crawledUrls[$key.'/'])) {
                    continue;
                }
                try {
                    [$navHtml] = $this->fetch($navUrl);
                    $filename = 'page-'.substr(preg_replace('/[^a-z0-9]+/', '-', strtolower($label)), 0, 40).'.html';
                    $this->store->writeRaw($lead->id, $filename, $navHtml);
                    $navPages[$label] = $navUrl;
                    $navHtmls[$navUrl] = $navHtml;
                    $crawledUrls[$key] = true;
                } catch (\Throwable $e) {
                    Log::debug("Nav page [{$label}] failed: {$e->getMessage()}");
                }
            }

            // ── Konsolidierung: Sections + Gallery-Bilder aus Nav-Pages
            // mergen. Viele Vereinsseiten haben Über-Uns, Chronik und
            // Bildergalerie als Subpages — ohne Konsolidierung würden wir
            // die nur ignorieren.
            $extracted = $this->consolidateFromNavPages($extracted, $navHtmls);

            // ── Download assets (logo + content/hero/gallery images) ─────────
            $logoAsset = $this->assets->downloadLogo($lead->id, $extracted['logo_url'] ?? null, $finalUrl);
            // Dominant non-neutral pixel colour from the logo. Templates use it
            // as the per-demo accent so each Bauunternehmen demo reads as branded
            // to its company. Falls back gracefully when no logo was downloaded.
            $logoColor = null;
            if ($logoAsset && ! empty($logoAsset['local_path'])) {
                $absPath = \Illuminate\Support\Facades\Storage::disk('public')->path($logoAsset['local_path']);
                $logoColor = $this->logoColor->extract($absPath);
            }

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
            // PR-A8: board-member portraits — relaxed dimension filter via role='team'.
            // Stored alongside other assets in downloaded_assets (role='team');
            // RebuildPackageBuilder surfaces them as the images.team bucket.
            foreach ($extracted['team_photos'] ?? [] as $img) {
                $imagesToDownload[] = ['src' => $img['src'], 'alt' => $img['alt'] ?? '', 'role' => 'team'];
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
                    'logo_color' => $logoColor,
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
     * Normalize a possibly-deep URL to the site's homepage. Google Places
     * often returns a Kontakt/Impressum subpage as the lead's website. If we
     * scrape that as "the homepage" we miss the actual About-text + Galerie
     * + Vorstand-Listing, and templates render with empty sections.
     *
     * Heuristic: if the path contains a known "subpage" keyword (kontakt,
     * impressum, datenschutz, about/über, agb, etc.) we drop the path and
     * return scheme + host + '/'. Otherwise we keep the URL as-is — many
     * small sites legitimately live under a path (e.g. firma.at/cafe).
     */
    public function normalizeToHomepage(string $url): string
    {
        $parsed = parse_url($url);
        if (! $parsed || empty($parsed['host']) || empty($parsed['scheme'])) {
            return $url;
        }

        $path = strtolower($parsed['path'] ?? '/');
        if ($path === '' || $path === '/') {
            return $url;
        }

        // Match against last path segment for cleaner intent detection
        // (e.g. /de/info/kontakt should still trigger).
        $segments = array_filter(explode('/', $path));
        $tail = end($segments) ?: '';

        $subpagePatterns = [
            'kontakt', 'contact',
            'impressum', 'imprint',
            'datenschutz', 'privacy',
            'agb', 'terms',
            'about', 'ueber-uns', 'ueber_uns', 'about-us',
            'team', 'vorstand',
            'haftung', 'disclaimer',
        ];

        $isSubpage = false;
        foreach ($subpagePatterns as $needle) {
            if (str_contains($tail, $needle) || str_contains($path, '/'.$needle)) {
                $isSubpage = true;
                break;
            }
        }

        if (! $isSubpage) {
            return $url;
        }

        return $parsed['scheme'].'://'.$parsed['host'].'/';
    }

    /**
     * Merge sections + gallery-images from the nav-page HTMLs into the
     * homepage's extracted data. Verein-sites typically split content
     * across /chronik (about), /bildergalerie (gallery), /termine (events)
     * — without consolidation the templates only ever see the homepage
     * which is often a thin landing screen.
     *
     * Dedupe sections by lower-cased title, dedupe gallery by src.
     */
    protected function consolidateFromNavPages(array $extracted, array $navHtmls): array
    {
        if (empty($navHtmls)) {
            return $extracted;
        }

        $sections = $extracted['sections'] ?? [];
        $gallery = $extracted['gallery_images'] ?? [];
        $hero = $extracted['hero_images'] ?? [];
        $images = $extracted['images'] ?? [];
        $textContent = (string) ($extracted['text_content'] ?? '');

        $sectionSeen = [];
        foreach ($sections as $s) {
            $sectionSeen[mb_strtolower($s['title'] ?? '')] = true;
        }
        $gallerySeen = [];
        foreach ($gallery as $g) {
            $gallerySeen[$g['src'] ?? ''] = true;
        }

        foreach ($navHtmls as $navUrl => $navHtml) {
            try {
                $sub = $this->extractor->extract($navHtml, $navUrl);
            } catch (\Throwable $e) {
                Log::debug("Consolidation: extractor failed for {$navUrl}: {$e->getMessage()}");
                continue;
            }

            // Konkateniere text_content ZUERST — unabhängig vom Section-Cap.
            // Vorher: nach dem `break 2` beim 12. Section blieb der text_content
            // genau der Page, die meist die Vorstand-Liste hatte, im Drop. Jetzt
            // wird der Text immer mitgenommen, solange das 8000-Char-Cap noch
            // nicht erreicht ist.
            if (! empty($sub['text_content']) && mb_strlen($textContent) < 8000) {
                $textContent .= "\n".$sub['text_content'];
            }

            $sectionCapHit = false;
            foreach ($sub['sections'] ?? [] as $s) {
                $key = mb_strtolower($s['title'] ?? '');
                if ($key === '' || isset($sectionSeen[$key])) {
                    continue;
                }
                $sectionSeen[$key] = true;
                $sections[] = $s;
                if (count($sections) >= 12) {
                    $sectionCapHit = true;
                    break;
                }
            }

            foreach ($sub['gallery_images'] ?? [] as $g) {
                $src = $g['src'] ?? '';
                if ($src === '' || isset($gallerySeen[$src])) {
                    continue;
                }
                $gallerySeen[$src] = true;
                $gallery[] = $g;
            }

            // Hero + generic images: merge but bounded; gallery is the
            // important deliverable here.
            foreach ($sub['hero_images'] ?? [] as $h) {
                if (count($hero) >= 6) {
                    break;
                }
                $hero[] = $h;
            }
            foreach ($sub['images'] ?? [] as $img) {
                if (count($images) >= 30) {
                    break;
                }
                $images[] = $img;
            }

            // Wenn Sections + Gallery + Text bereits voll sind, lohnen weitere
            // Nav-Pages nicht — beenden.
            if ($sectionCapHit && count($gallery) >= 30 && mb_strlen($textContent) >= 8000) {
                break;
            }
        }

        $extracted['sections'] = array_slice($sections, 0, 12);
        $extracted['gallery_images'] = array_slice($gallery, 0, 30);
        $extracted['hero_images'] = array_slice($hero, 0, 6);
        $extracted['images'] = $images;
        $extracted['text_content'] = mb_substr($textContent, 0, 8000);

        return $extracted;
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
        // `u` flag is required: without it, `\b` after a trailing umlaut
        // ("menü\b") is evaluated byte-wise and never matches, so "Menü"
        // (a junk nav label) slips through. With PCRE_UTF8 the boundary is
        // computed per-codepoint and the umlaut alternatives work.
        $junkRe = '/^(zum inhalt|skip to|cookie|toggle|search|suche|login|anmelden|menu|menü|navigation)\b/iu';
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
