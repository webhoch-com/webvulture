<?php

namespace Tests\Unit\Domain\Layout;

use App\Domain\Layout\LayoutMatcher;
use App\Support\Enums\LayoutKind;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class LayoutMatcherTest extends TestCase
{
    private LayoutMatcher $matcher;

    protected function setUp(): void
    {
        parent::setUp();
        $this->matcher = new LayoutMatcher;
    }

    #[DataProvider('matchProvider')]
    public function test_matches_kind_from_inputs(LayoutKind $expected, array $inputs): void
    {
        $this->assertSame($expected, $this->matcher->match(...$inputs));
    }

    public static function matchProvider(): array
    {
        return [
            'restaurant from category' => [LayoutKind::Restaurant, ['restaurant', 'Italienische Küche']],
            'restaurant from name' => [LayoutKind::Restaurant, [null, null, 'Pizzeria Bella Italia']],
            'cafe → restaurant' => [LayoutKind::Restaurant, ['cafe', 'Café Mozart']],

            'friseur from google category' => [LayoutKind::Friseur, ['hair_salon', 'creative hair salon']],
            'friseur from niche-de' => [LayoutKind::Friseur, ['Premium Friseursalon', 'hair_salon']],
            'barber → friseur' => [LayoutKind::Friseur, ['barber_shop']],

            'handwerk maler' => [LayoutKind::Handwerk, ['painter', 'Malermeister Schmidt']],
            'handwerk elektriker' => [LayoutKind::Handwerk, [null, 'Elektroinstallation']],
            'handwerk dachdecker' => [LayoutKind::Handwerk, ['Dachdeckerei Maier']],

            'arzt zahnarzt' => [LayoutKind::Arzt, ['Zahnarzt Praxis Dr. Huber']],
            'arzt physio' => [LayoutKind::Arzt, ['Physiotherapie Salzburg']],
            'arzt heilpraktiker' => [LayoutKind::Arzt, [null, 'Heilpraktiker']],

            'verein musikverein' => [LayoutKind::VereinMusik, ['Musikverein Mariazell']],
            'verein sport' => [LayoutKind::VereinSport, ['Sportverein Salzburg']],
            'verein feuerwehr' => [LayoutKind::VereinTradition, [null, 'Freiwillige Feuerwehr']],

            'kanzlei anwalt' => [LayoutKind::Kanzlei, ['Rechtsanwalt Dr. Müller']],
            'kanzlei steuerberater' => [LayoutKind::Kanzlei, [null, 'Steuerberatungs-Kanzlei']],
            'kanzlei notar' => [LayoutKind::Kanzlei, ['Notariat Wien']],

            'hotel pension' => [LayoutKind::Hotel, ['Pension Alpenblick']],
            'hotel fewo' => [LayoutKind::Hotel, [null, 'Ferienwohnung am See']],
            'hotel bauernhof' => [LayoutKind::Hotel, ['Urlaub am Bauernhof Tirol']],

            'fitness gym' => [LayoutKind::Fitness, ['Fitnessstudio Salzburg']],
            'fitness yoga' => [LayoutKind::Fitness, [null, 'Yoga Studio']],
            'fitness sprachschule' => [LayoutKind::Fitness, ['Sprachschule Wien']],
            'fitness nachhilfe' => [LayoutKind::Fitness, ['Nachhilfe-Institut']],

            'einzelhandel boutique' => [LayoutKind::Einzelhandel, ['Modeboutique La Vita']],
            'einzelhandel buchhandlung' => [LayoutKind::Einzelhandel, [null, 'Buchhandlung Wagner']],
            'einzelhandel blumen' => [LayoutKind::Einzelhandel, ['Blumen Müller']],
            'einzelhandel juwelier' => [LayoutKind::Einzelhandel, ['Juwelier Goldstein']],

            'galerie fotograf' => [LayoutKind::Galerie, ['Fotograf Salzburg']],
            'galerie tattoo' => [LayoutKind::Galerie, [null, 'Tattoo Studio Ink']],
            'galerie hochzeit' => [LayoutKind::Galerie, ['Hochzeitsplaner & Wedding']],

            'autohaus' => [LayoutKind::Autohaus, ['Autohaus Müller GmbH']],
            'autohaus immobilien' => [LayoutKind::Autohaus, [null, 'Immobilienmakler Salzburg']],
            'autohaus bauträger' => [LayoutKind::Autohaus, ['Bauträger Meier']],

            'energie solar' => [LayoutKind::Energie, ['Solar-Anlagen Mayer']],
            'energie photovoltaik' => [LayoutKind::Energie, [null, 'Photovoltaik & Wärmepumpe']],

            'bestattung' => [LayoutKind::Bestattung, ['Bestattung Salzburg']],
            'bestattung beerdig' => [LayoutKind::Bestattung, [null, 'Beerdigungsinstitut']],

            'tier tierarzt' => [LayoutKind::Tier, ['Tierarzt Dr. Maier']],
            'tier hundeschule' => [LayoutKind::Tier, [null, 'Hundeschule Salzburg']],

            'unknown → standard' => [LayoutKind::Standard, ['xyz random business name 123']],
            'empty → standard' => [LayoutKind::Standard, [null, null, null]],
        ];
    }

    public function test_friseur_wins_over_generic_salon(): void
    {
        $this->assertSame(LayoutKind::Friseur, $this->matcher->match('hair_salon'));
    }

    public function test_confidence_increases_with_more_keyword_hits(): void
    {
        $low = $this->matcher->confidence(LayoutKind::Friseur, 'salon');
        $high = $this->matcher->confidence(LayoutKind::Friseur, 'Friseur und Beauty Salon mit Hair-Styling');

        $this->assertGreaterThan($low, $high);
        $this->assertGreaterThan(0.0, $high);
    }

    public function test_standard_kind_has_zero_confidence(): void
    {
        $this->assertSame(0.0, $this->matcher->confidence(LayoutKind::Standard, 'anything'));
    }
}
