<?php

namespace Tests\Unit\Domain\Scraping;

use App\Domain\Scraping\RebuildPackageBuilder;
use ReflectionMethod;
use Tests\TestCase;

/**
 * Locks the sanitization contract of cleanSections() — the second of four
 * layers in the redesign-sections data flow (extractor → builder → orchestrator
 * → template). The builder is the last PHP-side defence before scraped data
 * crosses the HTTP boundary into the Node generator, so it must enforce:
 *  - HTML stripped (defence-in-depth on top of extractor's textContent)
 *  - level clamped to valid heading range
 *  - bodies truncated below the size cap
 *  - entries with missing title or body dropped
 *  - max 8 entries
 */
class RebuildPackageBuilderTest extends TestCase
{
    private function clean(array $raw): array
    {
        $builder = $this->app->make(RebuildPackageBuilder::class);
        $m = new ReflectionMethod(RebuildPackageBuilder::class, 'cleanSections');
        $m->setAccessible(true);

        return $m->invoke($builder, $raw);
    }

    public function test_strips_html_in_title_and_body_and_clamps_level(): void
    {
        $cleaned = $this->clean([
            [
                'title' => '<script>alert(1)</script>Über uns',
                'level' => 99,
                'body' => '<img src=x onerror=alert(1)>Wir wurden 1873 gegründet und sind seit über 150 Jahren ein fester Bestandteil.',
            ],
        ]);

        $this->assertCount(1, $cleaned);
        $this->assertSame('alert(1)Über uns', $cleaned[0]['title']);
        $this->assertSame(6, $cleaned[0]['level'], 'level must be clamped to <=6');
        $this->assertStringNotContainsString('<', $cleaned[0]['body']);
        $this->assertStringContainsString('1873', $cleaned[0]['body']);
    }

    public function test_drops_entries_with_missing_title_or_body(): void
    {
        $cleaned = $this->clean([
            ['title' => '', 'level' => 2, 'body' => 'has body that is plenty long for the filter to keep'],
            ['title' => 'has title', 'level' => 2, 'body' => ''],
            ['title' => 'good', 'level' => 2, 'body' => 'good body that is also long enough to pass.'],
        ]);

        $this->assertCount(1, $cleaned);
        $this->assertSame('good', $cleaned[0]['title']);
    }

    public function test_drops_entries_with_short_body_or_junk_title(): void
    {
        $cleaned = $this->clean([
            // Body too short — page chrome ("Mehr lesen", "Hier klicken")
            ['title' => 'Schöne Sektion', 'level' => 2, 'body' => 'Hier klicken.'],
            // Junk title — skip link, footer
            ['title' => 'Zum Inhalt springen', 'level' => 2, 'body' => 'Skip-link target that should not become an editorial section.'],
            ['title' => 'Datenschutz', 'level' => 2, 'body' => 'Wir nehmen den Schutz Ihrer Daten ernst und behandeln sie vertraulich.'],
            // Good entry survives
            ['title' => 'Über uns', 'level' => 2, 'body' => 'Wir wurden 1873 gegründet und sind seit über 150 Jahren ein fester Bestandteil der Region.'],
        ]);

        $this->assertCount(1, $cleaned);
        $this->assertSame('Über uns', $cleaned[0]['title']);
    }

    public function test_dedupes_by_lowercase_title(): void
    {
        $cleaned = $this->clean([
            ['title' => 'Über uns', 'level' => 2, 'body' => 'First mention with enough body content here yes.'],
            ['title' => 'ÜBER UNS', 'level' => 3, 'body' => 'Duplicate of same section repeated in the footer area.'],
        ]);

        $this->assertCount(1, $cleaned);
    }

    public function test_dedupe_collision_keeps_longer_body(): void
    {
        // A typical scrape problem: nav-link "Über uns" is harvested first
        // (short body extracted from <li>), then the actual section "Über uns"
        // shows up later with the real prose. We must keep the prose, not the link.
        $cleaned = $this->clean([
            ['title' => 'Über uns', 'level' => 3, 'body' => 'Navigation link short body that is just long enough.'],
            ['title' => 'Über uns', 'level' => 2, 'body' => 'Echter Inhalt: Wir wurden 1923 gegründet und sind ein traditionsreicher Verein mit über 60 aktiven Mitgliedern in allen Altersgruppen.'],
        ]);

        $this->assertCount(1, $cleaned);
        $this->assertStringContainsString('1923 gegründet', $cleaned[0]['body']);
        $this->assertStringNotContainsString('Navigation link', $cleaned[0]['body']);
    }

    public function test_truncates_body_below_size_cap(): void
    {
        $cleaned = $this->clean([
            ['title' => 'X', 'level' => 2, 'body' => str_repeat('a', 5000)],
        ]);

        $this->assertLessThanOrEqual(1600, mb_strlen($cleaned[0]['body']));
    }

    public function test_caps_at_8_entries(): void
    {
        $entries = [];
        for ($i = 0; $i < 20; $i++) {
            $entries[] = ['title' => "T{$i}", 'level' => 2, 'body' => "Body for entry {$i} long enough to pass."];
        }
        $cleaned = $this->clean($entries);
        $this->assertCount(8, $cleaned);
    }

    public function test_clamps_negative_or_zero_level_to_one(): void
    {
        $cleaned = $this->clean([
            ['title' => 'A', 'level' => -3, 'body' => 'long enough body content here yes.'],
            ['title' => 'B', 'level' => 0, 'body' => 'long enough body content here yes.'],
        ]);

        $this->assertSame(1, $cleaned[0]['level']);
        $this->assertSame(1, $cleaned[1]['level']);
    }
}
