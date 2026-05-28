<?php

namespace Tests\Unit\Domain\Scraping;

use App\Domain\Scraping\HomepageExtractor;
use Tests\TestCase;

/**
 * PR-A8: locks the board-photo detection contract. Vereinsseiten present
 * their Vorstand as captioned photos; the generator's Vorstand-Foto-Matcher
 * can only attach a portrait if these images survive scraping tagged as
 * team candidates. Two signals must trigger detection — a role-naming alt,
 * and a board/vorstand/member class on the image or an ancestor — while a
 * plain content image must NOT be mistaken for a portrait.
 */
class HomepageExtractorTeamPhotosTest extends TestCase
{
    private function teamPhotos(string $html): array
    {
        return (new HomepageExtractor)->extract($html, 'https://example.at/')['team_photos'] ?? [];
    }

    public function test_detects_photo_with_role_naming_alt(): void
    {
        $html = <<<'HTML'
<html><body><main>
  <img src="/img/portrait-mueller.jpg" alt="Obmann Hans Müller">
  <img src="/img/landschaft.jpg" alt="Blick auf das Tal">
</main></body></html>
HTML;

        $photos = $this->teamPhotos($html);
        $srcs = array_column($photos, 'src');

        $this->assertContains('https://example.at/img/portrait-mueller.jpg', $srcs);
        // A scenery image with no role/class signal must not be picked up.
        $this->assertNotContains('https://example.at/img/landschaft.jpg', $srcs);
    }

    public function test_detects_photo_via_ancestor_class(): void
    {
        $html = <<<'HTML'
<html><body><main>
  <figure class="vorstand-member">
    <img src="/img/anna.jpg" alt="Anna Schmidt">
    <figcaption>Anna Schmidt</figcaption>
  </figure>
  <div class="gallery-tile"><img src="/img/konzert.jpg" alt="Konzert 2025"></div>
</main></body></html>
HTML;

        $photos = $this->teamPhotos($html);
        $srcs = array_column($photos, 'src');

        $this->assertContains('https://example.at/img/anna.jpg', $srcs);
        $this->assertNotContains('https://example.at/img/konzert.jpg', $srcs);
    }

    public function test_returns_empty_when_no_board_signal(): void
    {
        $html = <<<'HTML'
<html><body><main>
  <img src="/img/a.jpg" alt="Frühschoppen">
  <img src="/img/b.jpg" alt="">
</main></body></html>
HTML;

        $this->assertSame([], $this->teamPhotos($html));
    }

    public function test_carries_alt_for_name_matching(): void
    {
        $html = <<<'HTML'
<html><body><main>
  <img src="/img/k.jpg" alt="Kapellmeister Lukas Berger" class="team-card__photo">
</main></body></html>
HTML;

        $photos = $this->teamPhotos($html);

        $this->assertCount(1, $photos);
        $this->assertSame('Kapellmeister Lukas Berger', $photos[0]['alt']);
    }
}
