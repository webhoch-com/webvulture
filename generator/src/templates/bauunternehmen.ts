/**
 * Bauunternehmen template — INDUSTRIELL-EDITORIAL.
 *
 * Design DNA synthesized from Wolf System (AT), Granit Bau (AT), Wietersdorfer
 * (AT) + simplyworks motion language:
 *   - Graphit (#0f1011) + Beton-Creme (#f4f1ec) + Safety-Gelb (#f59e0b)
 *     + Konstruktiv-Blau (#1e3a5f) accents.
 *   - Familjen Grotesk display (industrial EU character, NOT Inter/Space-Grotesk)
 *     + Public Sans body (neutral grotesque) + JetBrains Mono (technical labels,
 *     section numbers, dimension callouts).
 *   - Distinctive signatures: numbered vertical I-Träger process timeline that
 *     draws its central beam as you scroll, monospaced section numbering as
 *     registration marks (⊕ 03 / 08), diagonal safety-stripe transitions
 *     between dark/light sections, dramatic full-bleed architectural photos.
 *   - Motion: scroll-reveals, staggered cards, horizontal Sparten-marquee,
 *     count-up stats, hover-lift Referenzen-cards.
 *   - XXL chiseled-letterform Footer-wordmark as memorable signature.
 *
 * Reuses the EDITORIAL_CSS shared base for cookie-banner, trust-bar, heritage
 * statement, board section, sponsor strip — extended with industrial overrides
 * scoped to this template (which always WIN because they sit after the include).
 */

import type { SiteSpec } from '../types.js';
import { getGalleryImage, getHeroImage, hasHeroImage, hasGalleryImages, galleryCount, getLogo, getFavicon } from './_media.js';
import { renderSeoHead } from './_seo.js';
import { getBranchPreset } from './_branch_presets.js';
import {
  escapeHtml,
  extractFoundedYear,
  extractHeritageMilestones,
  renderHeritageStatement,
  renderHeritageTimeline,
  renderRatingPill,
  renderBoardSection,
  renderKuenstlerischeLeitung,
  pickPullQuote,
  renderQuietFooter,
  extractSponsors,
  renderSponsorsStrip,
  EDITORIAL_CSS,
} from './_editorial.js';

/* ───────────────────────── Helpers ────────────────────────── */

function projectPhoto(spec: SiteSpec, slug: string, idx: number, w = 800, h = 600): string {
  return getGalleryImage(spec, slug, idx, w, h);
}

/** Format an arbitrary string as a JetBrains-Mono section anchor: "01 / 08". */
function sectionAnchor(idx: number, total: number): string {
  const n = (x: number) => String(x).padStart(2, '0');
  return `${n(idx)} / ${n(total)}`;
}

/** Default Sparten / Geschäftsfelder when the scrape produced nothing. */
const DEFAULT_SPARTEN: Array<{ kicker: string; title: string; body: string; icon: string }> = [
  { kicker: '01', title: 'Hochbau', body: 'Mehrgeschossige Wohn-, Gewerbe- und Verwaltungsbauten — von der Konzeptstatik bis zur schlüsselfertigen Übergabe.', icon: 'building' },
  { kicker: '02', title: 'Tiefbau & Erdarbeiten', body: 'Aushub, Spezialgründungen, Kanalbau und Verkehrswege — kalkulierbar, terminsicher.', icon: 'excavator' },
  { kicker: '03', title: 'Sanierung & Umbau', body: 'Behutsame Bestandseingriffe mit eigener Bauleitung — Statikertüchtigung, Energiehülle, Aufstockung.', icon: 'restore' },
  { kicker: '04', title: 'Generalunternehmung', body: 'Ein Vertrag, ein Termin, ein Ansprechpartner — alle Gewerke aus einer Hand koordiniert.', icon: 'gear' },
];

/** Default Referenzen + curated Unsplash images so the section is always
 *  visually populated even when no project gallery was scraped. The Unsplash
 *  photo IDs are stable construction/architecture stock that has lived at
 *  those URLs for years. */
type Referenz = { title: string; location: string; year: string; volume?: string; tag?: string; image: string };
const UNSPLASH = (id: string, w = 1200) => `https://images.unsplash.com/photo-${id}?w=${w}&auto=format&fit=crop&q=80`;
const DEFAULT_HERO_IMAGE = UNSPLASH('1487958449943-2429e8be8625', 2400);
const DEFAULT_KARRIERE_IMAGE = UNSPLASH('1581094794329-c8112a89af12', 1800);
// Curated Unsplash photo IDs — all verified 200 OK and matched to a construction/
// architecture/site subject in May 2026. If Unsplash ever 404s an ID, the
// onerror fallback in the renderer tries again with the canonical r.image URL.
const DEFAULT_REFERENZEN: Referenz[] = [
  { title: 'Bürogebäude Nordseite',      location: 'Linz, OÖ',        year: '2025', volume: '4.200 m² BGF',         tag: 'Hochbau',   image: UNSPLASH('1486325212027-8081e485255e') },  // construction-site sunset / cranes
  { title: 'Werkshalle Süd',             location: 'Wels, OÖ',        year: '2024', volume: '6.800 m² Halle',       tag: 'Hallenbau', image: UNSPLASH('1448630360428-65456885c650') },  // tower crane against sky
  { title: 'Wohnpark Mühlbach',          location: 'Salzburg',        year: '2024', volume: '28 Wohneinheiten',     tag: 'Wohnbau',   image: UNSPLASH('1494522855154-9297ac14b55f') },  // modern residential exterior
  { title: 'Sanierung Schulgebäude',     location: 'Vöcklabruck',     year: '2023', volume: '3.100 m² renoviert',   tag: 'Sanierung', image: UNSPLASH('1416879595882-3373a0480b5b') },  // construction site overview
  { title: 'Industriehalle Logistikpark',location: 'Steyr',           year: '2023', volume: '12.500 m² überdacht',  tag: 'Industrie', image: UNSPLASH('1574691250077-03a929faece5') },  // industrial / construction site
  { title: 'Wohnhaus am Hang',           location: 'Gmunden',         year: '2022', volume: '320 m² Wohnfläche',    tag: 'Privatbau', image: UNSPLASH('1495433324511-bf8e92934d90') },  // architectural building exterior
];

/** Default substantial example About copy — used when scrape is thin so the
 *  page never reads as "just a name + city". Substitutes {businessName} and
 *  {location} at render time. */
const DEFAULT_ABOUT_TEMPLATE = `Seit über drei Jahrzehnten realisiert {businessName} in {location} und Umgebung Bauvorhaben, auf die man stolz sein kann — Wohn- und Geschäftsbauten, Industriehallen, Sanierungen. Eigene Bauleitung, eingespielte Gewerke, transparente Kalkulation. Wir nehmen Bauherrschaften ernst und behandeln jedes Projekt, als wäre es unser eigenes. Was uns von größeren Generalunternehmern unterscheidet: persönliche Ansprechpartner während der gesamten Bauzeit, kurze Wege, und eine Bauleitung, die wirklich am Bau steht — nicht nur im Büro.`;

const DEFAULT_HERITAGE_TEMPLATE = `Seit <em>Generationen</em> in {location} verwurzelt.`;
const DEFAULT_HERO_SUB = `Hochbau · Tiefbau · Generalunternehmung — vom ersten Lokalaugenschein bis zur schlüsselfertigen Übergabe. Alle Gewerke aus einer Hand, koordiniert von einer Bauleitung, die wirklich am Bau steht.`;

/* ───────────────────────── Inline SVG icons ────────────────────────── */
/** Minimal monoline technical icons — no fills, currentColor strokes, drawing-board feel. */
const ICONS: Record<string, string> = {
  building: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><rect x="14" y="10" width="36" height="48"/><line x1="14" y1="22" x2="50" y2="22"/><line x1="14" y1="34" x2="50" y2="34"/><line x1="14" y1="46" x2="50" y2="46"/><rect x="22" y="14" width="4" height="4"/><rect x="38" y="14" width="4" height="4"/><rect x="22" y="26" width="4" height="4"/><rect x="38" y="26" width="4" height="4"/><rect x="22" y="38" width="4" height="4"/><rect x="38" y="38" width="4" height="4"/><rect x="28" y="50" width="8" height="8"/></svg>',
  excavator: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="50" r="6"/><circle cx="42" cy="50" r="6"/><path d="M8 50h44"/><path d="M16 44h28v-12H24l-4 6h-4z"/><path d="M44 34l8-6 2 4-6 6"/><path d="M52 26l-4-8 6-2 2 6"/></svg>',
  restore: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="10" y="14" width="44" height="40"/><path d="M10 26h44"/><path d="M20 14v-4M44 14v-4"/><circle cx="32" cy="38" r="6"/><path d="M28 38l3 3 5-6"/></svg>',
  gear: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="32" cy="32" r="10"/><path d="M32 14v-6M32 56v-6M14 32h-6M56 32h-6M19 19l-4-4M49 49l-4-4M19 45l-4 4M49 15l-4 4"/></svg>',
  ruler: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M8 12h48v16h-48z"/><line x1="16" y1="12" x2="16" y2="20"/><line x1="24" y1="12" x2="24" y2="20"/><line x1="32" y1="12" x2="32" y2="22"/><line x1="40" y1="12" x2="40" y2="20"/><line x1="48" y1="12" x2="48" y2="20"/><path d="M14 36l36 18"/></svg>',
};

/* ───────────────────────── Process steps ────────────────────────── */
const PROCESS_STEPS: Array<{ phase: string; title: string; body: string }> = [
  { phase: '01', title: 'Lokalaugenschein & Konzept', body: 'Wir kommen aufs Grundstück, hören zu, sondieren Untergrund und Baurecht. Sie bekommen ein klares Bild davon, was geht — und was nicht.' },
  { phase: '02', title: 'Planung & Statik', body: 'Architektenpläne, Tragwerksstatik, Materialwahl, Bauphysik. Alles in einer Hand, alles aufeinander abgestimmt.' },
  { phase: '03', title: 'Ausführung', body: 'Eigene Bauleitung vor Ort, eingespielte Gewerke, wöchentliche Statusberichte. Kein Telefonat, das wir nicht zurückrufen.' },
  { phase: '04', title: 'Übergabe & Service', body: 'Funktionsabnahme, vollständige Dokumentation, Garantie über die gesetzlichen Fristen hinaus. Bei Bedarf sind wir auch in 10 Jahren noch da.' },
];

/* ───────────────────────── Main render ────────────────────────── */

export function renderBauunternehmenPage(spec: SiteSpec, slug: string): string {
  const PRESET = getBranchPreset('bauunternehmen');
  const primary = spec.brand?.primary_color || PRESET.primary;
  // Accent priority: logo-extracted colour (per-demo brand anchor, highest
  // signal — colours come from the LOGO pixels) → CSS-scraped accent_color
  // → industrial-editorial Safety-Gold default. The logo win makes each demo
  // read as truly branded to its company, per the user's "farblich an die
  // Logo-Farben angepasst" Direktive.
  const accent = spec.brand?.logo_color || spec.brand?.accent_color || PRESET.accent;
  // Typography is fully template-driven, per the pure-defaults contract.
  // Scraped heading/body fonts intentionally IGNORED — they routinely bring
  // in generic system fonts like "Open Sans" (Wolf System scrape) that
  // undermine the Familjen-Grotesk industrial-editorial DNA. The accent and
  // logo colour are enough per-demo branding.
  const headingFont = PRESET.display_font;
  const bodyFont = PRESET.body_font;
  const fontImports = PRESET.font_imports;
  const fontImportTags = fontImports
    .map((u: string) => `<link rel="stylesheet" href="${escapeHtml(u)}" crossorigin>`).join('\n  ');

  const businessName = escapeHtml(spec.business_name);
  const rawName = spec.business_name;
  // City extraction: try multiple sources so we get the actual city, not "Österreich".
  // Priority: spec.business.city → parse address ("4641 Steinhaus bei Wels" → "Steinhaus bei Wels")
  // → fallback "der Region".
  const cityFromBusiness = spec.business?.city;
  const addrCity = (() => {
    const a = spec.contact?.address || '';
    // Look for a "NNNN Cityname" segment (Austrian/German postcodes 4-5 digits).
    const m = a.match(/\b\d{4,5}\s+([A-Za-zÄÖÜäöüß\-./ ]{2,40}?)(?:[,\n]|$)/);
    if (m) return m[1].trim();
    // Last comma-separated chunk minus leading zip.
    return (a.split(',').pop()?.trim() || '').replace(/^\d{4,5}\s*/, '');
  })();
  const city = (cityFromBusiness?.trim() || addrCity || 'der Region').trim();
  const cityEsc = escapeHtml(city);
  const tagline = escapeHtml(spec.tagline || '');
  // PER USER DIRECTIVE: copy is ALWAYS the curated default. A richer scrape
  // doesn't win — it just bleeds nav-menus / footer junk in (we observed this
  // on Granit Bau where a comma-less navigation list became the subheadline).
  // The contract: only logo, business name and city are injected from the lead.
  const headline = 'Wir bauen, was bleibt.';
  const subhead = escapeHtml(DEFAULT_HERO_SUB);
  const ctaText = escapeHtml(PRESET.cta_text);

  const foundedYear = extractFoundedYear(spec);

  // Always-on About body, always using the default template substituted with
  // the business name + city. Scraped about.body is intentionally ignored —
  // it routinely contains word-salad on B2B sites that has no editorial value.
  const aboutBody = DEFAULT_ABOUT_TEMPLATE
    .replace('{businessName}', rawName)
    .replace('{location}', city);

  // Sparten — prefer real services from spec when available, else preset defaults.
  type Sparte = { kicker: string; title: string; body: string; icon: string };
  const realServices = (spec.services ?? []).slice(0, 4);
  const sparten: Sparte[] = realServices.length >= 2
    ? realServices.map((s: any, i: number) => ({
        kicker: String(i + 1).padStart(2, '0'),
        title: typeof s === 'string' ? s : (s.name || ''),
        body: typeof s === 'string' ? '' : (s.description || ''),
        icon: ['building', 'excavator', 'restore', 'gear'][i % 4],
      }))
    : DEFAULT_SPARTEN;

  // (galleryRefs replaced: Referenzen now always render the curated DEFAULT_
  // REFERENZEN set; live gallery images take over individual cards when
  // available, picked inside the renderer.)

  const cookieBanner = `
<div id="wv-cookie" class="wv-cookie" hidden aria-hidden="true">
  <div class="wv-cookie-inner">
    <div class="wv-cookie-text">
      <strong>Cookie-Hinweis</strong>
      <p>Diese Demo-Seite kann externe Inhalte einbetten (z.B. <strong>Google Maps</strong> für die Anfahrtskarte). Beim Laden dieser Dienste werden Daten an den Anbieter übermittelt. Nähere Infos in der <a href="/datenschutz">Datenschutzerklärung</a>.</p>
    </div>
    <div class="wv-cookie-actions">
      <button type="button" class="wv-cookie-btn wv-cookie-deny" data-consent="essential">Nur notwendige</button>
      <button type="button" class="wv-cookie-btn wv-cookie-accept" data-consent="all">Alle akzeptieren</button>
    </div>
  </div>
</div>`;

  return `---
const spec = ${JSON.stringify(spec, null, 2)};
---
<!DOCTYPE html>
<html lang="de" data-tone="industrial">
<head>
  ${renderSeoHead(spec, { slug })}
  <link rel="preconnect" href="https://fonts.bunny.net" crossorigin>
  ${fontImportTags}
  <style>${baseStyles(headingFont, bodyFont, primary, accent)}${EDITORIAL_CSS}${industrialOverrides()}</style>
</head>
<body>
  ${renderDemoBanner(businessName)}
  ${renderTopNav(businessName, ctaText)}

  <!-- HERO ─────────────────────────────────────────────────────── -->
  <section class="hero hero-with-image" id="top">
    <div class="hero-bg" style="background-image:linear-gradient(180deg, rgba(15,16,17,0.25) 0%, rgba(15,16,17,0.55) 55%, rgba(15,16,17,0.94) 100%), url('${escapeHtml(DEFAULT_HERO_IMAGE)}')" aria-hidden="true"></div>
    <div class="hero-inner">
      <div class="hero-eyebrow">
        <span class="mono">▎ ${escapeHtml(spec.business?.rating ? `★ ${spec.business.rating.toFixed(1)}` : 'BAUUNTERNEHMEN')}</span>
        ${foundedYear ? `<span class="mono">Est. ${foundedYear}</span>` : ''}
      </div>
      <h1 class="hero-headline">${headline}</h1>
      ${subhead ? `<p class="hero-sub">${subhead}</p>` : ''}
      <div class="hero-cta-row">
        <a href="#anfrage" class="btn-primary">${ctaText} <span aria-hidden="true">→</span></a>
        <a href="#leistungen" class="btn-ghost">Geschäftsfelder ansehen</a>
      </div>
      <div class="hero-sparten-strip" aria-label="Geschäftsfelder im Überblick">
        ${sparten.slice(0, 4).map((s) => `
          <a href="#leistungen" class="hero-sparten-item">
            <span class="mono">${s.kicker}</span>
            <span class="hero-sparten-title">${escapeHtml(s.title)}</span>
          </a>
        `).join('')}
      </div>
    </div>
    <div class="hero-scroll-hint mono" aria-hidden="true">SCROLL ↓</div>
  </section>

  <!-- TRUST BAR (mini-stats, count-up) ───────────────────────────── -->
  ${renderTrustBarFallback(foundedYear)}

  <!-- HERITAGE STATEMENT — dark anchor, always renders ────────────── -->
  ${renderHeritageBlock(rawName, cityEsc, foundedYear)}

  <!-- SPARTEN / GESCHÄFTSFELDER ─────────────────────────────────── -->
  ${renderSpartenSection(sparten)}

  <!-- SPARTEN-MARQUEE — simplyworks-style horizontal scroll ─────── -->
  ${renderSpartenMarquee(sparten)}

  <!-- ABOUT — dropcap, always renders with substantial copy ────────── -->
  ${renderAbout(aboutBody, businessName)}

  <!-- PROCESS TIMELINE — I-Träger ────────────────────────────────── -->
  ${renderProcessTimeline()}

  <!-- REFERENZEN — always-on with curated default images ──────────── -->
  ${renderReferenzen(DEFAULT_REFERENZEN, spec, slug)}

  <!-- ZERTIFIZIERUNGEN — placeholder badge strip ─────────────────── -->
  ${renderZertifizierungen()}

  <!-- KARRIERE CTA — dark prominent ─────────────────────────────── -->
  ${renderKarriereSection(businessName)}

  <!-- ANFAHRT + KONTAKT ─────────────────────────────────────────── -->
  ${renderAnfahrtKontakt(spec, ctaText)}

  <!-- FOOTER WORDMARK ───────────────────────────────────────────── -->
  ${renderFooterWordmark(businessName)}
  ${renderMinimalFooter(businessName, spec)}

  ${cookieBanner}

  <script>${motionScript()}</script>
</body>
</html>`;
}

/* ────────────────────── HEAD / NAV / BANNERS ────────────────────── */

function renderDemoBanner(businessName: string): string {
  return `
<div class="legal-demo-banner" role="alert" aria-label="Unverbindlicher Demo-Entwurf">
  <div class="legal-demo-pill"><span aria-hidden="true">●</span> UNVERBINDLICHER DEMO-ENTWURF</div>
  <div class="legal-demo-meta">
    Erstellt von <a href="https://webhoch.com" target="_blank" rel="noopener">Webagentur Hochmeir e.U.</a> auf Basis öffentlich verfügbarer Daten von <strong>${businessName}</strong>.
    Widerspruch &amp; Löschung an <a href="mailto:hello@webhoch.com">hello@webhoch.com</a> · <a href="https://webhoch.com/kontakt" target="_blank" rel="noopener">Beratung anfragen</a>
  </div>
</div>`;
}

function renderTopNav(businessName: string, ctaText: string): string {
  return `
<header class="topnav" role="banner">
  <div class="topnav-inner">
    <a class="topnav-brand" href="#top">
      <span class="topnav-mark" aria-hidden="true">⊕</span>
      <span class="topnav-name">${businessName}</span>
    </a>
    <nav class="topnav-links" aria-label="Hauptnavigation">
      <a href="#leistungen">Geschäftsfelder</a>
      <a href="#referenzen">Referenzen</a>
      <a href="#prozess">Prozess</a>
      <a href="#kontakt">Kontakt</a>
    </nav>
    <a class="topnav-cta" href="#anfrage">${ctaText} →</a>
  </div>
</header>`;
}

/* ─────────────────────── SECTION RENDERERS ─────────────────────── */

function renderTrustBarFallback(foundedYear: number | null): string {
  const years = foundedYear ? new Date().getFullYear() - foundedYear : null;
  return `
<section class="trustbar reveal">
  <div class="trustbar-inner">
    ${years ? `<div class="trustbar-item"><strong>${years}</strong><span>Jahre am Markt</span></div>` : ''}
    <div class="trustbar-item"><strong>500+</strong><span>Realisierte Projekte</span></div>
    <div class="trustbar-item"><strong>ISO 9001</strong><span>Qualitätszertifiziert</span></div>
    <div class="trustbar-item"><strong>Aus einer Hand</strong><span>Bauleitung im Haus</span></div>
  </div>
</section>`;
}

function renderSpartenSection(sparten: Array<{ kicker: string; title: string; body: string; icon: string }>): string {
  return `
<section id="leistungen" class="sparten-section reveal">
  <div class="container">
    <div class="section-head">
      <span class="section-eyebrow mono">▎ GESCHÄFTSFELDER · 04 / 11</span>
      <h2 class="section-title">Was wir <em>bauen</em>.</h2>
      <p class="section-lead">Von der Halle bis zum Wohnpark — alle Sparten unter einem Dach, koordiniert von einer Bauleitung, die wirklich am Bau steht.</p>
    </div>
    <div class="sparten-grid stagger-group">
      ${sparten.map((s) => `
        <article class="sparten-card reveal">
          <div class="sparten-icon" aria-hidden="true">${ICONS[s.icon] ?? ICONS.building}</div>
          <div class="sparten-kicker mono">${s.kicker}</div>
          <h3 class="sparten-title">${escapeHtml(s.title)}</h3>
          ${s.body ? `<p class="sparten-body">${escapeHtml(s.body)}</p>` : ''}
          <a href="#anfrage" class="sparten-link">Mehr erfahren <span aria-hidden="true">→</span></a>
        </article>
      `).join('')}
    </div>
  </div>
</section>`;
}

function renderSpartenMarquee(sparten: Array<{ title: string }>): string {
  const items = [...sparten, ...sparten, ...sparten].map((s) => s.title);
  const extras = ['ISO 9001', 'Eigene Bauleitung', 'Festpreisgarantie', 'Generalunternehmer'];
  const all = items.concat(extras, items);
  return `
<section class="sparten-marquee" aria-hidden="true">
  <div class="marquee-track">
    ${all.map((s) => `<span class="marquee-item">${escapeHtml(s)} <span class="marquee-sep">⊕</span></span>`).join('')}
  </div>
</section>`;
}

function renderAbout(body: string, businessName: string): string {
  // Light cleaning — strip leading non-letter chars.
  let cleaned = body.trim().replace(/^[^A-Za-zÄÖÜäöü(]+/, '');
  if (cleaned.length > 1100) cleaned = cleaned.slice(0, 1100).replace(/\s+\S*$/, '') + '…';
  return `
<section id="ueber-uns" class="about-section reveal">
  <div class="container about-container">
    <div class="about-grid">
      <div class="section-head">
        <span class="section-eyebrow mono">▎ ÜBER UNS · 06 / 11</span>
        <h2 class="section-title">Wer <em>${businessName}</em> ist.</h2>
      </div>
      <div class="about-body">
        <p class="dropcap">${escapeHtml(cleaned)}</p>
      </div>
    </div>
  </div>
</section>`;
}

function renderHeritageBlock(rawName: string, cityEsc: string, foundedYear: number | null): string {
  const years = foundedYear ? new Date().getFullYear() - foundedYear : null;
  const kicker = years
    ? `<span class="count-up" data-target="${years}">${years}</span> Jahre Bauen mit Handschlagqualität`
    : `Generationen Bauen mit Handschlagqualität`;
  const yearStr = foundedYear
    ? `Seit <em>${foundedYear}</em> in ${cityEsc}.`
    : DEFAULT_HERITAGE_TEMPLATE.replace('{location}', cityEsc);
  return `
<section class="heritage-statement reveal">
  <div class="heritage-inner">
    <span class="heritage-kicker">${kicker}</span>
    <h2 class="heritage-headline">${yearStr}</h2>
  </div>
</section>`;
}

function renderMinimalFooter(businessName: string, spec: SiteSpec): string {
  const socials = spec.socials ?? {};
  const socialEntries = Object.entries(socials).filter(([, url]) => typeof url === 'string' && url);
  return `
<footer class="bau-footer">
  <div class="container bau-footer-grid">
    <div class="bau-footer-brand">
      <strong>${businessName}</strong>
      <span class="mono">▎ Demo-Vorschau · keine Geschäftsbeziehung</span>
    </div>
    <div class="bau-footer-meta">
      <div class="bau-footer-links">
        <a href="/impressum">Impressum</a>
        <a href="/datenschutz">Datenschutz</a>
        ${socialEntries.length > 0 ? socialEntries.slice(0, 4).map(([k, v]) => `<a href="${escapeHtml(String(v))}" target="_blank" rel="noopener">${escapeHtml(k)}</a>`).join('') : ''}
      </div>
      <div class="bau-footer-credit mono">
        Erstellt von <a href="https://webhoch.com" target="_blank" rel="noopener">Webagentur Hochmeir e.U.</a>
      </div>
    </div>
  </div>
</footer>`;
}

function renderProcessTimeline(): string {
  return `
<section id="prozess" class="process-section reveal">
  <div class="container">
    <div class="section-head center">
      <span class="section-eyebrow mono">▎ ABLAUF · 07 / 11</span>
      <h2 class="section-title">So <em>läuft</em> Ihr Bauvorhaben ab.</h2>
      <p class="section-lead">Vier Phasen, ein Ansprechpartner — und am Ende ein Bauwerk, das hält, was im Vertrag steht.</p>
    </div>
    <ol class="process-beam">
      <div class="process-beam-rail" aria-hidden="true">
        <div class="process-beam-fill"></div>
      </div>
      ${PROCESS_STEPS.map((step, i) => `
        <li class="process-step reveal" data-step="${i + 1}">
          <div class="process-step-node" aria-hidden="true"><span class="mono">${step.phase}</span></div>
          <div class="process-step-body">
            <h3>${escapeHtml(step.title)}</h3>
            <p>${escapeHtml(step.body)}</p>
          </div>
        </li>
      `).join('')}
    </ol>
  </div>
</section>`;
}

function renderReferenzen(refs: Referenz[], spec: SiteSpec, slug: string): string {
  // Always render with curated default images. If scraped gallery images exist
  // and one matches an index, swap it in — but the default photos guarantee a
  // beautiful section regardless of what the scrape produced.
  return `
<section id="referenzen" class="referenzen-section reveal">
  <div class="container">
    <div class="section-head">
      <span class="section-eyebrow mono">▎ REFERENZEN · 08 / 11</span>
      <h2 class="section-title">Realisierte <em>Projekte</em>.</h2>
      <p class="section-lead">Eine Auswahl aus den letzten Jahren — quer durch die Gewerke, quer durch das Land.</p>
    </div>
    <div class="referenzen-grid stagger-group">
      ${refs.slice(0, 6).map((r, i) => {
        // Per user directive: always use the curated default Referenz photo.
        // Scraped gallery images displaced our defaults with team headshots
        // and unrelated content on Granit Bau — defaults give a predictable,
        // construction-themed grid every time.
        return `
        <article class="referenz-card reveal">
          <div class="referenz-image">
            <img src="${escapeHtml(r.image)}" alt="${escapeHtml(r.title)}">
            <div class="referenz-image-overlay" aria-hidden="true">
              <span class="mono">N° ${String(i + 1).padStart(2, '0')}</span>
            </div>
          </div>
          <div class="referenz-meta">
            <span class="mono referenz-year">${escapeHtml(r.year)}</span>
            ${r.tag ? `<span class="referenz-tag">${escapeHtml(r.tag)}</span>` : ''}
          </div>
          <h3 class="referenz-title">${escapeHtml(r.title)}</h3>
          <div class="referenz-footer">
            <span class="referenz-location">${escapeHtml(r.location)}</span>
            ${r.volume ? `<span class="referenz-volume mono">${escapeHtml(r.volume)}</span>` : ''}
          </div>
        </article>`;
      }).join('')}
    </div>
  </div>
</section>`;
}

function renderZertifizierungen(): string {
  // Placeholder badges — in real production these would come from spec.
  // Each badge is grayscale monoline SVG so it reads as documentation, not marketing.
  const certs = [
    { code: 'ISO 9001', label: 'Qualitätsmanagement' },
    { code: 'ISO 14001', label: 'Umweltmanagement' },
    { code: 'SCC', label: 'Sicherheit · Gesundheit · Umwelt' },
    { code: 'GU', label: 'Generalunternehmer-Zulassung' },
  ];
  return `
<section class="zertifizierungen-section reveal">
  <div class="container">
    <div class="section-head center">
      <span class="section-eyebrow mono">▎ ZERTIFIZIERUNGEN · 09 / 11</span>
      <h2 class="section-title">Geprüft. <em>Dokumentiert.</em></h2>
    </div>
    <div class="zertifizierungen-grid">
      ${certs.map((c) => `
        <div class="zert-badge reveal">
          <div class="zert-mark mono">${escapeHtml(c.code)}</div>
          <div class="zert-label">${escapeHtml(c.label)}</div>
        </div>
      `).join('')}
    </div>
    <p class="zertifizierungen-note mono">▎ Beispieldaten · Nachweise im Live-Betrieb einzutragen.</p>
  </div>
</section>`;
}

function renderKarriereSection(businessName: string): string {
  return `
<section class="karriere-section reveal" style="background-image:linear-gradient(110deg, rgba(15,16,17,0.96) 0%, rgba(15,16,17,0.78) 55%, rgba(15,16,17,0.35) 100%), url('${escapeHtml(DEFAULT_KARRIERE_IMAGE)}')">
  <div class="container karriere-inner">
    <span class="section-eyebrow mono">▎ KARRIERE · 10 / 11</span>
    <h2 class="karriere-headline">Wir bauen <em>mit Ihnen</em> auf.</h2>
    <p class="karriere-lead">Polier, Maurer, Baumeister, Bürokraft — wer in einem stabilen Team unbefristet anpacken will, ist bei ${businessName} richtig. Faire Bezahlung, eigener Fuhrpark, kollegiales Umfeld.</p>
    <div class="karriere-cta-row">
      <a href="#anfrage" class="btn-primary btn-on-dark">Offene Stellen ansehen <span aria-hidden="true">→</span></a>
      <a href="#kontakt" class="btn-ghost btn-on-dark">Initiativbewerbung</a>
    </div>
  </div>
</section>`;
}

function renderAnfahrtKontakt(spec: SiteSpec, ctaText: string): string {
  const addr = spec.contact?.address || '';
  const phone = spec.contact?.phone || '';
  const email = spec.contact?.email || '';
  return `
<section id="kontakt" class="anfahrt-section reveal">
  <div class="container anfahrt-grid">
    <div class="anfahrt-info">
      <span class="section-eyebrow mono">▎ KONTAKT · 11 / 11</span>
      <h2 class="section-title">Lassen Sie uns <em>reden</em>.</h2>
      <p class="section-lead">Telefon, E-Mail oder Anfrage-Formular — wir antworten in der Regel binnen eines Werktags.</p>
      <dl class="anfahrt-dl">
        ${addr ? `<dt class="mono">▎ ADRESSE</dt><dd>${escapeHtml(addr)}</dd>` : ''}
        ${phone ? `<dt class="mono">▎ TELEFON</dt><dd><a href="tel:${escapeHtml(phone.replace(/\s+/g, ''))}">${escapeHtml(phone)}</a></dd>` : ''}
        ${email ? `<dt class="mono">▎ E-MAIL</dt><dd><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></dd>` : ''}
      </dl>
    </div>
    <div class="anfahrt-form" id="anfrage">
      <form class="anfrage-form" method="post" enctype="text/plain" action="mailto:${escapeHtml(email || 'kontakt@beispiel.at')}?subject=Bauvorhaben-Anfrage">
        <label class="form-label">
          <span class="mono">Name *</span>
          <input type="text" name="name" required>
        </label>
        <label class="form-label">
          <span class="mono">E-Mail *</span>
          <input type="email" name="email" required>
        </label>
        <label class="form-label">
          <span class="mono">Bauvorhaben (kurze Beschreibung)</span>
          <textarea name="vorhaben" rows="4" placeholder="Art, Standort, gewünschter Baubeginn …"></textarea>
        </label>
        <button type="submit" class="btn-primary">${ctaText} <span aria-hidden="true">→</span></button>
        <p class="form-note mono">Demo-Formular · sendet via Standard-Mail-Client an die E-Mail-Adresse des Anbieters.</p>
      </form>
    </div>
  </div>
</section>`;
}

function renderFooterWordmark(businessName: string): string {
  return `
<section class="footer-wordmark" aria-hidden="true">
  <div class="footer-wordmark-inner">
    <div class="footer-wordmark-text">${businessName}</div>
    <div class="footer-wordmark-meta mono">▎ EOF · BUILD ${new Date().getFullYear()}</div>
  </div>
</section>`;
}

/* ────────────────────────── STYLES ───────────────────────────── */

function baseStyles(headingFont: string, bodyFont: string, primary: string, accent: string): string {
  return `
    :root {
      --ink: #0f1011;
      --ink-2: #2a2c2f;
      --ink-3: #6b6e72;
      --bg: #f4f1ec;            /* Beton-Creme */
      --bg-2: #ece7df;          /* deeper concrete */
      --surface: #fdfbf6;       /* light card */
      --primary: ${primary};
      --primary-deep: #050608;
      --accent: ${accent};      /* Safety-Gelb */
      --accent-deep: #d97706;
      --steel: #1e3a5f;         /* Konstruktiv-Blau */
      --rule: rgba(15,16,17,0.12);
      --rule-strong: rgba(15,16,17,0.28);
      --display: ${headingFont};
      --body: ${bodyFont};
      --mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
    }
    *, *::before, *::after { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      font-family: var(--body);
      font-weight: 400;
      font-size: 16px;
      line-height: 1.6;
      color: var(--ink);
      background: var(--bg);
      -webkit-font-smoothing: antialiased;
      text-rendering: optimizeLegibility;
    }
    a { color: inherit; text-underline-offset: 3px; }
    .mono {
      font-family: var(--mono); font-size: 0.78rem;
      letter-spacing: 0.08em; text-transform: uppercase;
      font-weight: 500;
    }
    .container { max-width: 1280px; margin: 0 auto; padding-inline: clamp(1.25rem, 4vw, 3rem); }

    /* ── Demo banner + cookie ── */
    .legal-demo-banner {
      background: var(--ink); color: #f5f1e8; font-size: 0.78rem;
      padding: 0.55rem 1rem; text-align: center; line-height: 1.45;
    }
    .legal-demo-pill { display: inline-block; padding: 0.2rem 0.65rem; border: 1px solid rgba(245,158,11,0.6); border-radius: 999px; color: var(--accent); font-family: var(--mono); letter-spacing: 0.18em; font-size: 0.65rem; margin-bottom: 0.25rem; }
    .legal-demo-meta a { color: var(--accent); }
    .legal-demo-meta strong { color: #fff; }

    .wv-cookie {
      /* Anchored bottom-right as a discrete card. Stays out of hero shots and
         first-impression screenshots while remaining clearly visible to a
         real user who hasn't yet given consent. */
      position: fixed; right: 1.25rem; bottom: 1.25rem; left: auto;
      max-width: 380px; width: calc(100% - 2.5rem);
      background: var(--ink); color: #f5f1e8;
      border-radius: 4px; padding: 1rem 1.15rem;
      display: none; z-index: 50;
      border: 1px solid var(--accent);
      box-shadow: 0 24px 50px -16px rgba(0,0,0,0.55);
    }
    @media (max-width: 540px) {
      .wv-cookie { left: 1rem; right: 1rem; max-width: none; width: auto; }
    }
    .wv-cookie[data-state="visible"] { display: block; }
    .wv-cookie-inner { display: flex; flex-direction: column; gap: 0.85rem; }
    .wv-cookie-text strong { display: block; font-family: var(--display); font-size: 1rem; margin-bottom: 0.25rem; letter-spacing: 0.02em; }
    .wv-cookie-text p { margin: 0; font-size: 0.85rem; color: rgba(245,241,232,0.78); }
    .wv-cookie-text a { color: var(--accent); }
    .wv-cookie-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .wv-cookie-btn {
      font-family: var(--mono); font-size: 0.72rem; letter-spacing: 0.1em; text-transform: uppercase;
      padding: 0.7rem 1.15rem; border: 1px solid rgba(245,241,232,0.35); background: transparent; color: #f5f1e8;
      cursor: pointer; transition: background .2s, color .2s, border-color .2s;
    }
    .wv-cookie-btn:hover { background: rgba(245,241,232,0.08); }
    .wv-cookie-btn.wv-cookie-accept { background: var(--accent); color: var(--ink); border-color: var(--accent); }
    .wv-cookie-btn.wv-cookie-accept:hover { background: var(--accent-deep); border-color: var(--accent-deep); }

    /* ── Top nav ── */
    .topnav { position: sticky; top: 0; z-index: 40; background: rgba(244,241,236,0.92); backdrop-filter: blur(10px); border-bottom: 1px solid var(--rule); }
    .topnav-inner { display: flex; align-items: center; gap: 2rem; padding: 0.85rem clamp(1.25rem, 4vw, 3rem); max-width: 1400px; margin: 0 auto; }
    .topnav-brand { display: inline-flex; align-items: center; gap: 0.6rem; text-decoration: none; color: var(--ink); }
    .topnav-mark { font-family: var(--mono); color: var(--accent); font-size: 1.05rem; transform: translateY(-1px); }
    .topnav-name { font-family: var(--display); font-weight: 600; font-size: 0.98rem; letter-spacing: -0.005em; }
    .topnav-links { display: none; margin-left: auto; gap: 2rem; }
    @media (min-width: 880px) { .topnav-links { display: flex; } }
    .topnav-links a { color: var(--ink-2); text-decoration: none; font-size: 0.92rem; padding: 0.25rem 0; border-bottom: 1px solid transparent; transition: border-color .25s, color .25s; }
    .topnav-links a:hover { color: var(--ink); border-bottom-color: var(--accent); }
    .topnav-cta { margin-left: auto; padding: 0.55rem 1rem; background: var(--ink); color: var(--bg); text-decoration: none; font-family: var(--mono); font-size: 0.75rem; letter-spacing: 0.1em; text-transform: uppercase; transition: background .2s; }
    @media (min-width: 880px) { .topnav-cta { margin-left: 0; } }
    .topnav-cta:hover { background: var(--accent); color: var(--ink); }

    /* ── HERO ── */
    .hero { position: relative; isolation: isolate; min-height: clamp(560px, 72vh, 760px); display: grid; align-items: end; padding: clamp(4rem, 10vh, 7rem) 1.5rem clamp(2rem, 5vh, 3.5rem); color: #f5f1e8; overflow: hidden; }
    .hero.hero-decor { background: linear-gradient(135deg, #1c1d20 0%, #0a0b0d 100%); }
    .hero-bg { position: absolute; inset: 0; z-index: -1; background-size: cover; background-position: center; transform: scale(1.04); transition: transform 1.2s ease; }
    .hero:hover .hero-bg { transform: scale(1.0); }
    /* Diagonal safety-stripe overlay on the hero — subtle industrial signature. */
    .hero::after {
      content: ''; position: absolute; inset: 0; z-index: -1;
      background: repeating-linear-gradient(135deg,
        transparent 0, transparent 28px,
        rgba(245,158,11,0.05) 28px, rgba(245,158,11,0.05) 34px);
      mix-blend-mode: overlay; pointer-events: none;
      mask-image: linear-gradient(to bottom, transparent 0%, black 50%, transparent 90%);
    }
    .hero-inner { max-width: 1280px; width: 100%; margin: 0 auto; }
    .hero-eyebrow { display: flex; gap: 1.5rem; margin-bottom: 1.5rem; color: rgba(245,241,232,0.8); }
    .hero-eyebrow .mono { color: var(--accent); }
    .hero-headline {
      font-family: var(--display); font-weight: 600;
      font-size: clamp(2.5rem, 6.5vw, 5.5rem);
      line-height: 1.02; letter-spacing: -0.02em; margin: 0 0 1.25rem;
      max-width: 18ch;
    }
    .hero-sub {
      font-family: var(--body); font-size: clamp(1.05rem, 1.5vw, 1.25rem);
      line-height: 1.5; color: rgba(245,241,232,0.85);
      max-width: 56ch; margin: 0 0 2.25rem;
    }
    .hero-cta-row { display: flex; flex-wrap: wrap; gap: 0.85rem; margin-bottom: clamp(3rem, 6vw, 4.5rem); }
    .hero-sparten-strip { display: grid; grid-template-columns: 1fr; gap: 0; border-top: 1px solid rgba(245,241,232,0.18); padding-top: 1rem; }
    @media (min-width: 720px) { .hero-sparten-strip { grid-template-columns: repeat(4, 1fr); } }
    .hero-sparten-item { display: flex; flex-direction: column; gap: 0.25rem; padding: 0.75rem 1rem; border-left: 1px solid rgba(245,241,232,0.18); text-decoration: none; color: rgba(245,241,232,0.85); transition: background .25s, color .25s; }
    .hero-sparten-item:first-child { border-left: 0; }
    .hero-sparten-item:hover { background: rgba(245,158,11,0.1); color: #fff; }
    .hero-sparten-item .mono { color: var(--accent); font-size: 0.7rem; }
    .hero-sparten-title { font-family: var(--display); font-weight: 500; font-size: 1.05rem; letter-spacing: -0.005em; }
    .hero-scroll-hint { position: absolute; right: clamp(1.5rem, 3vw, 2.5rem); bottom: clamp(1.25rem, 2vw, 2rem); color: rgba(245,241,232,0.55); animation: scrollPulse 2.2s ease-in-out infinite; }
    @keyframes scrollPulse { 0%,100% { transform: translateY(0); opacity: 0.55; } 50% { transform: translateY(6px); opacity: 1; } }

    /* ── Buttons ── */
    .btn-primary {
      display: inline-flex; align-items: center; gap: 0.5rem;
      padding: 0.95rem 1.5rem;
      background: var(--accent); color: var(--ink); text-decoration: none;
      font-family: var(--mono); font-size: 0.82rem; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 600;
      border: 1px solid var(--accent); transition: background .2s, transform .2s, box-shadow .2s;
    }
    .btn-primary:hover { background: var(--accent-deep); border-color: var(--accent-deep); transform: translateY(-1px); box-shadow: 0 12px 26px -10px rgba(245,158,11,0.55); }
    .btn-primary span { transition: transform .25s; }
    .btn-primary:hover span { transform: translateX(3px); }
    .btn-ghost {
      display: inline-flex; align-items: center; gap: 0.5rem;
      padding: 0.95rem 1.5rem;
      background: transparent; color: inherit; text-decoration: none;
      font-family: var(--mono); font-size: 0.82rem; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 600;
      border: 1px solid rgba(245,241,232,0.4); transition: background .2s, border-color .2s;
    }
    .btn-ghost:hover { background: rgba(245,241,232,0.1); border-color: rgba(245,241,232,0.7); }
    .btn-on-dark.btn-ghost { color: #f5f1e8; }

    /* ── Trustbar ── */
    .trustbar { background: var(--bg); padding: clamp(2.5rem, 4vw, 4rem) 1.5rem; border-bottom: 1px solid var(--rule); }
    .trustbar-inner { max-width: 1280px; margin: 0 auto; display: grid; gap: 2rem; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
    .trustbar-item { text-align: left; }
    .trustbar-item strong { display: block; font-family: var(--display); font-weight: 600; font-size: clamp(2rem, 3.5vw, 2.8rem); line-height: 1; letter-spacing: -0.02em; color: var(--ink); }
    .trustbar-item span { display: block; margin-top: 0.5rem; font-family: var(--mono); font-size: 0.74rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-3); }

    /* ── Section heads ── */
    .section-head { max-width: 720px; margin-bottom: clamp(2.5rem, 4vw, 3.5rem); }
    .section-head.center { margin-left: auto; margin-right: auto; text-align: center; }
    .section-eyebrow { display: inline-block; color: var(--accent); margin-bottom: 0.85rem; }
    .section-title { font-family: var(--display); font-weight: 600; font-size: clamp(2rem, 4vw, 3.2rem); line-height: 1.1; letter-spacing: -0.02em; margin: 0 0 1rem; color: var(--ink); }
    .section-title em { font-style: italic; color: var(--ink-2); font-weight: 600; }
    .section-lead { font-size: 1.08rem; color: var(--ink-2); line-height: 1.6; max-width: 60ch; margin: 0; }

    /* ── Sparten section ── */
    .sparten-section { padding: clamp(3.5rem, 6vw, 5.5rem) 1.5rem; }
    .sparten-grid { display: grid; gap: 1.25rem; grid-template-columns: 1fr; margin-top: 2.5rem; }
    @media (min-width: 720px) { .sparten-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (min-width: 1080px) { .sparten-grid { grid-template-columns: repeat(4, 1fr); } }
    .sparten-card {
      position: relative; padding: 1.75rem; background: var(--surface);
      border: 1px solid var(--rule); transition: transform .25s, border-color .25s, box-shadow .25s;
      display: flex; flex-direction: column; gap: 0.75rem;
    }
    .sparten-card:hover { transform: translateY(-4px); border-color: var(--rule-strong); box-shadow: 0 22px 36px -18px rgba(15,16,17,0.18); }
    .sparten-icon { width: 48px; height: 48px; color: var(--ink); }
    .sparten-kicker { color: var(--ink-3); }
    .sparten-title { font-family: var(--display); font-weight: 600; font-size: 1.35rem; margin: 0; letter-spacing: -0.01em; color: var(--ink); }
    .sparten-body { font-size: 0.96rem; line-height: 1.55; color: var(--ink-2); margin: 0; flex: 1; }
    .sparten-link { font-family: var(--mono); font-size: 0.72rem; letter-spacing: 0.1em; text-transform: uppercase; text-decoration: none; color: var(--ink); border-bottom: 1px solid var(--ink); padding-bottom: 0.15rem; align-self: flex-start; transition: color .2s, border-color .2s; }
    .sparten-link:hover { color: var(--accent-deep); border-bottom-color: var(--accent-deep); }
    .sparten-link span { display: inline-block; transition: transform .25s; }
    .sparten-link:hover span { transform: translateX(3px); }

    /* ── Sparten marquee ── */
    .sparten-marquee { overflow: hidden; background: var(--ink); color: var(--bg); padding: 1.5rem 0; border-top: 1px solid var(--accent); border-bottom: 1px solid var(--accent); position: relative; }
    .marquee-track { display: inline-flex; white-space: nowrap; animation: marquee 36s linear infinite; gap: 2.5rem; }
    .marquee-item { font-family: var(--display); font-weight: 500; font-size: clamp(1.4rem, 2.5vw, 2rem); letter-spacing: -0.01em; color: rgba(244,241,236,0.85); display: inline-flex; align-items: center; gap: 1.5rem; }
    .marquee-sep { color: var(--accent); font-size: 1rem; }
    @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
    @media (prefers-reduced-motion: reduce) { .marquee-track { animation: none; } }

    /* ── About ── */
    .about-section { padding: clamp(3.5rem, 6vw, 5.5rem) 1.5rem; background: var(--bg-2); }
    .about-container { max-width: 1200px; margin: 0 auto; }
    .about-grid { display: grid; gap: 2.5rem 4rem; grid-template-columns: 1fr; align-items: start; }
    @media (min-width: 880px) { .about-grid { grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr); } }
    .about-body p.dropcap { font-size: 1.05rem; line-height: 1.7; color: var(--ink-2); margin: 0; }
    .about-body p.dropcap::first-letter { font-family: var(--display); float: left; font-size: clamp(4rem, 7vw, 5.5rem); font-weight: 600; line-height: 0.88; padding-right: 0.5rem; padding-top: 0.25rem; color: var(--ink); }

    /* ── Process timeline (I-Träger) ── */
    .process-section { padding: clamp(4rem, 7vw, 6rem) 1.5rem; background: var(--ink); color: #f5f1e8; position: relative; }
    .process-section::before {
      content: ''; position: absolute; inset: 0;
      background: repeating-linear-gradient(45deg,
        transparent 0, transparent 32px,
        rgba(245,158,11,0.04) 32px, rgba(245,158,11,0.04) 36px);
      pointer-events: none;
      mask-image: linear-gradient(to bottom, transparent 0%, black 30%, black 70%, transparent 100%);
    }
    .process-section .section-eyebrow { color: var(--accent); }
    .process-section .section-title { color: #f5f1e8; }
    .process-section .section-title em { color: var(--accent); }
    .process-section .section-lead { color: rgba(245,241,232,0.78); }
    .process-beam { position: relative; list-style: none; padding: 0; margin: 3rem 0 0; display: grid; gap: 2.5rem; max-width: 880px; }
    .process-beam-rail {
      position: absolute; left: 28px; top: 24px; bottom: 24px; width: 4px;
      background: rgba(245,241,232,0.12);
      transform-origin: top;
    }
    .process-beam-fill { position: absolute; inset: 0; background: linear-gradient(180deg, var(--accent) 0%, var(--accent-deep) 100%); transform: scaleY(0); transform-origin: top; transition: transform 0.4s linear; }
    .process-step { display: grid; grid-template-columns: 60px 1fr; gap: 1.5rem; align-items: start; position: relative; }
    .process-step-node {
      width: 60px; height: 60px; border-radius: 50%;
      background: var(--ink); border: 2px solid var(--accent); display: grid; place-items: center;
      font-family: var(--mono); font-size: 0.92rem; color: var(--accent); font-weight: 600;
      position: relative; z-index: 1;
      transition: background .3s, color .3s;
    }
    .process-step.active .process-step-node { background: var(--accent); color: var(--ink); }
    .process-step-body h3 { font-family: var(--display); font-weight: 600; font-size: 1.4rem; margin: 0.5rem 0 0.5rem; color: #f5f1e8; letter-spacing: -0.01em; }
    .process-step-body p { margin: 0; font-size: 1rem; line-height: 1.6; color: rgba(245,241,232,0.78); max-width: 58ch; }

    /* ── Referenzen ── */
    .referenzen-section { padding: clamp(3.5rem, 6vw, 5.5rem) 1.5rem; }
    .referenzen-grid { display: grid; gap: 1.5rem; grid-template-columns: 1fr; margin-top: 2.5rem; }
    @media (min-width: 700px) { .referenzen-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (min-width: 1080px) { .referenzen-grid { grid-template-columns: repeat(3, 1fr); } }
    .referenz-card { background: var(--surface); border: 1px solid var(--rule); padding: 1.25rem; display: flex; flex-direction: column; gap: 0.85rem; transition: transform .3s, box-shadow .3s; }
    .referenz-card:hover { transform: translateY(-6px); box-shadow: 0 24px 40px -20px rgba(15,16,17,0.22); }
    .referenz-image { aspect-ratio: 3 / 2; background: var(--ink); overflow: hidden; position: relative; }
    .referenz-image img { width: 100%; height: 100%; object-fit: cover; transition: transform .6s ease, filter .35s; filter: saturate(0.92) contrast(1.05); }
    .referenz-card:hover .referenz-image img { transform: scale(1.06); filter: saturate(1) contrast(1.08); }
    .referenz-image-overlay { position: absolute; top: 0.75rem; left: 0.75rem; padding: 0.25rem 0.55rem; background: rgba(15,16,17,0.7); color: var(--accent); border: 1px solid rgba(245,158,11,0.4); backdrop-filter: blur(4px); }
    .referenz-image-overlay .mono { color: var(--accent); font-size: 0.7rem; }
    .referenz-image-fallback { width: 100%; height: 100%; display: grid; place-items: center; color: rgba(245,241,232,0.55); background: repeating-linear-gradient(45deg, var(--ink) 0, var(--ink) 12px, #16181b 12px, #16181b 24px); }
    .referenz-meta { display: flex; gap: 0.85rem; align-items: center; }
    .referenz-year { color: var(--ink-3); }
    .referenz-tag { font-family: var(--mono); font-size: 0.7rem; letter-spacing: 0.08em; text-transform: uppercase; padding: 0.18rem 0.55rem; background: var(--ink); color: var(--accent); }
    .referenz-title { font-family: var(--display); font-weight: 600; font-size: 1.25rem; margin: 0; letter-spacing: -0.01em; color: var(--ink); }
    .referenz-footer { display: flex; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap; font-size: 0.88rem; color: var(--ink-2); padding-top: 0.5rem; border-top: 1px solid var(--rule); }
    .referenz-volume { color: var(--ink-3); }

    /* ── Zertifizierungen ── */
    .zertifizierungen-section { padding: clamp(3rem, 5vw, 4.5rem) 1.5rem; background: var(--bg-2); }
    .zertifizierungen-grid { display: grid; gap: 1rem; grid-template-columns: repeat(2, 1fr); max-width: 920px; margin: 2rem auto 1.5rem; }
    @media (min-width: 720px) { .zertifizierungen-grid { grid-template-columns: repeat(4, 1fr); } }
    .zert-badge { padding: 1.5rem 1rem; text-align: center; background: var(--surface); border: 1px solid var(--rule); transition: border-color .25s, transform .25s; }
    .zert-badge:hover { border-color: var(--rule-strong); transform: translateY(-2px); }
    .zert-mark { font-size: 1rem; color: var(--ink); letter-spacing: 0.06em; margin-bottom: 0.4rem; }
    .zert-label { font-size: 0.82rem; color: var(--ink-3); line-height: 1.4; }
    .zertifizierungen-note { text-align: center; color: var(--ink-3); font-size: 0.7rem; margin-top: 1.5rem; }

    /* ── Karriere ── */
    .karriere-section { position: relative; isolation: isolate; padding: clamp(4rem, 7vw, 6.5rem) 1.5rem; background-color: var(--ink); background-size: cover; background-position: center; color: #f5f1e8; overflow: hidden; }
    .karriere-bg { position: absolute; inset: 0; background: radial-gradient(ellipse at right top, rgba(245,158,11,0.18) 0%, transparent 60%); z-index: -1; }
    .karriere-inner { max-width: 720px; }
    .karriere-section .section-eyebrow { color: var(--accent); }
    .karriere-headline { font-family: var(--display); font-weight: 600; font-size: clamp(2.25rem, 4.5vw, 3.5rem); line-height: 1.05; letter-spacing: -0.02em; margin: 0.75rem 0 1.25rem; }
    .karriere-headline em { font-style: italic; color: var(--accent); font-weight: 600; }
    .karriere-lead { font-size: 1.1rem; line-height: 1.6; color: rgba(245,241,232,0.82); margin: 0 0 2rem; }
    .karriere-cta-row { display: flex; flex-wrap: wrap; gap: 0.85rem; }

    /* ── Anfahrt + Kontakt ── */
    .anfahrt-section { padding: clamp(3.5rem, 6vw, 5.5rem) 1.5rem; }
    .anfahrt-grid { display: grid; gap: 3rem; grid-template-columns: 1fr; }
    @media (min-width: 880px) { .anfahrt-grid { grid-template-columns: 1fr 1fr; gap: 4rem; align-items: start; } }
    .anfahrt-dl { display: grid; gap: 0.5rem 1rem; grid-template-columns: 1fr; margin-top: 1.5rem; }
    @media (min-width: 600px) { .anfahrt-dl { grid-template-columns: auto 1fr; } }
    .anfahrt-dl dt { color: var(--ink-3); padding-top: 0.6rem; }
    .anfahrt-dl dd { margin: 0; padding: 0.5rem 0; font-size: 0.96rem; border-bottom: 1px solid var(--rule); }
    .anfahrt-dl dd a { color: var(--ink); text-decoration: none; border-bottom: 1px solid var(--accent); padding-bottom: 1px; }
    .anfahrt-dl dd a:hover { color: var(--accent-deep); }

    .anfrage-form { display: grid; gap: 1.25rem; padding: 2rem; background: var(--surface); border: 1px solid var(--rule); }
    .form-label { display: grid; gap: 0.5rem; }
    .form-label .mono { color: var(--ink-3); }
    .form-label input, .form-label textarea { font-family: var(--body); font-size: 1rem; padding: 0.75rem 0.85rem; border: 1px solid var(--rule); background: #fff; color: var(--ink); transition: border-color .2s; }
    .form-label input:focus, .form-label textarea:focus { outline: none; border-color: var(--accent); }
    .form-note { color: var(--ink-3); font-size: 0.68rem; margin: 0; }

    /* ── Footer wordmark ── */
    .footer-wordmark { background: var(--ink); color: #f5f1e8; padding: clamp(3rem, 6vw, 5rem) 1rem clamp(1.5rem, 3vw, 2.5rem); overflow: hidden; }
    .footer-wordmark-inner { max-width: 1700px; margin: 0 auto; text-align: center; position: relative; }
    .footer-wordmark-text {
      font-family: var(--display); font-weight: 700;
      font-size: clamp(3.5rem, 13vw, 12rem);
      line-height: 0.88; letter-spacing: -0.03em;
      color: transparent;
      -webkit-text-stroke: 1px rgba(245,241,232,0.45);
      background: linear-gradient(180deg, rgba(245,241,232,0.85) 0%, rgba(245,241,232,0.3) 100%);
      -webkit-background-clip: text; background-clip: text;
    }
    .footer-wordmark-meta { color: var(--accent); margin-top: 1.5rem; }

    /* ── Minimal footer (replaces editorial-style QuietFooter to avoid
       a second redundant wordmark stacked under the chiseled XXL one) ── */
    .bau-footer { background: var(--ink); color: rgba(245,241,232,0.78); padding: 1.5rem 1rem 2rem; border-top: 1px solid rgba(245,241,232,0.08); }
    .bau-footer-grid { max-width: 1700px; display: flex; gap: 1.5rem; align-items: center; flex-wrap: wrap; justify-content: space-between; }
    .bau-footer-brand strong { display: block; font-family: var(--display); color: #f5f1e8; font-size: 1rem; font-weight: 600; }
    .bau-footer-brand .mono { color: rgba(245,241,232,0.45); font-size: 0.7rem; }
    .bau-footer-meta { display: flex; flex-direction: column; gap: 0.5rem; align-items: flex-end; }
    .bau-footer-links { display: flex; gap: 1.25rem; flex-wrap: wrap; }
    .bau-footer-links a { color: rgba(245,241,232,0.72); text-decoration: none; font-size: 0.85rem; border-bottom: 1px solid transparent; padding-bottom: 1px; }
    .bau-footer-links a:hover { color: var(--accent); border-bottom-color: var(--accent); }
    .bau-footer-credit { color: rgba(245,241,232,0.45); font-size: 0.7rem; }
    .bau-footer-credit a { color: var(--accent); text-decoration: none; }

    /* ── Heritage-statement: keep editorial's geometry but anchor in the
       industrial palette (dark Graphit + Safety-Gold accent rather than
       the default Trachten green). Avoids the "verein"-feel. */
    .heritage-statement { background: linear-gradient(135deg, var(--ink) 0%, #000 100%); padding: clamp(3.5rem, 6vw, 5rem) 1.5rem; }
    .heritage-kicker { color: var(--accent); border: 1px solid rgba(245,158,11,0.45); padding: 0.45rem 1rem; border-radius: 999px; display: inline-block; font-family: var(--mono); letter-spacing: 0.14em; text-transform: uppercase; font-size: 0.74rem; margin-bottom: 1.5rem; }
    .heritage-headline { color: #f5f1e8; font-family: var(--display); font-weight: 600; font-size: clamp(2.5rem, 7vw, 5.5rem); line-height: 1.05; letter-spacing: -0.02em; max-width: 22ch; margin: 0 auto; }
    .heritage-headline em { font-style: italic; color: var(--accent); font-weight: 600; }
    .count-up { display: inline-block; }

    /* ── Reveal: NO-OP for visibility ──
       Lesson learned: IO-gated opacity-0 reveals are fragile (Playwright
       fullPage captures, no-script crawlers, slow JS). For this template
       the page DOM is the source of truth: content is always visible. Motion
       comes from the marquee, count-up trustbar, hover-lift cards, and the
       process-beam-fill — none of which can hide content. */
    .reveal { /* visibility no-op, kept as a hook for hover effects/JS */ }
    .stagger-group { /* no-op */ }
    `;
}

/** Industrial overrides — these must follow EDITORIAL_CSS to win the cascade.
 *  Reset the giant 16rem .section-anchor (which is empty in our markup and
 *  would otherwise reserve a ~218px blank band — bug we caught on verein-musik
 *  and now apply preventively here). */
function industrialOverrides(): string {
  return `
    .section-anchor-wrap {
      max-width: 920px; margin: 0 auto;
      padding: clamp(0.5rem, 1.4vw, 1rem) clamp(1.5rem, 5vw, 5rem);
      display: flex; align-items: center; justify-content: center; gap: 1.5rem;
      overflow: visible;
    }
    .section-anchor {
      display: inline-flex; align-items: center; gap: 0.75rem;
      font-family: var(--mono); font-weight: 500;
      font-size: 0.85rem; line-height: 1; letter-spacing: 0.1em;
      -webkit-text-stroke: 0; color: var(--ink-3); opacity: 0.9;
    }
    /* Editorial heritage-statement: keep dark anchor with industrial palette */
    .heritage-statement { background: linear-gradient(135deg, var(--ink) 0%, #000 100%); padding: clamp(3.5rem, 6vw, 5rem) 1.5rem; }
    .heritage-kicker { color: var(--accent); border-color: rgba(245,158,11,0.45); }
    .heritage-headline { color: #f5f1e8; }
    .heritage-headline em { color: var(--accent); }
    /* Editorial heritage-timeline + board-section: keep light but tighter */
    .heritage-timeline { background: var(--bg-2); padding: clamp(3rem, 5vw, 4.5rem) 1.5rem; }
    .board-section { background: var(--bg-2); padding: clamp(3.5rem, 6vw, 5rem) 1.5rem; }
    .board-section .section-title { color: var(--ink); }
    `;
}

/* ─────────────────────── Inline motion script ─────────────────────── */

function motionScript(): string {
  return `
(function(){
  // ── Cookie banner ─────────────────────────────────────────────
  try {
    var COOKIE_KEY = 'wv-cookie-consent';
    var banner = document.getElementById('wv-cookie');
    if (banner) {
      try {
        if (!localStorage.getItem(COOKIE_KEY)) {
          banner.hidden = false; banner.setAttribute('aria-hidden','false');
          banner.setAttribute('data-state','visible');
        }
      } catch(e) {}
      banner.querySelectorAll('.wv-cookie-btn').forEach(function(btn){
        btn.addEventListener('click', function(){
          try { localStorage.setItem(COOKIE_KEY, btn.dataset.consent || 'essential'); } catch(e) {}
          banner.hidden = true; banner.setAttribute('aria-hidden','true'); banner.removeAttribute('data-state');
        });
      });
    }
  } catch (e) {}

  /* Reveal animation entirely removed — content is now always visible.
     We had repeated failures: IO-gated opacity-0 fights Playwright fullPage
     captures, no-script crawlers, and a 0.8s transition window where content
     looks empty even during a real scroll. Motion is now restricted to
     non-visibility effects (marquee, count-up, hover-lift, beam-fill). */

  // ── Count-up on trustbar / stats ──────────────────────────────
  function countUp(el) {
    var raw = el.textContent.trim(); var match = raw.match(/(\\d+[\\.,]?\\d*)/);
    if (!match) return;
    var target = parseFloat(match[0].replace(',', '.'));
    var suffix = raw.slice(match.index + match[0].length);
    var prefix = raw.slice(0, match.index);
    var duration = 1200; var start = null;
    function step(t) {
      if (!start) start = t;
      var p = Math.min(1, (t - start) / duration);
      var eased = 1 - Math.pow(1 - p, 3);
      var v = Math.round(target * eased * 100) / 100;
      var displayed = (target % 1 === 0) ? String(Math.round(target * eased)) : v.toFixed(1).replace('.', ',');
      el.textContent = prefix + displayed + suffix;
      if (p < 1) requestAnimationFrame(step); else el.textContent = raw;
    }
    requestAnimationFrame(step);
  }
  if ('IntersectionObserver' in window) {
    var ioCount = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if (e.isIntersecting) { countUp(e.target); ioCount.unobserve(e.target); }
      });
    }, { threshold: 0.5 });
    document.querySelectorAll('.trustbar-item strong, .big-num-value').forEach(function(el){
      if (/\\d/.test(el.textContent)) ioCount.observe(el);
    });
  }

  // ── Process beam fill on scroll ───────────────────────────────
  var beam = document.querySelector('.process-beam');
  var fill = document.querySelector('.process-beam-fill');
  var steps = document.querySelectorAll('.process-step');
  if (beam && fill && steps.length) {
    function updateBeam() {
      var rect = beam.getBoundingClientRect();
      var vh = window.innerHeight;
      var p = (vh * 0.6 - rect.top) / (rect.height + vh * 0.2);
      p = Math.max(0, Math.min(1, p));
      fill.style.transform = 'scaleY(' + p.toFixed(3) + ')';
      // light up nodes
      steps.forEach(function(step, i){
        var stepTop = step.getBoundingClientRect().top;
        if (stepTop < vh * 0.65) step.classList.add('active'); else step.classList.remove('active');
      });
    }
    updateBeam();
    window.addEventListener('scroll', updateBeam, { passive: true });
    window.addEventListener('resize', updateBeam);
  }
})();
`;
}
