<?php

namespace Tests\Unit\Domain\Scraping;

use App\Domain\Scraping\ScraperService;
use ReflectionMethod;
use Tests\TestCase;

/**
 * Pin the behavioural contract of `ScraperService::normalizeNavLinks()` — the
 * helper that reshapes the extractor's label-keyed nav map into the ordered
 * `[{label, href}]` list that the generator/templates consume.
 *
 * The extractor returns `['Über uns' => 'https://example.at/about', ...]`,
 * but templates need a stable ordered list with junk labels removed and a
 * count cap so a nav with 40 items can't break the layout.
 */
class ScraperServiceNavLinksTest extends TestCase
{
    private function normalize(array $raw): array
    {
        $svc = $this->app->make(ScraperService::class);
        $m = new ReflectionMethod(ScraperService::class, 'normalizeNavLinks');
        $m->setAccessible(true);

        return $m->invoke($svc, $raw);
    }

    public function test_keeps_label_and_href_in_array_shape(): void
    {
        $out = $this->normalize([
            'Über uns' => 'https://example.at/about',
            'Kontakt' => 'https://example.at/kontakt',
        ]);

        $this->assertCount(2, $out);
        $this->assertSame(['label' => 'Über uns', 'href' => 'https://example.at/about'], $out[0]);
        $this->assertSame(['label' => 'Kontakt', 'href' => 'https://example.at/kontakt'], $out[1]);
    }

    public function test_drops_junk_labels_like_skip_links_and_search(): void
    {
        $out = $this->normalize([
            'Zum Inhalt springen' => 'https://example.at/#main',
            'Skip to content' => 'https://example.at/#main2',
            'Search' => 'https://example.at/search',
            'Cookie Hinweis' => 'https://example.at/cookies',
            'Login' => 'https://example.at/login',
            'Menü' => 'https://example.at/menu',
            'Aktuelles' => 'https://example.at/news',
        ]);

        $this->assertCount(1, $out);
        $this->assertSame('Aktuelles', $out[0]['label']);
    }

    public function test_drops_non_http_schemes(): void
    {
        $out = $this->normalize([
            'tel'    => 'tel:+43-1-12345',
            'mail'   => 'mailto:hello@example.at',
            'evil'   => 'javascript:alert(1)',
            'data'   => 'data:text/html,<script>1</script>',
            'fine'   => 'https://example.at/safe',
        ]);

        $this->assertCount(1, $out);
        $this->assertSame('https://example.at/safe', $out[0]['href']);
    }

    public function test_drops_overlong_labels(): void
    {
        $out = $this->normalize([
            'A label that is way too long for a navigation entry and just shows we cap it' => 'https://x.at/a',
            'OK' => 'https://x.at/ok',
        ]);

        $this->assertCount(1, $out);
        $this->assertSame('OK', $out[0]['label']);
    }

    public function test_caps_at_8_entries(): void
    {
        $raw = [];
        for ($i = 1; $i <= 15; $i++) {
            $raw["Item {$i}"] = "https://x.at/item-{$i}";
        }
        $out = $this->normalize($raw);

        $this->assertCount(8, $out);
    }

    public function test_drops_empty_or_non_string_entries(): void
    {
        $out = $this->normalize([
            '' => 'https://x.at/empty-label',
            'Label' => '',
            'Real' => 'https://x.at/real',
            // PHP arrays coerce numeric-string keys to int, so this is a
            // realistic case after json_decode (some sites have empty
            // anchor labels that become "" → 0).
            0 => 'https://x.at/zero',
        ]);

        $this->assertCount(1, $out);
        $this->assertSame('Real', $out[0]['label']);
    }
}
