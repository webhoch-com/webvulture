<?php

namespace Tests\Unit\Domain\Scraping;

use App\Domain\Scraping\ScraperService;
use ReflectionMethod;
use Tests\TestCase;

/**
 * Pin the consolidation contract: when the main scrape returns thin
 * content but the nav-crawled subpages contain sections + galleries (very
 * common for Verein-sites with /chronik + /bildergalerie), the
 * consolidator must merge those into the homepage's extracted payload
 * without duplicating titles or image URLs.
 */
class ScraperServiceConsolidationTest extends TestCase
{
    private function consolidate(array $extracted, array $navHtmls): array
    {
        $svc = $this->app->make(ScraperService::class);
        $m = new ReflectionMethod(ScraperService::class, 'consolidateFromNavPages');
        $m->setAccessible(true);

        return $m->invoke($svc, $extracted, $navHtmls);
    }

    public function test_returns_input_unchanged_when_no_nav_pages(): void
    {
        $input = [
            'sections' => [['title' => 'A', 'body' => 'x', 'level' => 2]],
            'gallery_images' => [['src' => 'https://x/a.jpg', 'alt' => '']],
        ];

        $this->assertSame($input, $this->consolidate($input, []));
    }

    public function test_merges_sections_from_chronik_subpage(): void
    {
        $homepage = [
            'sections' => [],
            'gallery_images' => [],
        ];

        $chronik = <<<'HTML'
<!DOCTYPE html>
<html><body><main>
  <h2>Geschichte des Vereins</h2>
  <p>Gegründet im Jahre 1878 als Bergknappenkapelle, fusionierten wir im Jahr 2024 mit der Feuerwehrkapelle zu einem schlagkräftigen Verein.</p>
  <p>Heute zählen wir 65 aktive Musikerinnen und Musiker aus der Region Vöcklabruck und freuen uns über regen Zuwachs auch unter den Jungmitgliedern.</p>
</main></body></html>
HTML;

        $out = $this->consolidate($homepage, ['https://x.at/chronik' => $chronik]);

        $titles = array_column($out['sections'], 'title');
        $this->assertContains('Geschichte des Vereins', $titles);
    }

    public function test_deduplicates_sections_with_same_title(): void
    {
        $homepage = [
            'sections' => [['title' => 'Über uns', 'body' => 'home', 'level' => 2]],
            'gallery_images' => [],
        ];

        $sub = <<<'HTML'
<!DOCTYPE html>
<html><body><main>
  <h2>Über uns</h2>
  <p>Wir sind ein traditionsreicher Musikverein mit einer langen Geschichte und einem aktiven Vereinsleben rund um Vöcklabruck.</p>
  <p>Zu unseren Höhepunkten zählen das Frühjahrskonzert sowie unzählige Hochzeiten und Begräbnisse im Bezirk.</p>
</main></body></html>
HTML;

        $out = $this->consolidate($homepage, ['https://x.at/about' => $sub]);

        $titles = array_column($out['sections'], 'title');
        $this->assertCount(1, array_filter($titles, fn ($t) => $t === 'Über uns'));
    }

    public function test_deduplicates_gallery_by_src(): void
    {
        $homepage = [
            'sections' => [],
            'gallery_images' => [['src' => 'https://x.at/img/a.jpg', 'alt' => '']],
        ];

        $sub = <<<'HTML'
<!DOCTYPE html>
<html><body>
  <div class="gallery">
    <img src="https://x.at/img/a.jpg" alt="dup">
    <img src="https://x.at/img/b.jpg" alt="new">
  </div>
</body></html>
HTML;

        $out = $this->consolidate($homepage, ['https://x.at/galerie' => $sub]);

        $srcs = array_column($out['gallery_images'], 'src');
        $this->assertCount(1, array_filter($srcs, fn ($s) => $s === 'https://x.at/img/a.jpg'));
        $this->assertContains('https://x.at/img/b.jpg', $srcs);
    }

    public function test_skips_nav_pages_that_fail_extraction(): void
    {
        $homepage = [
            'sections' => [['title' => 'Home', 'body' => 'x', 'level' => 1]],
            'gallery_images' => [],
        ];

        // Completely broken HTML — extractor should silently fail and we
        // should still get the homepage data back.
        $out = $this->consolidate($homepage, ['https://x.at/broken' => '<<<not html>>>']);

        $this->assertNotEmpty($out['sections']);
    }
}
