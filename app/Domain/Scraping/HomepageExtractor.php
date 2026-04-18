<?php

namespace App\Domain\Scraping;

use Symfony\Component\DomCrawler\Crawler;

class HomepageExtractor
{
    public function extract(string $html, string $baseUrl): array
    {
        $crawler = new Crawler($html, $baseUrl);

        return [
            'title'            => $this->title($crawler),
            'meta_description' => $this->metaDescription($crawler),
            'logo_url'         => $this->logo($crawler, $baseUrl),
            'contact'          => $this->contact($crawler),
            'services'         => $this->services($crawler),
            'images'           => $this->images($crawler, $baseUrl),
            'socials'          => $this->socials($crawler),
            'nav_links'        => $this->navLinks($crawler, $baseUrl),
            'brand_colors'     => $this->brandColors($html),
            'text_content'     => $this->textContent($crawler),
        ];
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
                    if (!$href || !$label || str_starts_with($href, '#') || strlen($label) > 40) {
                        return;
                    }
                    $resolved = $this->resolveUrl($href, $baseUrl);
                    $parsed = parse_url($resolved);
                    // Same-domain only
                    if (($parsed['host'] ?? '') === $host) {
                        $links[$label] = $resolved;
                    }
                });
            } catch (\Throwable) {}
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
        } catch (\Throwable) {
            return null;
        }
    }

    protected function metaDescription(Crawler $c): ?string
    {
        try {
            return $c->filter('meta[name="description"]')->first()->attr('content');
        } catch (\Throwable) {
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
            } catch (\Throwable) {}
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
        } catch (\Throwable) {}

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
            } catch (\Throwable) {}

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
                if (!$src || str_starts_with($src, 'data:')) {
                    return;
                }
                $resolved = $this->resolveUrl($src, $baseUrl);
                $alt = $img->attr('alt') ?? '';
                $images[] = ['src' => $resolved, 'alt' => $alt];
            });
        } catch (\Throwable) {}

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
        } catch (\Throwable) {
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
