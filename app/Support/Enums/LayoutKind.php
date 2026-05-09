<?php

namespace App\Support\Enums;

enum LayoutKind: string
{
    case Standard = 'standard';
    case Restaurant = 'restaurant';
    case Friseur = 'friseur';
    case Handwerk = 'handwerk';
    case Arzt = 'arzt';
    /** @deprecated Use VereinMusik / VereinSport / VereinTradition. Retained as fallback for unmatched Vereine. */
    case Verein = 'verein';
    case VereinMusik = 'verein_musik';
    case VereinSport = 'verein_sport';
    case VereinTradition = 'verein_tradition';
    case Golfclub = 'golfclub';
    case Kanzlei = 'kanzlei';
    case Hotel = 'hotel';
    case Fitness = 'fitness';
    case Einzelhandel = 'einzelhandel';
    case Galerie = 'galerie';
    case Autohaus = 'autohaus';
    case Energie = 'energie';
    case Bestattung = 'bestattung';
    case Tier = 'tier';

    public function label(): string
    {
        return match ($this) {
            self::Standard => 'Standard',
            self::Restaurant => 'Restaurant / Gastro',
            self::Friseur => 'Friseur / Beauty',
            self::Handwerk => 'Handwerk',
            self::Arzt => 'Arzt / Praxis',
            self::Verein => 'Verein (allgemein)',
            self::VereinMusik => 'Musikverein',
            self::VereinSport => 'Sportverein',
            self::VereinTradition => 'Trachten- / Tradition / Schützen',
            self::Golfclub => 'Golfclub',
            self::Kanzlei => 'Kanzlei / Beratung',
            self::Hotel => 'Hotel / Beherbergung',
            self::Fitness => 'Fitness / Kursanbieter',
            self::Einzelhandel => 'Einzelhandel / Boutique',
            self::Galerie => 'Galerie / Kreativ',
            self::Autohaus => 'Autohaus / Bauträger',
            self::Energie => 'Energie / Solar',
            self::Bestattung => 'Bestattung',
            self::Tier => 'Tier / Hundeschule',
        };
    }

    public function description(): string
    {
        return match ($this) {
            self::Standard => 'Allgemeines Layout — Hero, Leistungen, Über uns, Referenzen, Kontakt.',
            self::Restaurant => 'Speisekarte, Reservierung, Anfahrt — für Lokale, Cafés, Bistros, Bäckereien, Imbiss.',
            self::Friseur => 'Service-Liste mit Preisen, Online-Booking-CTA — für Friseur, Barber, Beauty, Massage, Spa.',
            self::Handwerk => 'Leistungen, Referenzen, Notdienst-CTA — für Maler, Elektriker, Sanitär, Schlüsseldienst, Reinigung.',
            self::Arzt => 'Sprechzeiten, Termin-Anfrage, Datenschutz-betont — für Ärzte, Therapeuten, Heilpraktiker, Apotheker.',
            self::Verein => 'Generisches Verein-Layout (Fallback) — bevorzugt VereinMusik/VereinSport/VereinTradition.',
            self::VereinMusik => 'Musikkapelle / Chor / Orchester — Konzerttermine, Klangkörper, Probelokal.',
            self::VereinSport => 'Sportverein — Liga, Trainingsplan, Spielergebnisse, Mannschaften, Mitgliedschaft.',
            self::VereinTradition => 'Trachten/Schützen/Heimat-Verein — Brauchtum, historische Identität, würdevoll.',
            self::Golfclub => 'Premium-Layout für Golfclubs — Course-Daten, Mitgliedschaftspakete, Tee-Times, Tournament-Kalender.',
            self::Kanzlei => 'Trust-First mit Vita, Rechtsgebieten, Erstberatung-CTA — für Anwälte, Notare, Steuerberater, Coaches.',
            self::Hotel => 'Zimmer-Galerie mit Preisen, Anfrage/Buchen-CTA — für Hotels, Pensionen, FeWos, Bauernhöfe.',
            self::Fitness => 'Kursplan-Tabelle, Mitgliedschaftspreise, Probetraining — für Fitness, Yoga, Tanzschule, Sprachschule, Nachhilfe, Musikschule.',
            self::Einzelhandel => 'Sortiment-Highlights, Öffnungszeiten prominent, Anfahrt — für Boutique, Bioladen, Buchhandlung, Blumen, Juwelier.',
            self::Galerie => 'Galerie-First (full-width Bilder dominant), Portfolio-Cards, Anfrage-CTA — für Fotograf, Videograf, Tattoo, Grafiker, Schreiner.',
            self::Autohaus => 'Aktuelle Fahrzeuge/Objekte als Highlights, Beratungs-Anfrage — für Autohaus, Gebrauchtwagen, Immobilienmakler, Bauträger.',
            self::Energie => 'Förderhinweise, Referenzprojekte, Zertifikate, Beratungs-Anfrage — für Solar/PV, Wärmepumpe, Energieberater.',
            self::Bestattung => 'Empathische, gedeckte Tonalität ohne aggressive CTAs — für Bestattungsunternehmen.',
            self::Tier => 'Emotional warmer Ton, Erstgespräch-CTA — für Tierarzt, Hundeschule/-trainer, Tierpension.',
        };
    }

    public function icon(): string
    {
        return match ($this) {
            self::Standard => 'o-square-3-stack-3d',
            self::Restaurant => 'o-cake',
            self::Friseur => 'o-sparkles',
            self::Handwerk => 'o-wrench-screwdriver',
            self::Arzt => 'o-heart',
            self::Verein => 'o-user-group',
            self::VereinMusik => 'o-musical-note',
            self::VereinSport => 'o-trophy',
            self::VereinTradition => 'o-flag',
            self::Golfclub => 'o-flag',
            self::Kanzlei => 'o-scale',
            self::Hotel => 'o-building-office-2',
            self::Fitness => 'o-bolt',
            self::Einzelhandel => 'o-shopping-bag',
            self::Galerie => 'o-photo',
            self::Autohaus => 'o-truck',
            self::Energie => 'o-sun',
            self::Bestattung => 'o-moon',
            self::Tier => 'o-heart',
        };
    }

    public function emoji(): string
    {
        return match ($this) {
            self::Standard => '🌐',
            self::Restaurant => '🍽️',
            self::Friseur => '💇',
            self::Handwerk => '🔧',
            self::Arzt => '🩺',
            self::Verein => '🎺',
            self::VereinMusik => '🎼',
            self::VereinSport => '⚽',
            self::VereinTradition => '🏔️',
            self::Golfclub => '⛳',
            self::Kanzlei => '⚖️',
            self::Hotel => '🏨',
            self::Fitness => '🏋️',
            self::Einzelhandel => '🛍️',
            self::Galerie => '📸',
            self::Autohaus => '🚗',
            self::Energie => '☀️',
            self::Bestattung => '🕊️',
            self::Tier => '🐾',
        };
    }
}
