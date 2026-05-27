<?php

namespace Tests\Unit\Domain\Scraping;

use App\Domain\Scraping\ScraperService;
use Tests\TestCase;

/**
 * Pin the URL-normalization contract: when a lead's `website` points at a
 * subpage (Google Places sometimes returns /kontakt instead of the root)
 * the scraper must promote it to the domain root so we end up scraping the
 * actual homepage. Without this, templates render with empty About/Gallery
 * sections because the Kontakt-page has neither.
 */
class ScraperServiceUrlNormalizationTest extends TestCase
{
    private function normalize(string $url): string
    {
        return $this->app->make(ScraperService::class)->normalizeToHomepage($url);
    }

    public function test_keeps_root_url_as_is(): void
    {
        $this->assertSame(
            'https://example.at/',
            $this->normalize('https://example.at/')
        );
        $this->assertSame(
            'http://www.mv-puchkirchen.at/',
            $this->normalize('http://www.mv-puchkirchen.at/')
        );
    }

    public function test_promotes_kontakt_subpage_to_homepage(): void
    {
        $this->assertSame(
            'http://www.mv-puchkirchen.at/',
            $this->normalize('http://www.mv-puchkirchen.at/kontakt')
        );
    }

    public function test_promotes_impressum_subpage_to_homepage(): void
    {
        $this->assertSame(
            'https://example.at/',
            $this->normalize('https://example.at/impressum')
        );
    }

    public function test_promotes_datenschutz_subpage(): void
    {
        $this->assertSame(
            'https://example.at/',
            $this->normalize('https://example.at/datenschutz')
        );
    }

    public function test_promotes_about_us_paths(): void
    {
        $this->assertSame('https://x.at/', $this->normalize('https://x.at/about'));
        $this->assertSame('https://x.at/', $this->normalize('https://x.at/ueber-uns'));
        $this->assertSame('https://x.at/', $this->normalize('https://x.at/ueber_uns'));
        $this->assertSame('https://x.at/', $this->normalize('https://x.at/about-us'));
    }

    public function test_promotes_when_subpage_keyword_appears_deeper_in_path(): void
    {
        $this->assertSame(
            'https://example.at/',
            $this->normalize('https://example.at/de/info/kontakt')
        );
    }

    public function test_preserves_legitimate_subpath_urls(): void
    {
        // Some small businesses live under a path on a shared domain
        // (e.g. firma.at/cafe). Don't strip those — only known
        // boilerplate subpages get promoted.
        $this->assertSame(
            'https://firma.at/cafe',
            $this->normalize('https://firma.at/cafe')
        );
        $this->assertSame(
            'https://example.at/de/produkte',
            $this->normalize('https://example.at/de/produkte')
        );
    }

    public function test_handles_url_with_query_and_fragment(): void
    {
        // Query/fragment are dropped together with the path when we
        // detect a subpage — we want a clean root.
        $this->assertSame(
            'https://example.at/',
            $this->normalize('https://example.at/kontakt?ref=google#form')
        );
    }

    public function test_returns_input_unchanged_for_malformed_urls(): void
    {
        $this->assertSame('not-a-url', $this->normalize('not-a-url'));
        $this->assertSame('', $this->normalize(''));
    }
}
