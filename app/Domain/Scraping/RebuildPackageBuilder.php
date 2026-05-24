<?php

namespace App\Domain\Scraping;

use App\Domain\Storage\LeadStorageService;
use App\Models\Lead;
use Illuminate\Support\Facades\Storage;

/**
 * Assembles the structured rebuild package that Claude receives for prototype generation.
 *
 * Schema stored at storage/app/leads/{id}/generation/rebuild-package.json:
 * {
 *   "version": 1,
 *   "generated_at": "ISO8601",
 *   "business": { name, category, city, address, phone, website, rating, review_count },
 *   "extracted": { title, meta_description, contact, services, socials, text_content, images: [{src, alt}] },
 *   "screenshots": [ { name, path, slot } ],
 *   "logo_url": null|string,
 *   "brand_colors": [],
 *   "generation_params": { tone_hint, niche, weaknesses, headline_suggestion }
 * }
 */
class RebuildPackageBuilder
{
    public function __construct(
        protected LeadStorageService $store,
        protected AssetMirror $mirror,
    ) {}

    public function build(Lead $lead): array
    {
        $lead->loadMissing(['websiteAnalysis', 'latestEnrichment']);
        $analysis = $lead->websiteAnalysis;
        $enrichment = $lead->latestEnrichment;

        // Mirror remote image URLs into our public storage so the demo doesn't
        // hot-link to the prospect's domain (per marketing-consistency audit 2A).
        // URLs that fail to mirror are dropped from the package.
        $urlMap = $analysis ? $this->mirror->mirror($analysis) : [];
        $mirroredImages = $analysis ? $this->mirror->rewriteImages($analysis->images ?? [], $urlMap) : [];
        $mirroredLogo = $this->mirror->rewriteOne($analysis?->logo_url, $urlMap);
        $mirroredFavicon = $this->mirror->rewriteOne($analysis?->favicon_url, $urlMap);

        $screenshots = $analysis?->screenshot_paths
            ? $this->formatScreenshots((array) $analysis->screenshot_paths)
            : [];

        $package = [
            'version' => 1,
            'generated_at' => now()->toIso8601String(),
            'business' => [
                'name' => $lead->name,
                'category' => $lead->category,
                'city' => $lead->city,
                'address' => $lead->address,
                'phone' => $lead->phone,
                'website' => $lead->website,
                'rating' => $lead->rating,
                'review_count' => $lead->review_count,
                'has_website' => $lead->has_website,
            ],
            'extracted' => [
                'title' => $analysis?->title,
                'meta_description' => $analysis?->meta_description,
                'contact' => $analysis?->contact ?? [],
                'services' => $analysis?->services ?? [],
                'socials' => $analysis?->socials ?? [],
                'nav_links' => $analysis?->nav_links ?? [],
                'text_content' => $analysis?->text_content
                    ? mb_substr($analysis->text_content, 0, 6000)
                    : null,
                'sections' => $this->cleanSections($analysis?->sections ?? []),
                'images' => $this->filterImages($mirroredImages),
            ],
            'logo_url' => $mirroredLogo,       // mirrored URL on our domain (or null)
            'favicon_url' => $mirroredFavicon, // mirrored URL on our domain (or null)
            'brand_colors' => $analysis?->brand_colors ?? [],
            'brand' => [
                'logo_url' => $analysis?->logo_url,
                'logo_public_url' => $analysis?->logo_path
                    ? Storage::disk('public')->url($analysis->logo_path)
                    : $mirroredLogo,
                'primary_color' => $analysis?->primary_color,
                'secondary_color' => $analysis?->secondary_color,
                'accent_color' => $analysis?->accent_color,
                'heading_font_family' => $analysis?->heading_font_family,
                'body_font_family' => $analysis?->body_font_family,
                'font_imports' => $analysis?->font_imports ?? [],
            ],
            'images' => [
                'hero' => $analysis?->hero_images ?? [],
                'gallery' => $analysis?->gallery_images ?? [],
                'all_local' => $analysis?->downloaded_assets ?? [],
                'screenshots' => $screenshots,
            ],
            'screenshots' => $screenshots,
            'generation_params' => [
                'niche' => $enrichment?->niche,
                'tone_hint' => $enrichment?->tone,
                'weaknesses' => $enrichment?->weaknesses ?? [],
                'headline_suggestion' => $enrichment?->headline,
                'value_prop' => $enrichment?->value_prop,
            ],
        ];

        // Persist to FS for debugging + regen reuse
        $path = $this->store->writeGeneration($lead->id, 'rebuild-package.json', $package);

        if ($analysis) {
            $analysis->update(['rebuild_package_path' => $path]);
        }

        return $package;
    }

    /**
     * Reduce raw scraped image list to assets usable in a rebuilt site:
     * - Strict scheme allowlist (https? or absolute path) — rejects data:,
     *   javascript:, vbscript:, file://, gopher:// and any case-variant.
     * - Reject any URL containing characters that could break out of an
     *   HTML attribute or CSS url() context downstream.
     * - Drop SVG/GIF (rare for hero/gallery, mostly icons)
     * - Drop tracking pixels & icons by URL hint
     * - Cap each URL to 2048 chars and the result list to 12 entries.
     *
     * Each entry: { src, alt }.
     */
    protected function filterImages(array $images): array
    {
        $skipPatterns = [
            '/\.svg(\?|$)/i',
            '/\.gif(\?|$)/i',
            '/sprite/i',
            '/pixel/i',
            '/spacer/i',
            '/transparent/i',
            '/1x1/i',
            '/google-analytics/i',
            '/facebook\.com\/tr/i',
            // Banner-Slides + Theme-Decoration. The mirrored URL hides these
            // patterns (it's our own /storage/.../HASH.jpg path), so we must
            // also check `original_src` further down.
            '/icon/i', '/spacer/i', '/placeholder/i', '/transparent/i',
            '/banner_/i', '/banner-/i', '/banner\//i',
            '/slide_/i', '/slide-/i', '/header_/i', '/header-/i',
            '/wallpaper/i', '/background\.jpg/i',
            // Common floor/wall pattern photos that bled into Verein galleries
            '/boden/i', '/floor\./i', '/wall\./i',
            // wp-includes admin assets, jimdo theme icons
            '/wp-includes\/images/i', '/jimdo-static/i', '/favicon/i',
        ];

        $filtered = [];
        foreach ($images as $img) {
            $src = is_array($img) ? ($img['src'] ?? null) : null;
            $originalSrc = is_array($img) ? ($img['original_src'] ?? '') : '';
            if (! is_string($src) || strlen($src) === 0 || strlen($src) > 2048) {
                continue;
            }
            // Strict scheme allowlist (case-insensitive). Rejects data:, DATA:,
            // JaVaScRiPt:, vbscript:, file://, gopher://, mailto:, etc.
            if (! preg_match('#^(https?://|/)#i', $src)) {
                continue;
            }
            // Reject any URL containing characters that would break the HTML
            // attribute or CSS url() context downstream.
            if (preg_match('/["\'<>\\\\\s`]/', $src)) {
                continue;
            }
            // Apply skip patterns to BOTH the mirrored URL and the original URL,
            // because the mirror's HASH.jpg path hides telltale strings like
            // "/banner/slide_boden.jpg" that should disqualify an asset.
            foreach ($skipPatterns as $pattern) {
                if (preg_match($pattern, $src) || ($originalSrc && preg_match($pattern, $originalSrc))) {
                    continue 2;
                }
            }
            // Jimdo CDN small-image pattern — Verbands-/Bezirks-Badges are
            // typically uploaded as ~200px logos via Jimdo's
            // "dimension=NNNxMMM" sizing convention.
            if ($originalSrc && preg_match('/jimcdn\.com.*dimension=(\d+)x/', $originalSrc, $m)) {
                if ((int) $m[1] < 350) continue;
            }
            $filtered[] = [
                'src' => $src,
                'original_src' => is_array($img) ? (string) ($img['original_src'] ?? '') : '',
                'alt' => is_array($img) ? mb_substr((string) ($img['alt'] ?? ''), 0, 200) : '',
            ];
            if (count($filtered) >= 12) {
                break;
            }
        }

        return $filtered;
    }

    /**
     * Sanitize the scraped section list before it leaves PHP.
     *
     * Each entry is expected as ['title' => string, 'level' => int, 'body' => string].
     * Anything malformed or oversized is dropped — these end up rendered into HTML
     * inside the demo, so any HTML/control chars must be stripped server-side
     * even though the templates also escape on render. Defence-in-depth.
     */
    protected function cleanSections(array $raw): array
    {
        // Junk-title patterns (page chrome). Section is dropped when the title
        // matches: these end up looking ridiculous as full "Aus Ihrer Webseite"
        // editorial blocks ("Zum Inhalt springen" as a giant H2 etc.).
        $junkTitleRe = '/^(zum inhalt|skip to|cookie|menü|menu|navigation|impressum|datenschutz|agb|kontakt|footer|kontaktformular|search|suche)\b/i';

        $clean = [];
        $seenTitles = [];
        foreach ($raw as $entry) {
            if (! is_array($entry)) {
                continue;
            }
            $title = is_string($entry['title'] ?? null) ? trim($entry['title']) : '';
            $body = is_string($entry['body'] ?? null) ? trim($entry['body']) : '';
            // Clamp to the valid HTML heading range. The extractor only emits
            // 1-3 today, but historic JSON or a future rewrite must not be
            // able to push out-of-range values that downstream renderers
            // might trust.
            $level = is_int($entry['level'] ?? null) ? max(1, min(6, $entry['level'])) : 2;

            if ($title === '' || $body === '') {
                continue;
            }
            // Strip any HTML that survived (the extractor uses textContent,
            // so this is paranoia — but cheap).
            $title = strip_tags($title);
            $body = strip_tags($body);

            // Drop common page-chrome titles. Without this the redesign block
            // happily renders "Zum Inhalt springen" as a giant editorial
            // headline on Vereinen with skip-link H2s.
            if (preg_match($junkTitleRe, $title)) {
                continue;
            }
            // Body that's just a few words is page chrome too (read more, more info).
            if (mb_strlen($body) < 30) {
                continue;
            }
            // De-dupe by lowercase title — some sites repeat a section verbatim
            // in header + main + footer. When titles collide, keep the entry
            // with the LONGER body: nav-link "Über uns" (short) vs main-body
            // "Über uns" (the real content) — we want the body version.
            $titleKey = mb_strtolower($title);
            $title = mb_substr($title, 0, 120);
            $body = mb_substr($body, 0, 1600);

            if (isset($seenTitles[$titleKey])) {
                $existingIdx = $seenTitles[$titleKey];
                if (mb_strlen($body) > mb_strlen($clean[$existingIdx]['body'])) {
                    $clean[$existingIdx] = ['title' => $title, 'level' => $level, 'body' => $body];
                }
                continue;
            }
            $clean[] = ['title' => $title, 'level' => $level, 'body' => $body];
            $seenTitles[$titleKey] = array_key_last($clean);
            if (count($clean) >= 8) {
                break;
            }
        }

        return $clean;
    }

    protected function formatScreenshots(array $paths): array
    {
        $slots = [
            'homepage-desktop' => 'desktop_full',
            'homepage-mobile' => 'mobile_full',
            'homepage-atf' => 'desktop_atf',
        ];

        $result = [];
        foreach ($paths as $name => $path) {
            $result[] = [
                'name' => $name,
                'path' => $path,
                'slot' => $slots[$name] ?? $name,
            ];
        }

        return $result;
    }
}
