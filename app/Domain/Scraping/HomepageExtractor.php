<?php

namespace App\Domain\Scraping;

use Illuminate\Support\Facades\Log;
use Symfony\Component\DomCrawler\Crawler;

class HomepageExtractor
{
    public function extract(string $html, string $baseUrl): array
    {
        $crawler = new Crawler($html, $baseUrl);

        return [
            'title' => $this->title($crawler),
            'meta_description' => $this->metaDescription($crawler),
            'logo_url' => $this->logo($crawler, $baseUrl),
            'favicon_url' => $this->favicon($crawler, $baseUrl),
            'contact' => $this->contact($crawler),
            'services' => $this->services($crawler),
            'images' => $this->images($crawler, $baseUrl),
            'socials' => $this->socials($crawler),
            'nav_links' => $this->navLinks($crawler, $baseUrl),
            'brand_colors' => $this->brandColors($html),
            'text_content' => $this->textContent($crawler),
            // Real section structure pulled from H2/H3 headings + the
            // paragraphs that follow. Used by templates to render a
            // *redesign* of the prospect's existing site rather than a
            // generic template — matching their actual content scaffolding.
            'sections' => $this->sections($crawler),
        ];
    }

    /**
     * Walk the document for headline-then-content patterns.
     *
     * For every H1/H2/H3 we capture the heading text plus the next 1–4
     * paragraphs (or list items) until the next heading appears. This gives
     * templates a faithful skeleton of the prospect's own page so the demo
     * can re-render their real sections in premium typography instead of
     * fabricating sections.
     *
     * Junk filtering: navigation labels, footer chrome, cookie copy and
     * very short headings ("Menü", "© 2024") are dropped. Bodies under 40
     * characters are also skipped — those are usually link labels.
     */
    protected function sections(Crawler $c): array
    {
        $sections = [];

        try {
            // Strip page chrome before walking — header/footer/nav usually
            // contain repeated H2s ("Kontakt", "Menü") that would clutter
            // the section list.
            $clone = new Crawler($c->html(), $c->getUri() ?? null);
            $clone->filter('script, style, nav, header, footer, aside, form, .menu, .nav, .navigation, .cookie, [class*="cookie"], [id*="cookie"]')
                ->each(function (Crawler $node) {
                    foreach ($node as $n) {
                        $n->parentNode?->removeChild($n);
                    }
                });

            $clone->filter('h1, h2, h3')->each(function (Crawler $heading) use (&$sections) {
                $title = trim(preg_replace('/\s+/', ' ', $heading->text('')));
                if ($title === '' || mb_strlen($title) < 3 || mb_strlen($title) > 120) {
                    return;
                }
                if ($this->isJunkHeading($title)) {
                    return;
                }

                // Collect the next 1–4 sibling blocks until another heading.
                $paragraphs = [];
                $node = $heading->getNode(0)?->nextSibling;
                $hops = 0;
                while ($node && $hops < 12 && count($paragraphs) < 4) {
                    $hops++;
                    if ($node->nodeType !== XML_ELEMENT_NODE) {
                        $node = $node->nextSibling;
                        continue;
                    }
                    $tag = strtolower($node->nodeName);
                    if (in_array($tag, ['h1', 'h2', 'h3', 'h4'], true)) {
                        break;
                    }
                    if (in_array($tag, ['p', 'li', 'div', 'section', 'article'], true)) {
                        $text = trim(preg_replace('/\s+/', ' ', $node->textContent ?? ''));
                        if ($text !== '' && mb_strlen($text) >= 40 && mb_strlen($text) <= 800) {
                            $paragraphs[] = $text;
                        }
                    }
                    $node = $node->nextSibling;
                }

                if (count($paragraphs) === 0) {
                    return;
                }

                $sections[] = [
                    'title' => $title,
                    'level' => (int) substr(strtolower($heading->nodeName()), 1),
                    'body' => mb_substr(implode("\n\n", $paragraphs), 0, 1600),
                ];
            });
        } catch (\Throwable $e) {
            Log::debug('HomepageExtractor: section extraction failed', ['error' => $e->getMessage()]);
        }

        // Dedupe by lower-cased title; keep the first (most prominent) hit.
        $seen = [];
        $unique = [];
        foreach ($sections as $s) {
            $key = mb_strtolower($s['title']);
            if (isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;
            $unique[] = $s;
            if (count($unique) >= 8) {
                break;
            }
        }

        return $unique;
    }

    protected function isJunkHeading(string $title): bool
    {
        $junk = [
            '/^(men[üu]|navigation|toggle|search|suche)$/i',
            '/^(impressum|datenschutz|agb|cookie|haftung)$/i',
            '/^(folgen sie uns|social|teilen|share)$/i',
            '/^(kontakt|contact)$/i',
            '/^(home|startseite|start)$/i',
            '/^(login|anmelden|logout|abmelden)$/i',
            '/^[\s\d\-.\/©]+$/',
        ];
        foreach ($junk as $re) {
            if (preg_match($re, $title)) {
                return true;
            }
        }

        return false;
    }

    protected function favicon(Crawler $c, string $baseUrl): ?string
    {
        // Priority order: high-res apple-touch-icon → icon (any size) → fallback /favicon.ico.
        // Browsers will render apple-touch-icon as well, so picking 180x180 PNG-ish is better
        // than .ico for our HTML <link rel="icon"> injection.
        $selectors = [
            'link[rel="apple-touch-icon"]',
            'link[rel="apple-touch-icon-precomposed"]',
            'link[rel="icon"][type="image/png"]',
            'link[rel="icon"]',
            'link[rel="shortcut icon"]',
        ];

        foreach ($selectors as $sel) {
            try {
                $href = $c->filter($sel)->first()->attr('href');
                if ($href) {
                    return $this->resolveUrl(trim($href), $baseUrl);
                }
            } catch (\Throwable $e) {
                continue;
            }
        }

        // Fallback — most sites have /favicon.ico even without a <link>
        $base = parse_url($baseUrl);
        if (! empty($base['scheme']) && ! empty($base['host'])) {
            return "{$base['scheme']}://{$base['host']}/favicon.ico";
        }

        return null;
    }

    protected function navLinks(Crawler $c, string $baseUrl): array
    {
        $base = parse_url($baseUrl);
        $host = $base['host'] ?? '';
        $links = [];

        $selectors = ['nav a[href]', 'header a[href]', '.menu a[href]', '#menu a[href]', '.navigation a[href]'];

        foreach ($selectors as $sel) {
            try {
                $c->filter($sel)->each(function (Crawler $node) use (&$links, $host, $baseUrl) {
                    $href = trim($node->attr('href') ?? '');
                    $label = trim($node->text(''));
                    if (! $href || ! $label || str_starts_with($href, '#') || strlen($label) > 40) {
                        return;
                    }
                    $resolved = $this->resolveUrl($href, $baseUrl);
                    $parsed = parse_url($resolved);
                    // Same-domain only
                    if (($parsed['host'] ?? '') === $host) {
                        $links[$label] = $resolved;
                    }
                });
            } catch (\Throwable $e) { \Log::debug("HomepageExtractor: extraction step failed", ["error" => $e->getMessage()]); 
            }
        }

        return array_slice($links, 0, 10);
    }

    protected function brandColors(string $html): array
    {
        $colors = [];
        // Extract hex colors from inline styles / CSS vars
        preg_match_all('/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/', $html, $matches);
        $found = array_unique($matches[0] ?? []);

        // Filter out obvious grays/blacks/whites
        foreach ($found as $hex) {
            [$r, $g, $b] = sscanf(strlen($hex) === 4
                ? '#'.str_repeat($hex[1], 2).str_repeat($hex[2], 2).str_repeat($hex[3], 2)
                : $hex, '#%02x%02x%02x');
            $max = max($r, $g, $b);
            $min = min($r, $g, $b);
            $saturation = $max > 0 ? ($max - $min) / $max : 0;
            if ($saturation > 0.2 && $max > 30 && $min < 220) {
                $colors[] = $hex;
            }
            if (count($colors) >= 5) {
                break;
            }
        }

        return $colors;
    }

    protected function title(Crawler $c): ?string
    {
        try {
            return trim($c->filter('title')->first()->text(''));
        } catch (\Throwable $e) { \Log::debug("HomepageExtractor: extraction step failed", ["error" => $e->getMessage()]); 
            return null;
        }
    }

    protected function metaDescription(Crawler $c): ?string
    {
        try {
            return $c->filter('meta[name="description"]')->first()->attr('content');
        } catch (\Throwable $e) { \Log::debug("HomepageExtractor: extraction step failed", ["error" => $e->getMessage()]); 
            return null;
        }
    }

    protected function logo(Crawler $c, string $baseUrl): ?string
    {
        $selectors = [
            'img[class*="logo"]',
            'img[id*="logo"]',
            'a[class*="logo"] img',
            'header img',
            'nav img',
        ];

        foreach ($selectors as $sel) {
            try {
                $src = $c->filter($sel)->first()->attr('src');
                if ($src) {
                    return $this->resolveUrl($src, $baseUrl);
                }
            } catch (\Throwable $e) { \Log::debug("HomepageExtractor: extraction step failed", ["error" => $e->getMessage()]); 
            }
        }

        return null;
    }

    protected function contact(Crawler $c): array
    {
        $html = $c->html();
        $contact = [];

        // Phone
        if (preg_match('/(\+?[\d\s\-().]{7,20})/', strip_tags($html), $m)) {
            if (str_contains($html, 'tel:')) {
                preg_match('/tel:([^\s"\'<]+)/', $html, $t);
                $contact['phone'] = isset($t[1]) ? urldecode($t[1]) : null;
            }
        }

        // Email
        if (preg_match('/href="mailto:([^"]+)"/', $html, $m)) {
            $contact['email'] = $m[1];
        } elseif (preg_match('/[\w.+\-]+@[\w\-]+\.[\w.]{2,}/', strip_tags($html), $m)) {
            $contact['email'] = $m[0];
        }

        // Address — look for schema.org or common patterns
        try {
            $addr = $c->filter('[itemprop="address"], address')->first()->text('');
            if ($addr) {
                $contact['address'] = trim(preg_replace('/\s+/', ' ', $addr));
            }
        } catch (\Throwable $e) { \Log::debug("HomepageExtractor: extraction step failed", ["error" => $e->getMessage()]); 
        }

        return $contact;
    }

    protected function services(Crawler $c): array
    {
        $services = [];
        $selectors = [
            'section[class*="service"] h3',
            'div[class*="service"] h3',
            '.services li',
            '#services li',
            'ul[class*="service"] li',
        ];

        foreach ($selectors as $sel) {
            try {
                $c->filter($sel)->each(function (Crawler $node) use (&$services) {
                    $text = trim($node->text(''));
                    if ($text && strlen($text) < 120) {
                        $services[] = $text;
                    }
                });
            } catch (\Throwable $e) { \Log::debug("HomepageExtractor: extraction step failed", ["error" => $e->getMessage()]); 
            }

            if (count($services) >= 10) {
                break;
            }
        }

        return array_unique(array_slice($services, 0, 10));
    }

    protected function images(Crawler $c, string $baseUrl): array
    {
        $images = [];

        try {
            $c->filter('img[src]')->each(function (Crawler $img) use (&$images, $baseUrl) {
                $src = $img->attr('src');
                if (! $src || str_starts_with($src, 'data:')) {
                    return;
                }
                $resolved = $this->resolveUrl($src, $baseUrl);
                $alt = $img->attr('alt') ?? '';
                $images[] = ['src' => $resolved, 'alt' => $alt];
            });
        } catch (\Throwable $e) { \Log::debug("HomepageExtractor: extraction step failed", ["error" => $e->getMessage()]); 
        }

        return array_slice($images, 0, 15);
    }

    protected function socials(Crawler $c): array
    {
        $socials = [];
        $patterns = [
            'facebook' => '/facebook\.com\/[^"\'?\s]+/',
            'instagram' => '/instagram\.com\/[^"\'?\s]+/',
            'twitter' => '/(?:twitter|x)\.com\/[^"\'?\s]+/',
            'linkedin' => '/linkedin\.com\/[^"\'?\s]+/',
            'youtube' => '/youtube\.com\/[^"\'?\s]+/',
        ];

        $html = $c->html();
        foreach ($patterns as $platform => $pattern) {
            if (preg_match($pattern, $html, $m)) {
                $socials[$platform] = 'https://'.preg_replace('/^(https?:\/\/)?/', '', $m[0]);
            }
        }

        return $socials;
    }

    protected function textContent(Crawler $c): string
    {
        try {
            // Strip scripts/styles then get text
            $c->filter('script, style, nav, footer')->each(function (Crawler $node) {
                foreach ($node as $n) {
                    $n->parentNode?->removeChild($n);
                }
            });
            $text = $c->filter('body')->first()->text('');

            return mb_substr(trim(preg_replace('/\s+/', ' ', $text)), 0, 8000);
        } catch (\Throwable $e) { \Log::debug("HomepageExtractor: extraction step failed", ["error" => $e->getMessage()]); 
            return '';
        }
    }

    protected function resolveUrl(string $src, string $baseUrl): string
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
        if (str_starts_with($src, '/')) {
            return "$scheme://$host$src";
        }
        $path = dirname($base['path'] ?? '/');

        return "$scheme://$host$path/$src";
    }
}
