/**
 * Build "blank" demo previews for all 15 LayoutKinds.
 *
 * Generates one static Astro site per layout with curated placeholder content
 * (Lorem-ipsum-style but branche-typisch). Output goes to:
 *   ${ARTIFACTS_DIR}/_demo-{layoutKind}/
 *
 * Nginx-Vhost can serve these under e.g. https://demo-{kind}.webseiten-werkstatt.at/
 * or be linked directly from the templates gallery.
 *
 * Usage:
 *   pnpm tsx src/build-demos.ts        # build all 15
 *   pnpm tsx src/build-demos.ts arzt   # build only one
 */

import { spawn } from 'node:child_process';
import { mkdir, rename, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { scaffoldAstroProject } from './scaffolder.js';
import type { LayoutKind, SiteSpec } from './types.js';

// Demos go to permanent vhost root by default — survives /tmp wipe on reboot.
const ARTIFACTS_DIR = process.env.DEMO_OUTPUT_DIR ?? process.env.PREVIEW_ARTIFACT_PATH ?? '/var/www/webseiten-werkstatt';
const PROJECTS_DIR = process.env.PROJECTS_DIR ?? '/tmp/wv-projects';

const ALL: LayoutKind[] = [
  'standard',
  'restaurant',
  'friseur',
  'handwerk',
  'arzt',
  'verein',
  'kanzlei',
  'hotel',
  'fitness',
  'einzelhandel',
  'galerie',
  'autohaus',
  'energie',
  'bestattung',
  'tier',
];

function baseSpec(kind: LayoutKind): SiteSpec {
  const COLORS: Record<LayoutKind, string> = {
    standard: '#7c3aed',
    restaurant: '#a31621',
    friseur: '#ec4899',
    handwerk: '#ea580c',
    arzt: '#0ea5e9',
    verein: '#16a34a',
    kanzlei: '#1e3a8a',
    hotel: '#b45309',
    fitness: '#dc2626',
    einzelhandel: '#db2777',
    galerie: '#0a0a0a',
    autohaus: '#0f172a',
    energie: '#facc15',
    bestattung: '#475569',
    tier: '#7e22ce',
  };

  const NAMES: Record<LayoutKind, { name: string; tagline: string; head: string; sub: string }> = {
    standard:    { name: 'Beispiel Unternehmen',  tagline: 'Maßgeschneiderte Webseiten, die für lokale Betriebe funktionieren.',
                   head: 'Ihre digitale Visitenkarte — modern, schnell, sichtbar.', sub: 'So sähe Ihre nächste Webseite aus. Klar strukturiert, ohne Schnickschnack, mit Fokus auf das, was Kunden suchen.' },
    restaurant:  { name: 'Wirtshaus zum Bachstüberl', tagline: 'Bodenständige Küche aus Salzburg — saisonal, regional, ehrlich.',
                   head: 'Bodenständige Küche. Familiäre Atmosphäre.', sub: 'Mittagstisch, Abendkarte, Catering — reservieren Sie telefonisch oder per E-Mail.' },
    friseur:     { name: 'Beauty Studio Anna',    tagline: 'Friseur & Beauty in Salzburg — Stil mit Persönlichkeit.',
                   head: 'Schnitt. Farbe. Wohlfühlen.', sub: 'Faire Preise, ehrliche Beratung. Online-Termin in 30 Sekunden.' },
    handwerk:    { name: 'Maler Hofer GmbH',      tagline: 'Maler- und Anstreicher-Meisterbetrieb seit 1987.',
                   head: 'Ihr Handwerker für Salzburg und Umgebung.', sub: 'Innen, außen, Sanierung, Renovierung — pünktlich, sauber, fair kalkuliert.' },
    arzt:        { name: 'Dr. Mayer Praxis',      tagline: 'Allgemeinmedizin · Vorsorge · Kassenpraxis Salzburg.',
                   head: 'Ihre Hausarztpraxis im Zentrum.', sub: 'Online-Termine, kurze Wartezeiten, vertrauensvolle Beratung. Wir sind für Sie da.' },
    verein:      { name: 'Musterverein Musik',    tagline: 'Blasmusik aus Tradition — gegründet vor über 90 Jahren.',
                   head: 'Musik verbindet Generationen.', sub: 'Konzerte, Frühschoppen, Probelokal-Termine — wir freuen uns auf Sie!' },
    kanzlei:     { name: 'Kanzlei Wagner & Partner', tagline: 'Rechtsanwälte für Wirtschaftsrecht in Salzburg.',
                   head: 'Klarheit in komplexen Fällen.', sub: 'Erstberatung kostenfrei. Spezialisiert auf Vertragsrecht, Arbeitsrecht und M&A.' },
    hotel:       { name: 'Hotel Bergblick',       tagline: '4-Sterne-Hotel mit Aussicht — Salzkammergut.',
                   head: 'Aufwachen mit Bergblick.', sub: '32 Zimmer, hauseigenes Restaurant, Wellness. Direkt buchen für besten Preis.' },
    fitness:     { name: 'PowerHouse Studio',     tagline: 'Krafttraining · Yoga · Personal Training in Salzburg.',
                   head: 'Stärker werden. Auf Ihrem Weg.', sub: 'Probetraining gratis. Flexible Mitgliedschaften, ehrliches Coaching.' },
    einzelhandel:{ name: 'Boutique Lila',         tagline: 'Mode & Accessoires aus Salzburg.',
                   head: 'Gut angezogen. Ohne Mainstream.', sub: 'Kuratierte Auswahl, persönliche Beratung. Öffnungszeiten Mo-Sa 10-18 Uhr.' },
    galerie:     { name: 'Studio Lichtraum',      tagline: 'Fotografie & Bildkunst — Salzburg.',
                   head: 'Augenblicke, die bleiben.', sub: 'Hochzeit, Portrait, Business — gestalten wir Ihre Bildsprache. Jetzt anfragen.' },
    autohaus:    { name: 'Autohaus Steiner',      tagline: 'Marken-Vielfalt · Werkstatt · Service — seit 50 Jahren.',
                   head: 'Ihr Auto. Unsere Verantwortung.', sub: 'Junge Gebrauchte, Service-Termine in 48 h, Finanzierung. Probefahrt vereinbaren.' },
    energie:     { name: 'SolarHof Energie',      tagline: 'Photovoltaik · Wärmepumpe · Förderberatung in Salzburg.',
                   head: 'Unabhängig werden. Mit Sonne.', sub: 'Komplettpaket inkl. Förderabwicklung. 25 Jahre Garantie auf Module.' },
    bestattung:  { name: 'Bestattung Frieden',    tagline: 'Würdevolle Begleitung in schweren Stunden.',
                   head: 'In Ihrer Trauer sind Sie nicht allein.', sub: 'Persönlich, einfühlsam, transparent. Erreichbar 24/7 unter unserer Notrufnummer.' },
    tier:        { name: 'Tierarztpraxis Pfötchen', tagline: 'Tiermedizin mit Herz — Salzburg.',
                   head: 'Wenn’s Ihrem Liebling gut geht.', sub: 'Vorsorge, Notfälle, Operationen, Hausbesuche. Termin online buchen.' },
  };

  const m = NAMES[kind];

  return ({
    business_name: m.name,
    tagline: m.tagline,
    layout_kind: kind,
    hero: {
      headline: m.head,
      subheadline: m.sub,
      cta_text: kind === 'arzt' || kind === 'tier' ? 'Termin anfragen'
              : kind === 'restaurant' ? 'Reservieren'
              : kind === 'hotel' ? 'Zimmer anfragen'
              : kind === 'verein' ? 'Mitglied werden'
              : kind === 'bestattung' ? 'Beratung anfragen'
              : 'Jetzt anfragen',
    },
    about: {
      body: 'Dieser Text beschreibt das Unternehmen — die Geschichte, das Team und das, was wir besonders gut machen. In der echten Version steht hier der individuell verfasste Inhalt, der die Persönlichkeit und Qualität des Betriebs sichtbar macht.',
    },
    services: kind === 'verein'
      ? [
          { name: 'Wöchentliche Proben', description: 'Jeden Mittwoch ab 19:30 Uhr in unserem Probelokal. Neue Mitglieder herzlich willkommen.', icon: '' },
          { name: 'Konzerte & Auftritte', description: 'Frühschoppen, Sommerkonzert, Herbstkonzert — Live-Termine im ganzen Jahr.', icon: '' },
          { name: 'Jugendkapelle', description: 'Eigenständige Jugendarbeit mit Instrumental-Ausbildung. Einstieg ab 8 Jahren.', icon: '' },
          { name: 'Vereinsfeste', description: 'Maibaumfest, Frühschoppen, Vereinsausflug — Tradition und Gemeinschaft.', icon: '' },
          { name: 'Ausbildung', description: 'Kooperation mit der Landesmusikschule. Vermittlung an qualifizierte Lehrkräfte.', icon: '' },
          { name: 'Region & Brauchtum', description: 'Verbunden mit der Heimat — wir spielen, wo Tradition Heimat hat.', icon: '' },
        ]
    : kind === 'kanzlei'
      ? [
          { name: 'Wirtschaftsrecht', description: 'Vertragsgestaltung, M&A-Begleitung, Compliance, Gesellschaftsrecht — strategische Beratung im Geschäftsalltag.', icon: '' },
          { name: 'Arbeitsrecht', description: 'Anstellungsverträge, Kündigungsschutz, Reorganisationen — beratend und prozessführend für Arbeitgeber.', icon: '' },
          { name: 'Vertragsrecht', description: 'Internationale Verträge, AGB-Prüfung, Streitbeilegung — präzise, durchsetzungsstark.', icon: '' },
          { name: 'IT- & Datenschutzrecht', description: 'DSGVO, IT-Verträge, Lizenzrecht — für digitale Geschäftsmodelle und SaaS-Anbieter.', icon: '' },
          { name: 'Immobilienrecht', description: 'Kauf, Bauvertrag, WEG-Recht — von der Beurkundung bis zur Streitbeilegung.', icon: '' },
          { name: 'Erbrecht & Nachfolge', description: 'Nachfolgeplanung, Testamente, Auseinandersetzung — diskret und vorausschauend.', icon: '' },
        ]
    : kind === 'arzt'
      ? [
          { name: 'Allgemeinmedizin', description: 'Vorsorgeuntersuchungen, Akutbeschwerden, Impfungen — die ganze Familie in einer Hand.', icon: '' },
          { name: 'Diagnostik', description: 'EKG, Ultraschall, Labor — moderne Geräte, klare Befunde, ehrliche Erklärung.', icon: '' },
          { name: 'Vorsorge', description: 'Gesundenuntersuchung, Krebsvorsorge, Reisemedizin — Vorbeugen statt Nachsorgen.', icon: '' },
          { name: 'Chronische Erkrankungen', description: 'Langzeitbetreuung bei Diabetes, Bluthochdruck, Asthma — strukturiert und persönlich.', icon: '' },
          { name: 'Hausbesuche', description: 'Bei Bedarf kommen wir zu Ihnen — vor allem für ältere oder bewegungseingeschränkte Patient:innen.', icon: '' },
          { name: 'Gesundheitsberatung', description: 'Ernährung, Bewegung, Schlaf — wir besprechen, was wirklich hilft.', icon: '' },
        ]
    : kind === 'handwerk'
      ? [
          { name: 'Innenanstrich & Wandgestaltung', description: 'Wohnräume, Büros, Praxen — wir bringen Farbe ins Spiel, sauber und auf Termin.', icon: '' },
          { name: 'Fassaden & Außenanstrich', description: 'Wetterfeste Beschichtungen, Vollwärmeschutz, Dachanstrich.', icon: '' },
          { name: 'Tapezier- und Spachtelarbeiten', description: 'Vom klassischen Tapezieren bis zu modernen Spachtel- und Glättetechniken.', icon: '' },
          { name: 'Bodenbeläge', description: 'Vinyl, Laminat, Designboden — Verlegung mit gewerklicher Garantie.', icon: '' },
          { name: 'Renovierung & Sanierung', description: 'Alles aus einer Hand — wir koordinieren und liefern den Schlüssel zur fertigen Wohnung.', icon: '' },
          { name: '24-h-Notdienst', description: 'Wasserschaden, Schimmel, Sturmschaden — wir kommen schnell und planen den Wiederaufbau.', icon: '' },
        ]
    : kind === 'restaurant'
      ? [
          { name: 'Mittagsmenü', description: 'Wechselnde Wochenkarte mit 3 Vorschlägen — frisch, schnell, fair kalkuliert.', icon: '' },
          { name: 'Abendkarte', description: 'Saisonale Wirtshausküche aus regionalen Zutaten — herzhaft und ehrlich.', icon: '' },
          { name: 'Catering', description: 'Vom Familienfest bis zur Firmenfeier — wir kommen zu Ihnen oder beliefern Sie.', icon: '' },
          { name: 'Reservierung & Events', description: 'Ganztags reservierbar, geschlossene Gesellschaften für bis zu 60 Personen.', icon: '' },
          { name: 'Take-away', description: 'Vorbestellung per Telefon — abholbereit innerhalb von 20 Minuten.', icon: '' },
          { name: 'Weinkarte', description: 'Österreichische Tropfen aus regionalen Weingütern, glasweise zugänglich.', icon: '' },
        ]
    : kind === 'bestattung'
      ? [
          { name: 'Erstversorgung', description: '24-Stunden-Erreichbarkeit. Wir kommen zu Ihnen, wann immer es nötig ist.', icon: '' },
          { name: 'Trauerfeier-Gestaltung', description: 'Kirchlich, weltlich oder im Familienkreis — ganz nach Ihrem Wunsch.', icon: '' },
          { name: 'Erd- und Feuerbestattung', description: 'Sämtliche Bestattungsformen, einschließlich naturnaher Alternativen.', icon: '' },
          { name: 'Vorsorge', description: 'Bestattungsvorsorge zu Lebzeiten — Klarheit für die Familie, Selbstbestimmung für Sie.', icon: '' },
          { name: 'Behördengänge', description: 'Wir nehmen Ihnen die Formalitäten ab — Standesamt, Versicherungen, Renten.', icon: '' },
          { name: 'Trauerbegleitung', description: 'Auch nach der Trauerfeier sind wir für Sie und Ihre Familie da.', icon: '' },
        ]
    : kind === 'friseur'
      ? [
          { name: 'Haarschnitt Damen', description: 'Klassisch oder Avantgarde — präzise Schnitte, individuell auf Sie zugeschnitten.', icon: '', price: 'ab 49 €' },
          { name: 'Haarschnitt Herren', description: 'Klassik bis Fade — wir schneiden, was zu Ihnen passt.', icon: '', price: 'ab 32 €' },
          { name: 'Färben & Strähnen', description: 'Naturfarben, Ombré, Balayage — von dezent bis spektakulär.', icon: '', price: 'ab 89 €' },
          { name: 'Hochsteckfrisuren', description: 'Hochzeit, Ball, Festakt — Termin nach Vereinbarung.', icon: '', price: 'ab 79 €' },
          { name: 'Pflegebehandlungen', description: 'Olaplex, Keratin, Kopfhaut-Therapie für gesundes, kräftiges Haar.', icon: '', price: 'ab 39 €' },
          { name: 'Beratung pur', description: 'Typberatung, Stilberatung, Hair-Care-Routinen — 30 Minuten kostenfrei.', icon: '', price: 'gratis' },
        ]
    : kind === 'tier'
      ? [
          { name: 'Vorsorge & Impfungen', description: 'Impfpläne, Wurmkuren, Zeckenschutz — vorbeugend statt reagierend.', icon: '' },
          { name: 'Diagnostik', description: 'Labor, Röntgen, Ultraschall direkt in der Praxis — schnelle Befunde.', icon: '' },
          { name: 'Operationen', description: 'Kastrationen, Weichteil-OPs, Zahnsanierungen unter Vollnarkose.', icon: '' },
          { name: 'Notfälle', description: '24-h-Notdienst nach telefonischer Voranmeldung.', icon: '' },
          { name: 'Hausbesuche', description: 'Für ängstliche Tiere oder ältere Halter:innen — auf Wunsch zu Hause.', icon: '' },
          { name: 'Ernährungsberatung', description: 'Allergien, Übergewicht, Senior-Tiere — wir finden das passende Futterkonzept.', icon: '' },
        ]
    : kind === 'fitness'
      ? [
          { name: 'Krafttraining', description: 'Großzügiger Hantelbereich, Maschinen, Functional Zone — alles für ernsthaften Aufbau.', icon: '', price: 'ab 39 €' },
          { name: 'Yoga & Pilates', description: 'Klassen für alle Levels — Hatha, Vinyasa, Reformer-Pilates.', icon: '', price: 'ab 49 €' },
          { name: 'Personal Training', description: 'Individuell, ergebnisorientiert, mit zertifizierten Trainer:innen.', icon: '', price: 'ab 79 €' },
          { name: 'Ernährungsberatung', description: 'Realistische Pläne, keine Diäten — abgestimmt auf Ihren Trainingsalltag.', icon: '', price: '69 €' },
          { name: 'Probetraining', description: 'Kostenfrei und unverbindlich, mit persönlicher Einführung in alle Bereiche.', icon: '', price: 'gratis' },
          { name: 'Sauna & Wellness', description: 'Finnische Sauna, Dampfbad, Kaltwasserbecken — für die Regeneration nach dem Workout.', icon: '' },
        ]
    : kind === 'hotel'
      ? [
          { name: 'Doppelzimmer Komfort', description: 'Bergblick, Holzboden, Dusche/WC, ab 95 €/Nacht inkl. Frühstück.', icon: '', price: 'ab 95 €' },
          { name: 'Suite mit Balkon', description: 'Wohn-/Schlafraum, Kingsize, freistehende Wanne — für besondere Anlässe.', icon: '', price: 'ab 165 €' },
          { name: 'Familienzimmer', description: 'Bis zu 5 Personen, separates Kinderzimmer, Spielecke im Garten.', icon: '', price: 'ab 145 €' },
          { name: 'Frühstücksbuffet', description: 'Regionale Spezialitäten, hausgebackenes Brot, Frischmilch vom Bauernhof.', icon: '', price: '18 €' },
          { name: 'Restaurant à la carte', description: 'Geöffnet auch für externe Gäste — saisonal, mit eigener Weinkarte.', icon: '' },
          { name: 'Wellness-Bereich', description: 'Sauna, Infrarotkabine, Ruheraum mit Bergblick — kostenfrei für Hausgäste.', icon: '' },
        ]
    : kind === 'einzelhandel'
      ? [
          { name: 'Damenmode', description: 'Internationale Marken, kuratiert für unsere Region. Saisonal wechselnd.', icon: '' },
          { name: 'Herrenmode', description: 'Klassik bis Casual — von der Jeans bis zum Hochzeitsanzug.', icon: '' },
          { name: 'Accessoires', description: 'Taschen, Schals, Schmuck — die Details, die alles verändern.', icon: '' },
          { name: 'Persönliche Beratung', description: 'Stilberatung, Maßanpassung — Termine nach Vereinbarung.', icon: '' },
          { name: 'Maßänderungen', description: 'Hausschneiderei direkt im Geschäft — meist innerhalb von 5 Werktagen.', icon: '' },
          { name: 'Geschenkservice', description: 'Geschenkverpackung, Lieferung in der Region, Gutscheine in jeder Höhe.', icon: '' },
        ]
    : kind === 'galerie'
      ? [
          { name: 'Hochzeitsfotografie', description: 'Reportage-Stil, ungestellt — wir fangen den Moment, nicht die Pose.', icon: '', price: 'ab 1.490 €' },
          { name: 'Portrait & Business', description: 'LinkedIn-Headshots, Bewerbungsfotos, Familienportraits — im Studio oder bei Ihnen.', icon: '', price: 'ab 290 €' },
          { name: 'Produktfotografie', description: 'Für Onlineshops, Kataloge, Werbekampagnen. Mit oder ohne Models.', icon: '', price: 'auf Anfrage' },
          { name: 'Eventfotografie', description: 'Firmenfeiern, Vereinsfeste, Konferenzen — diskret und durchgehend.', icon: '', price: 'ab 590 €' },
          { name: 'Videoproduktion', description: 'Imagefilme, Social-Media-Reels, Hochzeitsvideos — von der Idee bis zum Schnitt.', icon: '' },
          { name: 'Fotoworkshops', description: 'Einsteiger und Fortgeschrittene — Theorie + Praxis in kleinen Gruppen.', icon: '', price: 'ab 149 €' },
        ]
    : kind === 'autohaus'
      ? [
          { name: 'Neuwagen', description: 'Aktuelle Modelle aller Hauptmarken, ab Lager oder konfigurierbar.', icon: '' },
          { name: 'Junge Gebrauchte', description: 'Höchstens 3 Jahre alt, scheckheftgepflegt, mit 12 Monaten Garantie.', icon: '' },
          { name: 'Service & Reparatur', description: 'Markenwerkstatt mit Originalteilen — für alle gängigen Hersteller.', icon: '' },
          { name: '§57a-Begutachtung', description: 'Pickerl direkt vor Ort, ohne Voranmeldung in den meisten Fällen.', icon: '' },
          { name: 'Finanzierung & Leasing', description: 'Über alle Hausbanken — auch flexibles Restwert-Leasing.', icon: '' },
          { name: 'Probefahrten', description: 'Auch über das Wochenende — Termin online oder telefonisch.', icon: '' },
        ]
    : kind === 'energie'
      ? [
          { name: 'Photovoltaik', description: 'Komplettpaket Hausdach, Carport oder Freifläche — inkl. Förderabwicklung.', icon: '' },
          { name: 'Wärmepumpe', description: 'Luft/Wasser, Sole/Wasser — passend dimensioniert für Ihr Gebäude.', icon: '' },
          { name: 'Stromspeicher', description: 'Damit Ihr Sonnenstrom auch nachts arbeitet — 5–20 kWh-Systeme.', icon: '' },
          { name: 'E-Mobilität', description: 'Wallbox-Installation, optional in Verbindung mit Ihrer PV-Anlage.', icon: '' },
          { name: 'Förderberatung', description: 'Bund, Land, Gemeinde — wir wickeln alle Förderanträge für Sie ab.', icon: '' },
          { name: 'Wartung & Monitoring', description: 'Jährliche Wartung, 24/7-Online-Monitoring, Reaktion auf Störungen.', icon: '' },
        ]
    : kind === 'standard'
      ? [
          { name: 'Strategie & Beratung', description: 'Wir hören zu, fragen nach, schlagen vor. Erstgespräch immer kostenfrei und ohne Verpflichtung.', icon: '' },
          { name: 'Konzeption', description: 'Klarer Plan auf einem Blatt — was, wie, bis wann. Kein versteckter Aufwand, keine Überraschungen.', icon: '' },
          { name: 'Umsetzung', description: 'Wir arbeiten in kurzen, sichtbaren Iterationen. Sie sehen Fortschritt, bevor wir abrechnen.', icon: '' },
          { name: 'Begleitung', description: 'Auch nach dem Projektende sind wir Ansprechpartner — schnelle Reaktion, ehrliche Beratung.', icon: '' },
          { name: 'Schulung', description: 'Wir machen Sie und Ihr Team selbstständig — auf Wunsch in Workshops oder vor Ort.', icon: '' },
          { name: 'Wartung & Pflege', description: 'Regelmäßige Updates, Sicherheits-Checks, kleinere Anpassungen — fair kalkuliert.', icon: '' },
        ]
      : [
          { name: 'Leistung 1', description: 'Kurze Beschreibung der ersten Leistung — branchenspezifisch in der finalen Version.', icon: '✓' },
          { name: 'Leistung 2', description: 'Zweite Hauptleistung mit Fokus auf den Kundennutzen.', icon: '✓' },
          { name: 'Leistung 3', description: 'Dritte Leistung — was den Betrieb besonders macht.', icon: '✓' },
          { name: 'Leistung 4', description: 'Vierte Leistung — Premium-Angebot oder Spezialität.', icon: '✓' },
          { name: 'Leistung 5', description: 'Beratung & Vor-Ort-Termin — kostenlos und unverbindlich.', icon: '✓' },
          { name: 'Leistung 6', description: 'Service & Wartung — wir bleiben Ansprechpartner nach dem Auftrag.', icon: '✓' },
        ],
    testimonials: [
      { quote: 'Schnell, freundlich, kompetent — wir kommen seit Jahren gerne hierher.', author: 'Maria K.' },
      { quote: 'Beste Erfahrung in der Region. Klare Empfehlung.', author: 'Thomas H.' },
    ],
    contact: {
      phone: '+43 662 123 456',
      email: 'kontakt@beispiel.at',
      address: 'Musterstraße 1, 5020 Salzburg',
      cta_text: 'Anfrage senden',
    },
    footer: {
      tagline: m.tagline,
      links: [{ label: 'Impressum', href: '/impressum' }, { label: 'Datenschutz', href: '/datenschutz' }],
    },
    brand: {
      primary_color: COLORS[kind],
      font_style: kind === 'kanzlei' || kind === 'bestattung' ? 'classic'
                : kind === 'galerie' ? 'bold'
                : kind === 'tier' || kind === 'verein' ? 'friendly'
                : 'modern',
      tone: kind === 'bestattung' ? 'empathic, calm'
          : kind === 'kanzlei' ? 'professional, precise'
          : kind === 'tier' ? 'warm, caring'
          : 'professional',
    },
    menu: kind === 'restaurant' ? [
      { category: 'Vorspeisen', items: [
        { name: 'Frittatensuppe', description: 'Klare Rindssuppe mit hausgemachten Frittaten', price: '5,50 €' },
        { name: 'Beef Tatar', description: 'Vom Salzburger Rind mit Toastecken', price: '12,80 €' },
      ]},
      { category: 'Hauptspeisen', items: [
        { name: 'Wiener Schnitzel', description: 'Vom Kalb mit Petersilkartoffel und Preiselbeeren', price: '18,90 €' },
        { name: 'Backhendl', description: 'Klassisch paniert mit Kartoffel-Vogerlsalat', price: '15,90 €' },
        { name: 'Tafelspitz', description: 'Mit Rösterdäpfeln, Apfelkren und Schnittlauchsoße', price: '21,50 €' },
      ]},
    ] : undefined,
    opening_hours: kind === 'restaurant' || kind === 'einzelhandel' || kind === 'arzt' || kind === 'friseur' || kind === 'tier'
      ? [
          { day: 'Mo–Fr', hours: '08:00 – 18:00' },
          { day: 'Sa', hours: '09:00 – 13:00' },
          { day: 'So', hours: 'geschlossen' },
        ]
      : undefined,
    emergency: kind === 'handwerk' || kind === 'bestattung' || kind === 'tier'
      ? { available: true, phone: '+43 662 999 000', note: '24/7 Notdienst — wir sind für Sie erreichbar.' }
      : undefined,
    events: kind === 'verein'
      ? [
          { date: '01.05.2026', title: 'Maibaumfest', description: 'Traditionelles Maibaumaufstellen am Dorfplatz, ab 10 Uhr mit Frühschoppen.' },
          { date: '15.06.2026', title: 'Frühschoppen', description: 'Konzert auf dem Dorfplatz, 11 Uhr — anschließend gemütliches Beisammensein.' },
          { date: '02.08.2026', title: 'Sommerkonzert Open-Air', description: 'Im Park beim Vereinsheim — bei Schlechtwetter im Festsaal.' },
          { date: '14.10.2026', title: 'Herbstkonzert', description: 'Festsaal des Vereinshauses, Eintritt frei — mit Solisten unserer Jugendkapelle.' },
          { date: '07.12.2026', title: 'Adventkonzert', description: 'Ortspfarrkirche, 18:00 Uhr — besinnliche Klänge im Advent.' },
          { date: '15.12.2026', title: 'Weihnachtsblasen', description: 'Tour durch die Ortsteile — wir bringen die Festtage zu Ihnen nach Hause.' },
        ]
      : undefined,
    // Verein-only: Vorstand-Section (TS workaround via cast)
    ...(kind === 'verein' ? {
      team: [
        { name: 'Mag. Franz Huber', role: 'Obmann', seed: 'verein-obmann' },
        { name: 'Maria Steiner', role: 'Stellvertreterin', seed: 'verein-stv' },
        { name: 'Andreas Lechner', role: 'Kapellmeister', seed: 'verein-kapellmeister' },
        { name: 'Thomas Bauer', role: 'Kassier', seed: 'verein-kassier' },
        { name: 'Lisa Mayrhofer', role: 'Schriftführerin', seed: 'verein-schrift' },
        { name: 'Stefan Berger', role: 'Jugendreferent', seed: 'verein-jugend' },
      ],
    } as object : {}),
    membership: kind === 'verein'
      ? { cta: 'Jetzt Mitglied werden', description: 'Förder- oder aktive Mitgliedschaft ab 30 € im Jahr — wir freuen uns auf Sie!' }
      : kind === 'fitness'
      ? { cta: 'Probetraining buchen', description: 'Erstes Training kostenlos. Mitgliedschaft ab 39 € / Monat, jederzeit kündbar.' }
      : undefined,
  } as SiteSpec);
}

function runAstroBuild(projectDir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('npx', ['astro', 'build'], { cwd: projectDir, stdio: 'inherit' });
    proc.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`astro build exited ${code}`))));
    proc.on('error', reject);
  });
}

async function buildOne(kind: LayoutKind): Promise<void> {
  const stamp = Date.now();
  const fakeId = -1 * stamp; // negative so it cannot collide with real prototype_version_id
  const slug = `demo-${kind}`;
  // SLUG_RE: ^[a-z0-9][a-z0-9-]{0,99}$ — enforced by build pipeline.
  const spec = baseSpec(kind);

  console.log(`\n┌─ Building demo: ${kind} (${spec.business_name})`);
  const projectDir = await scaffoldAstroProject(fakeId, spec, slug);

  console.log(`│  scaffolded → ${projectDir}`);
  // Astro needs deps. We assume node_modules already exists in projects dir parent (built once).
  // For robustness, run npm install if missing.
  try {
    await new Promise<void>((res, rej) => {
      const p = spawn('npm', ['install', '--silent', '--no-audit', '--no-fund'], { cwd: projectDir, stdio: 'inherit' });
      p.on('close', (c) => (c === 0 ? res() : rej(new Error(`npm install exit ${c}`))));
    });
    await runAstroBuild(projectDir);
  } catch (e) {
    console.error(`└─ FAILED: ${kind}: ${(e as Error).message}`);
    return;
  }

  const target = join(ARTIFACTS_DIR, slug);
  await rm(target, { recursive: true, force: true });
  await mkdir(ARTIFACTS_DIR, { recursive: true });
  await rename(join(projectDir, 'dist'), target);
  console.log(`└─ ✓ deployed → ${target}`);
}

async function main() {
  const arg = process.argv[2] as LayoutKind | undefined;
  const targets: LayoutKind[] = arg ? [arg] : ALL;

  await mkdir(PROJECTS_DIR, { recursive: true });
  await mkdir(ARTIFACTS_DIR, { recursive: true });

  for (const kind of targets) {
    await buildOne(kind);
  }
  console.log(`\n✓ Done — ${targets.length} demo${targets.length === 1 ? '' : 's'} built.`);
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
