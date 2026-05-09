<?php

namespace Tests\Unit\Domain\Scraping;

use App\Domain\Scraping\HomepageExtractor;
use Tests\TestCase;

/**
 * Locks the contract that the section extractor pulls real headings + bodies
 * out of a prospect page so the demo template can render a *redesign* of
 * their actual content. Drift here means demos fall back to generic stencils
 * — the user explicitly rejected that direction.
 */
class HomepageExtractorSectionsTest extends TestCase
{
    public function test_extracts_h2_and_following_paragraphs(): void
    {
        $html = <<<'HTML'
<!DOCTYPE html>
<html><body>
  <main>
    <h1>Stadtmusik Vöcklabruck</h1>
    <h2>Über uns</h2>
    <p>Die Stadtmusik Vöcklabruck wurde 1873 gegründet und ist seit über 150 Jahren ein fester Bestandteil des kulturellen Lebens unserer Region.</p>
    <p>Heute zählt der Verein 65 aktive Musikerinnen und Musiker, die regelmäßig konzertieren.</p>

    <h2>Termine</h2>
    <p>Unser Frühjahrskonzert findet am 12. Mai 2026 im Stadtsaal Vöcklabruck statt — Beginn 19:30 Uhr.</p>

    <h2>Mitgliedschaft</h2>
    <p>Wir freuen uns über Nachwuchs! Anmeldungen für die Bläserklasse jederzeit beim Obmann möglich.</p>
  </main>
  <footer>
    <h2>Kontakt</h2>
    <p>Footer chatter that should be stripped before section walking.</p>
  </footer>
</body></html>
HTML;

        $sections = (new HomepageExtractor)->extract($html, 'https://example.at/')['sections'];

        $titles = array_column($sections, 'title');
        $this->assertContains('Über uns', $titles);
        $this->assertContains('Termine', $titles);
        $this->assertContains('Mitgliedschaft', $titles);
        // Footer "Kontakt" must be filtered out (junk-heading + footer-stripped).
        $this->assertNotContains('Kontakt', $titles);

        // Body of the first real section must include the gründungs-sentence.
        $about = collect($sections)->firstWhere('title', 'Über uns');
        $this->assertNotNull($about);
        $this->assertStringContainsString('1873', $about['body']);
    }

    public function test_skips_short_or_junk_paragraphs(): void
    {
        $html = <<<'HTML'
<html><body>
  <main>
    <h2>Mehr</h2>
    <p>Klick</p>
    <h2>Über</h2>
    <p>Wir sind ein traditionsreicher Musikverein aus Oberösterreich mit langer Geschichte und großer Leidenschaft für sinfonische Blasmusik.</p>
  </main>
</body></html>
HTML;

        $sections = (new HomepageExtractor)->extract($html, 'https://example.at/')['sections'];

        $titles = array_column($sections, 'title');
        // "Mehr" has no body >= 40 chars → must be dropped
        $this->assertNotContains('Mehr', $titles);
        $this->assertContains('Über', $titles);
    }

    public function test_dedupes_repeated_headings(): void
    {
        $html = <<<'HTML'
<html><body>
  <main>
    <h2>Termine</h2>
    <p>Erster Termin-Block mit ausreichend Text um den 40-Zeichen-Filter zu passieren ohne Probleme.</p>
    <h2>Termine</h2>
    <p>Zweiter Termin-Block mit ausreichend Text um den 40-Zeichen-Filter zu passieren ohne Probleme.</p>
  </main>
</body></html>
HTML;

        $sections = (new HomepageExtractor)->extract($html, 'https://example.at/')['sections'];

        $termine = array_filter($sections, fn ($s) => $s['title'] === 'Termine');
        $this->assertCount(1, $termine);
    }
}
