# Verein-Vorschau Redesign — Plan

**Datum:** 2026-05-11 · **Status:** Recherche fertig, Implementierung offen

---

## Ausgangslage (visuell + datentechnisch)

Aktueller Stand der deployed Musikvereins-Vorschau ([demo-mv-puchkirchen](https://demo-mv-puchkirchen.webseiten-werkstatt.at/)):

- 5 sichtbare Blöcke: **Demo-Banner · Nav · Hero · "Über uns" (1 Absatz Dropcap) · Anfahrt · Kontakt · Footer**
- 70% der Seite ist weißraum/leer-Fläche
- Hero rechts: großer leerer grüner Bereich (das hardcodierte `hero-crest-xl` Fallback wenn kein Hero-Bild)
- Logo links oben: pixelige 56×56-Mini-Grafik
- 1 Hardcoded Vereinsfarbe (Evergreen+Brass), egal ob der Verein eigentlich rot/blau/lila ist
- 1 Hardcoded Schrift-Paar (Fraunces + Lora), egal welche Schrift die Originalseite verwendet

## Drei parallel laufende Research-Spuren (alle abgeschlossen)

### A. Best-in-Class Music-Club-Sites (Berliner Phil, Cliburn, BSO, LA Phil, Concertgebouw…)
Top-Patterns die wir nicht haben:
1. 100vh Hero mit Video/Photo + Display-Tagline + Mute-Control
2. Drei datierte Termin-CTAs ("Probe Mi 19:30 / Konzert Sa 20:00")
3. "Stories"-Editorial-Karten zwischen Hero und Kontakt
4. Photographer-Credit unter Fotos (Signal für Professionalität)
5. Per-Sektion Background-Switches (white → carbon → cream)
6. Mixed Serif Display + Sans Body (statt unser Serif+Serif)
7. Pull-Quote-Section mit großem Zitat + Portraet-Thumb
8. Tabbed Collections ("Repertoire / Konzerte / Probetermine")
9. Education/Nachwuchs-Block (Jugendorchester)
10. Mission-Statement-Block + Sponsor-Logo-Strip vor Footer

### B. Editorial/Magazine 2025-26 Awwwards-Pattern (Locomotive, Renaissance Edition, Lando Norris, Whitney…)
Top-Patterns mit höchstem Visual-Impact pro Aufwand:
1. **Display-Serif** für Hero (PP Editorial New / GT Sectra) — pure CSS-Swap
2. `clamp(3rem, 9vw, 10rem)` Hero-Sizes, `letter-spacing: -0.02em`
3. **Per-Sektion Background-Color-Switch** (Renaissance-Edition Pattern)
4. 2 Farben + 1 Akzent (Beige-Mono = out)
5. Asymmetrischer Hero ohne Stock-Bild
6. Big-Number Anchors ("01 / 02 / 03") zwischen Sektionen
7. Marquee-Strip mit Vereinswerten
8. XXL-Footer mit Wordmark + 1 CTA statt 4-Spalten
9. Magnetic CTA Buttons
10. Sticky Section-Title

### C. Code-Audit der Verein-Templates (intern)
Größte gefundene Mängel:
1. **HIGH**: `verein-musik.ts:83-95` hardcoded `--primary: #2d4a32` ignoriert `spec.brand?.primary_color`. `verein-sport.ts` macht es richtig — Inkonsistenz!
2. **HIGH**: `board = []` (Zeile 63) hartcodiert leer → ganze Vorstand-Sektion (Z. 800-819, ~20 Zeilen Markup + 18 Zeilen CSS) rendert nie.
3. **HIGH**: ~280 Zeilen toter CSS in verein-musik.ts (Membership-Tiers, Ensembles, Instrumente, Meilensteine, Probe-Einladung) — Markup wurde entfernt, CSS blieb.
4. **HIGH**: Hero-Fallback (Z. 199-248) rendert "großen goldenen Kreis rechts" als Cresent — sieht wie Bug aus.
5. **MEDIUM**: Hardcoded Wordings ("Über uns", "Wann Sie uns erleben können", "Die Köpfe hinter dem Klang") sind statische deutsche Strings ohne Datenbezug.
6. **MEDIUM**: 4 Verein-Templates duplizieren CSS (~250 Zeilen × 4) für Nav, Burger, Buttons, Demo-Banner → kein gemeinsames Shell.

### D. Eigenes Data-Leakage-Audit
**Wir scrapen massiv mehr Daten als wir visualisieren.** Das ist der größte einzelne Hebel:

| Feld | Scrape? | RebuildPkg? | SiteSpec? | Template nutzt? |
|---|---|---|---|---|
| `brand.secondary_color` | ✅ | ✅ | ❌ | ❌ |
| `brand.accent_color` | ✅ | ✅ | ❌ | ❌ |
| `brand.heading_font_family` | ✅ | ✅ | ❌ | ❌ |
| `brand.body_font_family` | ✅ | ✅ | ❌ | ❌ |
| `brand.font_imports` (Google Fonts) | ✅ | ✅ | ❌ | ❌ |
| `extracted.nav_links` | ✅ | ❌ ! | ❌ | ❌ |
| `extracted.socials` (FB/IG/YouTube) | ✅ | ✅ | (Type-only) | ❌ |
| `business.rating` (Google ★) | ✅ | ✅ | ❌ | ❌ |
| `business.review_count` | ✅ | ✅ | ❌ | ❌ |
| `screenshots[]` (Original-Page) | ✅ | ✅ | ❌ | ❌ |

→ Jeder dieser 10 Punkte ist eine offene Tür: Vereinsfarbe rot? Wir zeigen grün. Originalseite nutzt Source Sans Pro? Wir zeigen Fraunces. Verein hat 4.8★/47 Bewertungen? Wir verstecken das. Verein hat Instagram-Strom mit Konzerten? Wir ignorieren ihn.

---

## Zielbild

Jede generierte Verein-Vorschau zeigt:
- **Eigene Brand-Identität** (gescrapte primary+secondary+accent, gescrapte Schrift)
- **Mindestens 7-9 sichtbare Sektionen** (statt heute 3-4), inkl. echte Fallback-Sektionen wenn Daten fehlen
- **Editorial-Premium-Optik** mit Display-Serif, Color-Switch, Big-Number-Anchors, Marquee
- **Trust-Elemente** (Google-Rating-Badge im Hero, Photographer-Credits, Social-Strip im Footer)
- **Verein-spezifischen Charakter** (Musik vs Sport vs Tradition unterschiedliche Wordings, Eyebrows, CTAs)

---

## Implementierungsplan — 5 Phasen

### Phase 1 — Daten-Leakage schließen ("Brand-Identity-Lüge fixen")
**Aufwand: 1 Tag · Visual-Impact: HOCH (jede Seite plötzlich farblich + typografisch eigen)**

#### 1.1 SiteSpec erweitern
- `generator/src/types.ts`: `SiteSpec.brand` um `secondary_color`, `accent_color`, `heading_font_family`, `body_font_family`, `font_imports[]` erweitern
- `SiteSpec.business` um `rating`, `review_count` erweitern
- Neue `SiteSpec.socials?: Record<string, string>` (toplevel, nicht nested in contact)
- Neue `SiteSpec.media.screenshots?: string[]`

#### 1.2 Orchestrator durchreichen
- `generator/src/orchestrator.ts`: `pkg.brand.secondary_color → baseSpec.brand.secondary_color`, dito accent, fonts
- `pkg.extracted.socials → baseSpec.socials`
- `pkg.business.rating → baseSpec.business.rating` (neue Spec-Sub-Section)
- `pkg.screenshots → baseSpec.media.screenshots`

#### 1.3 PHP-RebuildPackageBuilder ergänzen
- `app/Domain/Scraping/RebuildPackageBuilder.php`: `nav_links` ins package schreiben (wird gescrapt, war nie im pkg!)

#### 1.4 Templates konsumieren
- `verein-musik.ts:78-95` Theme-Root umstellen:
  ```css
  --primary: ${spec.brand?.primary_color || '#2d4a32'};
  --primary-deep: color-mix(in oklch, ${spec.brand?.primary_color || '#2d4a32'} 70%, black);
  --primary-soft: color-mix(in oklch, ${spec.brand?.primary_color || '#2d4a32'} 15%, white);
  --secondary: ${spec.brand?.secondary_color || 'var(--primary)'};
  --accent: ${spec.brand?.accent_color || '#b8893d'};
  --display: ${spec.brand?.heading_font_family ? `'${spec.brand.heading_font_family}', Georgia, serif` : "'Fraunces', Georgia, serif"};
  --serif: ${spec.brand?.body_font_family ? `'${spec.brand.body_font_family}', Georgia, serif` : "'Lora', Georgia, serif"};
  ```
- Font-Imports im `<head>` aus `spec.brand?.font_imports` rendern (statt hardcoded Bunny-Fonts)
- Dito für `verein-sport.ts`, `verein-tradition.ts`, `verein.ts` (Konsistenz!)

#### 1.5 Trust-Elemente sichtbar machen
- **Rating-Badge im Hero**: wenn `spec.business?.rating >= 4.0` und `review_count >= 5` → ★★★★★ 4.8 (47 Bewertungen) als Pill unter Hero-Subhead
- **Social-Strip im Footer**: wenn `spec.socials` nicht leer → SVG-Icons (Facebook/Instagram/YouTube) als minimaler Strip oberhalb des Footer-Bottom

**Erwartung**: Jede Vereins-Vorschau ist plötzlich farblich + typografisch + sozial individuell. Drei Musikvereine sehen unterschiedlich aus — heute sehen sie identisch aus.

---

### Phase 2 — Toten Code raus + Hero-Fallback fixen
**Aufwand: ½ Tag · Visual-Impact: MITTEL (Hero hört auf wie Bug auszusehen)**

#### 2.1 Tote CSS-Sektionen löschen (verein-musik.ts)
- Z. 341-375: `.tier`, `.tiers` (Membership-Tiers, Kommentar "legacy — no longer rendered")
- Z. 445-471: `.ensemble`, `.ensembles-*` (Markup wurde Z. 758-760 entfernt)
- Z. 473-488: `.instr`, `.instruments-*`
- Z. 490-525: `.milestones-*` (Timeline)
- Z. 413-423: `.probe-call`

**Ergebnis**: -280 Zeilen, kleinerer CSS-Footprint, klare Datei-Struktur.

#### 2.2 Hero-Fallback ersetzen (verein-musik.ts:199-248)
**Bisher (Bug-Look)**:
- Wenn kein Hero-Bild → großer Gold-Kreis mit 2 Initialen rechts

**Neu (Editorial-Look)**:
- Wenn kein Hero-Bild → Vereinsname in `clamp(4rem, 14vw, 12rem)` Display-Serif als Big-Type-Wordmark
- Darunter Gründungsjahr (aus regex `seit \d{4}` oder `\d{4} gegründet` aus text_content) als Animated-Counter
- 3 horizontale Brand-Color-Streifen am unteren Hero-Rand (primary, secondary, accent)
- Hero-BG: `linear-gradient(135deg, var(--primary-deep), var(--primary))` — kein Kreis mehr

#### 2.3 `board = []` entscheiden
- **Option A** (sauber): board-Sektion komplett aus Template raus (Markup + CSS), bis wir echte Daten haben
- **Option B** (Schein-Mehrwert): wenn `phone`/`email` da → "So erreichen Sie den Vorstand"-Card als formellen 2-Reihen-Block (Obmann/Schriftführer mit Phone/Email)

Empfehlung: **A**. Tote Sektionen wirken schlimmer als fehlende.

#### 2.4 Hardcoded Wordings flexibilisieren
- "Über uns" / "Wer wir sind" → bleibt (universell)
- "Wann Sie uns erleben können" → category-conditional: Musik = "erleben können", Sport = "spielen sehen", Tradition = "begegnen können"
- "Schreiben Sie uns einfach" → bleibt (universell)
- Italic-Trick im Hero (Z. 697): durch deterministische Variante ersetzen (letzte 2 Wörter italic, nicht regex-Schwanz)

---

### Phase 3 — Editorial-Premium-Patterns einbauen
**Aufwand: 2-3 Tage · Visual-Impact: SEHR HOCH (von "billig" auf "Awwwards-tauglich")**

#### 3.1 Display-Serif Hero-Typo upgraden
- Font-Stack: `'PP Editorial New', 'GT Sectra', 'Fraunces', Georgia, serif` (free fallbacks)
- Hero h1: `font-size: clamp(2.5rem, 9vw, 8rem); letter-spacing: -0.025em; line-height: 0.95; font-weight: 500`
- Bei langen Vereinsnamen (> 2 Zeilen): automatisch auf `font-size: clamp(2rem, 6vw, 5rem)` reduzieren

#### 3.2 Per-Sektion Color-Switch (das größte Visual-Pattern 2026)
- Pro Sektion `data-bg="parchment|carbon|primary-tint"` Attribut
- 3 Themen: warm-Parchment `#EBE4D2`, deep-Carbon `#1A1714`, Vereinsfarbe-Tint `color-mix(in oklch, var(--primary) 10%, white)`
- IntersectionObserver toggelt CSS var auf `<body>`, sanfter `transition: background-color 600ms`
- Rhythmus: Hero=Dark · Events=Parchment · About=Carbon · Stories=Parchment · Gallery=Dark · Membership=Primary-Tint · Contact=Parchment

#### 3.3 Big-Number Anchors zwischen Sektionen
- Vor jeder Hauptsektion: `<span class="section-anchor">01</span>` in `font-size: clamp(8rem, 20vw, 18rem); -webkit-text-stroke: 1px var(--accent); color: transparent;`
- Pacing-Element, das die Seite "magazinig" macht

#### 3.4 Marquee-Strip
- Eine horizontale Endlos-Animation zwischen Hero und ersten Sektion
- Inhalt aus gescrapten Daten: "Seit 1923 · Gemeinschaft · Tradition · Musik · Oberösterreich · Konzerte · Mitgliedschaft · Probelokal Puchkirchen ·"
- CSS-only: `@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }`

#### 3.5 Pull-Quote-Sektion (statt Mission-Quote-Bug)
- Großes editorial-Zitat aus 2. Satz von `about.body` (falls != subhead)
- `font-family: var(--display); font-size: clamp(2rem, 5vw, 4rem); line-height: 1.3; font-style: italic;`
- Attribution-Zeile rechts unten: "— Musikverein Puchkirchen"
- Background: `var(--primary)` mit weißer Schrift (Color-Switch)

#### 3.6 XXL-Footer (Big-Wordmark)
- Vereinsname als 18vw-Wortmark in oklch(98%) auf `var(--primary-deep)` BG
- Darunter EIN großer CTA "Mitglied werden →" als Magnetic-Button (`clamp(1.2rem, 2vw, 1.8rem)`)
- Thin Link-Row darunter: Impressum · Datenschutz · Demo erstellt von Webagentur Hochmeir
- Social-Icons-Strip rechts oben (Facebook/Instagram/YouTube)

#### 3.7 "Stories"-Editorial-Karten aus redesigned_sections
- Wenn `spec.redesigned_sections.length >= 2` → 2-Spalten-Magazine-Grid mit großem Foto-Thumb + Lead-Satz + Pull-Quote
- Statt heutiger linearer Editorial-Stream

---

### Phase 4 — Section-Factory + Shared-Shell (Architektur)
**Aufwand: 2 Tage · Visual-Impact: keiner direkt — aber 4× schnellere zukünftige Patterns**

#### 4.1 `_verein_shell.ts` extrahieren
Gemeinsamer Code aller 4 verein-Templates:
- Nav (Burger, sticky, brand-mark)
- Demo-Banner
- Footer-Grundgerüst
- Button-Stile (.btn-primary, .btn-outline)
- Color-Token-System (CSS vars)

#### 4.2 Section-Library
Jede Sektion als Funktion `renderEventsSection(spec)`, `renderGallerySection(spec)`, etc. Templates komponieren nur noch:
```ts
return shell({
  brand: spec.brand,
  body: [
    renderHero(spec),
    renderMarquee(spec),
    renderEventsOrFallback(spec), // Fallback ist hier zentral
    renderAboutWithPullQuote(spec),
    renderRedesignedStoriesOrFallback(spec),
    renderGalleryOrMagazinePair(spec),
    renderMembershipOrCTA(spec),
    renderContact(spec),
  ]
});
```

#### 4.3 Conditional Section-Library (Fallbacks)
- `renderEventsOrFallback` → wenn keine Events: Marquee "Nächste Termine: in Vorbereitung"
- `renderGalleryOrMagazinePair` → 0 Bilder = Pull-Quote-Block, 1-2 Bilder = Magazine-Pair (großes Bild + Quote), ≥3 Bilder = Grid
- `renderMembershipOrCTA` → wenn keine membership: generic "Werden Sie Teil von uns"-Block mit Phone+Email
- Nie weiße Lücke, immer visuell besetzt

---

### Phase 5 — Smart-Inhalte (LLM-light Heuristiken)
**Aufwand: 1-2 Tage · Visual-Impact: HOCH (Inhalte plötzlich Verein-spezifisch)**

#### 5.1 Vereinswerte extrahieren für Marquee
- Aus `text_content` keyword-extract: häufige Substantive (Tradition, Gemeinschaft, Musik, Konzert, Region, Probe) — kein LLM, einfach top-N nach Vorkommen mit Stopword-Filter
- → Marquee-Strip

#### 5.2 Vorstand aus testimonials oder text_content
- Regex `/(obmann|kapellmeister|vorstand|kassier|schriftführer|präsident|trainer):\s*([\w\s\-äöüÄÖÜß]+)/gi` über text_content
- Wenn Match → `board[]` befüllen mit Name+Rolle
- Erst dann Board-Sektion rendern

#### 5.3 Gründungsjahr für Hero-Counter
- Regex `\b(seit |gegründet (im jahr )?|gründungsjahr:?)(\d{4})\b` über text_content
- Wenn Match → `spec.founded_year`
- Hero: Animated Counter "1923 — seit 103 Jahren"

#### 5.4 Datums-Match für Event-Fallback
- Regex über text_content nach typischen Konzert-Patterns: `\b(\d{1,2})\.\s*(jänner|februar|...|dezember)\s*(\d{4})?`
- Wenn 1+ Treffer → `spec.events[]` mit `{date, title: 'Konzert', description: gefundenerKontext}`
- Lieber 1 echtes Datum als generische "kommende Termine"-Floskel

---

## Kritische Pfade / Dateien

| Phase | Dateien | LoC ~ |
|---|---|---|
| 1 | `generator/src/types.ts`, `orchestrator.ts`, `templates/verein-*.ts` (4×), `RebuildPackageBuilder.php`, `_seo.ts` | ~150 |
| 2 | `verein-musik.ts` (Cleanup + Hero-Fallback) | ~100 (davon -280 toter CSS) |
| 3 | `verein-musik.ts`, neue `_marquee.ts`, `_pullquote.ts`, `_bignumber.ts`, `_colorswitch.ts` | ~600 |
| 4 | Neue `_verein_shell.ts`, `_sections_library.ts`; alle 4 templates auf composition umstellen | ~900 (davon -800 dupliziert) |
| 5 | `orchestrator.ts` (Regex-Extraktoren), `types.ts` (founded_year, board) | ~150 |

## Reihenfolge (Empfehlung)

**Iteration 1 (3 Tage = Phase 1+2)**: Brand-Identity-Lüge fixen + tote Sektionen raus + Hero-Fallback fixen. Schon das hebt das visuelle Niveau **deutlich**.

**Iteration 2 (3 Tage = Phase 3)**: Editorial-Premium-Patterns (Color-Switch, Big-Numbers, Marquee, Pull-Quote, XXL-Footer). **Hier liegt der "Awwwards"-Sprung.**

**Iteration 3 (3 Tage = Phase 4+5)**: Architektur-Bereinigung + Smart-Heuristiken. Macht zukünftige Iterationen 4× schneller und gibt Vereinen plötzlich echte Vorstands-/Event-/Werte-Inhalte.

## Verifikation pro Iteration

1. **Lokal generieren** für 5 verschiedene Vereine (Musik, Sport, Tradition, generic, eines mit sehr dünner Datenlage)
2. **Chrome 1440 + 390 (mobile)** Screenshots aller 5 → visueller Vergleich vorher/nachher
3. **Tests**: `php artisan test` grün halten, `tsc --noEmit` clean
4. **code-review + security-guidance** über alle geänderten Dateien (per CLAUDE.md)
5. **Deploy** auf 185.51.10.235 (rsync + supervisorctl restart) — user-bestätigt
6. **Production-Smoke**: alle 5 Vorschau-URLs HTTP 200 + Sichtprüfung in Chrome

---

## Was wir NICHT angehen (bewusst)

- KEIN Live-LLM für Content-Generierung (deterministisch bleiben — User-Vorgabe, Cost-Control)
- KEIN Custom Cursor / Magnetic Buttons mit JS-Lib (Phase 6+, optional)
- KEIN echtes Video-Hero (kein Material vorhanden)
- KEINE Erfundenen Inhalte (Vorstandsnamen, Konzertdaten) — nur was scrapebar ist

---

## Quick-Win-Subset (wenn nur 1 Tag Zeit ist)

Pick: Phase 1 Punkte 1.4 (Brand-Color durchsetzen) + 1.5 (Rating-Badge) + Phase 2.2 (Hero-Fallback) + Phase 3.1 (Display-Serif Hero). **4-5 Stunden, eklatanter Unterschied.**
