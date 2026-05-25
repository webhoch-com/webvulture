/**
 * Einzelhandel template — boutique, product-led, editorial.
 * Soft cream-rose palette, generous photo grids, lookbook feel.
 * Inspired by independent fashion stores (& Other Stories, Cos, A Kind of Guise).
 */

import type { SiteSpec } from '../types.js';
import { renderSeoHead } from './_seo.js';
import { getGalleryImage } from './_media.js';
import { getBranchPreset } from './_branch_presets.js';
import {
  escapeHtml,
  extractFoundedYear,
  buildMarqueeItems,
  pickPullQuote,
  renderMarquee,
  renderPullQuote,
  renderRatingPill,
  renderQuietFooter,
  renderTrustBar,
  EDITORIAL_CSS,
} from './_editorial.js';

function product(spec: SiteSpec, slug: string, idx: number, w = 600, h = 800): string {
  return getGalleryImage(spec, slug, idx, w, h);
}

export function renderEinzelhandelPage(spec: SiteSpec, slug: string): string {
  const PRESET = getBranchPreset('einzelhandel');
  const primary = spec.brand.primary_color || PRESET.primary;
  const secondary = spec.brand.secondary_color || PRESET.secondary;
  const accent = spec.brand.accent_color || PRESET.accent;
  const headingFont = spec.brand.heading_font_family
    ? `'${spec.brand.heading_font_family}', ${PRESET.display_font}`
    : PRESET.display_font;
  const bodyFont = spec.brand.body_font_family
    ? `'${spec.brand.body_font_family}', ${PRESET.body_font}`
    : PRESET.body_font;
  const fontImports = (spec.brand?.font_imports && spec.brand.font_imports.length > 0)
    ? spec.brand.font_imports
    : PRESET.font_imports;
  const fontImportTags = fontImports
    .map(u => `<link rel="stylesheet" href="${escapeHtml(u)}" crossorigin>`).join('\n  ');

  const businessName = escapeHtml(spec.business_name);
  const tagline = spec.tagline;
  const headline = spec.hero.headline;
  const subhead = escapeHtml(spec.hero.subheadline);
  const ctaText = escapeHtml(spec.hero.cta_text || PRESET.cta_text);

  const foundedYear = extractFoundedYear(spec);
  const marqueeItems = buildMarqueeItems(spec, foundedYear);
  const pullQuote = pickPullQuote(spec);

  const trustStats: Array<{ value: string; label: string }> = [];
  if (foundedYear) {
    const years = new Date().getFullYear() - foundedYear;
    if (years > 0) trustStats.push({ value: `${years}+`, label: 'Jahre Erfahrung' });
  }
  if (spec.business?.rating && spec.business?.review_count && spec.business.review_count >= 5) {
    trustStats.push({ value: `${spec.business.rating.toFixed(1).replace('.', ',')} ★`, label: `${spec.business.review_count} Bewertungen` });
  }

  const collections = [
    { name: 'Damenmode', tag: 'WOMEN', subtitle: 'Spring · Summer 2026' },
    { name: 'Herrenmode', tag: 'MEN', subtitle: 'Klassik trifft Casual' },
    { name: 'Accessoires', tag: 'ACCESSOIRES', subtitle: 'Taschen · Schals · Schmuck' },
  ];

  const services = spec.services && spec.services.length >= 3 ? spec.services : [
    { name: 'Persönliche Beratung', description: 'Stilberatung, Maßanpassung — Termine nach Vereinbarung.' },
    { name: 'Maßänderungen', description: 'Hausschneiderei direkt im Geschäft, meist binnen 5 Werktagen.' },
    { name: 'Geschenkservice', description: 'Verpackung, Lieferung in der Region, Gutscheine.' },
  ];

  const phone = spec.contact.phone ? escapeHtml(spec.contact.phone) : '';
  const email = spec.contact.email ? escapeHtml(spec.contact.email) : '';
  const address = spec.contact.address ? escapeHtml(spec.contact.address) : '';

  return `---
---
<!DOCTYPE html>
<html lang="de">
<head>
  ${renderSeoHead(spec, { slug, schemaKind: 'Store' })}
  ${fontImportTags}
  <style>
    :root {
      --bg: ${PRESET.bg};
      --bg-2: #f5e8e0;
      --surface: #ffffff;
      --ink: ${PRESET.ink};
      --ink-2: #6b5d57;
      --ink-3: #a89e98;
      --primary: ${escapeHtml(primary)};
      --primary-deep: color-mix(in oklch, ${escapeHtml(primary)} 70%, black);
      --secondary: ${escapeHtml(secondary)};
      --accent: ${escapeHtml(accent)};
      --rule: rgba(31,23,21,0.10);
      --display: ${headingFont};
      --serif: ${headingFont};
      --sans: ${bodyFont};
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body { background: var(--bg); color: var(--ink); font-family: var(--sans); font-weight: 300; line-height: 1.6; -webkit-font-smoothing: antialiased; overflow-x: hidden; }
    img { display: block; max-width: 100%; }
    a { color: inherit; text-decoration: none; }

    .demo-banner { background: #1a0a1f; color:#fff; padding:0.55rem 1rem; font-size:0.82rem; position: relative; z-index: 200; border-bottom: 1px solid rgba(236,101,186,0.35); }
    .demo-banner-inner { max-width: 1280px; margin: 0 auto; display: flex; align-items: center; gap: 0.85rem; flex-wrap: wrap; justify-content: center; }
    .demo-banner-tag { font-size: 0.7rem; letter-spacing: 0.16em; text-transform: uppercase; padding: 0.18rem 0.55rem; border-radius: 999px; background: rgba(236,101,186,0.22); border: 1px solid rgba(236,101,186,0.5); color: #ffd6ee; font-weight: 700; white-space: nowrap; }
    .demo-banner a { color: #ffb3df; font-weight: 700; border-bottom: 1px solid rgba(255,179,223,0.45); }

    /* ─── Header ────────────────────────────────────────── */
    .nav {
      background: var(--bg); border-bottom: 1px solid var(--rule);
      position: sticky; top: 0; z-index: 50;
    }
    .nav-inner {
      max-width: 1300px; margin: 0 auto; padding: 1.4rem 1.5rem;
      display: flex; align-items: center; justify-content: space-between; gap: 1.5rem;
    }
    .brand-mark {
      font-family: var(--serif); font-weight: 500; font-size: 1.7rem;
      letter-spacing: 0.06em; color: var(--ink);
    }
    .main-nav { display: none; gap: 2.5rem; font-size: 0.85rem; font-weight: 400; letter-spacing: 0.06em; text-transform: uppercase; }
    .main-nav a { color: var(--ink-2); transition: color .25s; }
    .main-nav a:hover { color: var(--ink); }
    @media (min-width: 880px) { .main-nav { display: flex; } }
    /* ─── Mobile burger menu ─────────────────────────────── */
    .nav-toggle {
      position: absolute; width: 1px; height: 1px;
      overflow: hidden; clip: rect(0,0,0,0);
      white-space: nowrap; border: 0;
    }
    .nav-toggle:focus-visible ~ .nav-burger { outline: 2px solid currentColor; outline-offset: 3px; }
    .nav-burger {
      display: none; cursor: pointer;
      width: 44px; height: 44px;
      align-items: center; justify-content: center;
      border-radius: 8px; background: transparent;
      border: 1px solid var(--rule, rgba(0,0,0,0.1));
      flex-shrink: 0;
      transition: background .2s, border-color .2s;
    }
    .nav-burger:hover { background: rgba(0,0,0,0.04); }
    .nav-burger span {
      display: block; width: 18px; height: 2px;
      background: currentColor; border-radius: 2px;
      position: relative; transition: transform .25s ease, background .2s ease;
    }
    .nav-burger span::before, .nav-burger span::after {
      content: ""; position: absolute; left: 0;
      width: 18px; height: 2px;
      background: currentColor; border-radius: 2px;
      transition: transform .25s ease, top .25s ease;
    }
    .nav-burger span::before { top: -6px; }
    .nav-burger span::after  { top:  6px; }
    .nav-toggle:checked ~ .nav-burger span { background: transparent; }
    .nav-toggle:checked ~ .nav-burger span::before { top: 0; transform: rotate(45deg); }
    .nav-toggle:checked ~ .nav-burger span::after  { top: 0; transform: rotate(-45deg); }
    @media (max-width: 879px) {
      .nav-burger { display: inline-flex; }
      .main-nav {
        position: absolute; top: 100%; left: 0; right: 0;
        display: flex; flex-direction: column; gap: 0;
        background: var(--bg);
        border-bottom: 1px solid var(--rule, rgba(0,0,0,0.1));
        box-shadow: 0 14px 30px -16px rgba(0,0,0,0.18);
        padding: 0.25rem 1.5rem 1rem;
        transform: translateY(-12px); opacity: 0; pointer-events: none;
        transition: transform .25s ease, opacity .25s ease;
      }
      .main-nav a {
        padding: 0.95rem 0;
        border-bottom: 1px solid var(--rule, rgba(0,0,0,0.1));
        font-size: 1rem;
        min-height: 44px;
        display: flex; align-items: center;
      }
      .main-nav a:last-child { border-bottom: none; }
      .nav-toggle:checked ~ .main-nav {
        transform: translateY(0); opacity: 1; pointer-events: auto;
      }
    }
    .nav-action { font-size: 0.85rem; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ink); border-bottom: 1px solid var(--ink); padding-bottom: 2px; transition: color .2s, border-color .2s; }
    .nav-action:hover { color: var(--accent); border-color: var(--accent); }

    /* ─── Hero — split with photo ──────────────────────── */
    .hero {
      display: grid; gap: 0;
      grid-template-columns: 1fr;
    }
    @media (min-width: 880px) {
      .hero { grid-template-columns: 1.1fr 1fr; min-height: 80vh; }
    }
    .hero-text {
      padding: clamp(3.5rem, 7vw, 6.5rem) clamp(1.5rem, 5vw, 4rem);
      display: flex; flex-direction: column; justify-content: center;
    }
    .hero-eyebrow {
      font-size: 0.75rem; letter-spacing: 0.24em; text-transform: uppercase;
      color: var(--accent); font-weight: 500;
      margin-bottom: 2rem;
    }
    .hero h1 {
      font-family: var(--serif); font-weight: 400;
      font-size: clamp(2.5rem, 6vw, 5rem); line-height: 1; letter-spacing: -0.02em;
      max-width: 14ch;
    }
    .hero h1 em { font-style: italic; color: var(--accent); font-weight: 400; }
    .hero p { color: var(--ink-2); font-size: 1.05rem; margin-top: 1.75rem; max-width: 460px; line-height: 1.7; }
    .hero-cta-row { display: flex; gap: 1.5rem; margin-top: 2.5rem; flex-wrap: wrap; align-items: center; }
    .btn-primary {
      background: var(--ink); color: var(--bg);
      padding: 1.05rem 1.85rem;
      font-weight: 500; font-size: 0.85rem; letter-spacing: 0.08em; text-transform: uppercase;
      transition: background .2s;
    }
    .btn-primary:hover { background: var(--accent); }
    .btn-link {
      font-size: 0.85rem; letter-spacing: 0.08em; text-transform: uppercase;
      border-bottom: 1px solid var(--ink); padding-bottom: 4px; font-weight: 500;
      transition: border-color .2s, color .2s;
    }
    .btn-link:hover { color: var(--accent); border-color: var(--accent); }
    .hero-image {
      background-image: url('${product(spec, slug, 0, 1200, 1500)}');
      background-size: cover; background-position: center;
      min-height: 60vh;
    }

    /* ─── Marquee ────────────────────────────────────────── */
    .info-strip {
      background: var(--bg-2); padding: 1rem 1.5rem;
      font-size: 0.82rem; letter-spacing: 0.08em; text-transform: uppercase;
      text-align: center; color: var(--ink-2);
    }
    .info-strip strong { color: var(--ink); }

    /* ─── Section base ───────────────────────────────────── */
    .section { padding: clamp(5rem, 9vw, 9rem) 1.5rem; }
    .container { max-width: 1300px; margin: 0 auto; }
    .section-eyebrow { display: inline-block; font-size: 0.75rem; letter-spacing: 0.24em; text-transform: uppercase; color: var(--accent); font-weight: 500; margin-bottom: 1.5rem; }
    .section-title {
      font-family: var(--serif); font-weight: 400;
      font-size: clamp(2.25rem, 5vw, 4rem); line-height: 1.05; letter-spacing: -0.02em;
      margin-bottom: 1.5rem;
    }
    .section-title em { font-style: italic; color: var(--accent); }
    .section-lead { color: var(--ink-2); font-size: 1.05rem; line-height: 1.75; max-width: 580px; }
    .section-head.center { text-align: center; }
    .section-head.center .section-lead { margin-inline: auto; }

    /* ─── Collections — large product cards ─────────────── */
    .collections-grid {
      display: grid; gap: 2rem;
      grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr));
      margin-top: 4rem;
    }
    @media (min-width: 880px) { .collections-grid { grid-template-columns: repeat(3, 1fr); gap: 2.5rem; } }
    .collection {
      display: flex; flex-direction: column; gap: 1.25rem;
      transition: transform .35s ease;
    }
    .collection:hover { transform: translateY(-4px); }
    .collection-photo {
      aspect-ratio: 3/4; overflow: hidden;
    }
    .collection-photo img {
      width: 100%; height: 100%; object-fit: cover;
      transition: transform 1s ease;
    }
    .collection:hover .collection-photo img { transform: scale(1.04); }
    .collection-info {
      display: flex; justify-content: space-between; align-items: baseline; gap: 1rem;
      padding: 0 0.25rem;
    }
    .collection-name { font-family: var(--serif); font-size: 1.6rem; font-weight: 500; line-height: 1; }
    .collection-tag { font-size: 0.72rem; letter-spacing: 0.18em; color: var(--accent); font-weight: 500; }
    .collection-sub { color: var(--ink-3); font-size: 0.92rem; padding: 0 0.25rem; line-height: 1.5; }

    /* ─── Lookbook — masonry-ish ─────────────────────────── */
    .lookbook { background: var(--bg-2); padding: clamp(5rem, 9vw, 9rem) 1.5rem; }
    .lookbook-grid {
      max-width: 1400px; margin: 4rem auto 0;
      display: grid; gap: 1rem;
      grid-template-columns: repeat(auto-fit, minmax(min(220px, 100%), 1fr));
    }
    @media (min-width: 700px) { .lookbook-grid { grid-template-columns: repeat(3, 1fr); } }
    @media (min-width: 1000px) { .lookbook-grid { grid-template-columns: repeat(4, 1fr); } }
    .look-tile {
      aspect-ratio: 3/4; overflow: hidden;
    }
    .look-tile img { width: 100%; height: 100%; object-fit: cover; transition: transform 1s ease; }
    .look-tile:hover img { transform: scale(1.03); }

    /* ─── Services / store info ──────────────────────────── */
    .services-grid {
      display: grid; gap: 2rem;
      grid-template-columns: repeat(auto-fit, minmax(min(260px, 100%), 1fr));
      margin-top: 4rem;
    }
    @media (min-width: 880px) { .services-grid { grid-template-columns: repeat(3, 1fr); gap: 3rem; } }
    .service-card {
      padding-top: 2rem; border-top: 1px solid var(--rule);
    }
    .service-card h3 { font-family: var(--serif); font-weight: 500; font-size: 1.5rem; line-height: 1.2; margin-bottom: 0.85rem; }
    .service-card p { color: var(--ink-2); font-size: 0.95rem; line-height: 1.7; }

    /* ─── Visit / hours ─────────────────────────────────── */
    .visit-section {
      display: grid; gap: 0;
      grid-template-columns: 1fr;
      background: var(--ink); color: var(--bg);
    }
    @media (min-width: 880px) { .visit-section { grid-template-columns: 1fr 1fr; } }
    .visit-text { padding: clamp(4rem, 7vw, 6rem) clamp(1.5rem, 5vw, 4rem); }
    .visit-text .section-eyebrow { color: var(--accent); }
    .visit-text h2 { font-family: var(--serif); font-weight: 400; font-size: clamp(2rem, 4vw, 3.25rem); line-height: 1.1; margin-bottom: 1.5rem; color: #fff; }
    .visit-text h2 em { font-style: italic; color: var(--accent); }
    .visit-text p { color: rgba(253,246,243,0.78); margin-bottom: 1.5rem; line-height: 1.7; max-width: 460px; }
    .visit-info { display: flex; flex-direction: column; gap: 1.25rem; margin-top: 2.5rem; }
    .visit-info .row { display: grid; grid-template-columns: auto 1fr; gap: 1.5rem; align-items: baseline; padding: 1.25rem 0; border-bottom: 1px solid rgba(255,255,255,0.12); }
    .visit-info .lbl { font-size: 0.74rem; letter-spacing: 0.18em; text-transform: uppercase; color: var(--ink-3); font-weight: 500; min-width: 8ch; }
    .visit-info .val { color: #fff; font-size: 1rem; }
    .visit-info a { color: #fff; }
    .visit-info a:hover { color: var(--accent); }
    .visit-image {
      background-image: url('${product(spec, slug, 99, 1000, 1200)}');
      background-size: cover; background-position: center;
      min-height: 50vh;
    }

    footer { background: var(--bg); color: var(--ink-3); padding: 3rem 1.5rem; text-align: center; font-size: 0.82rem; border-top: 1px solid var(--rule); }
    footer .brand { font-family: var(--serif); font-size: 1.3rem; color: var(--ink); margin-bottom: 0.5rem; letter-spacing: 0.04em; }
    footer .legal { display: flex; gap: 1.5rem; justify-content: center; margin-top: 1rem; flex-wrap: wrap; }
    footer .legal a:hover { color: var(--accent); }

    .reveal { opacity: 1; transform: none; }
    /* visible by default */
    @media (prefers-reduced-motion: reduce) { .reveal { opacity: 1 !important; transform: none !important; } }

    ${EDITORIAL_CSS}
  </style>
</head>
<body>

<div class="demo-banner" role="contentinfo">
  <div class="demo-banner-inner">
    <span class="demo-banner-tag">Demo-Vorschau</span>
    <span class="demo-banner-text">
      Erstellt von
      <a href="https://webhoch.com" target="_blank" rel="noopener">Webagentur Hochmeir e.U.</a>
      ·
      <a href="https://webhoch.com/#contact" target="_blank" rel="noopener">Beratung anfragen</a>
    </span>
  </div>
</div>

<div class="info-strip">
  <strong>Frühjahr / Sommer 2026</strong> · Neue Kollektion eingetroffen — täglich Donnerstag bis Samstag im Geschäft.
</div>

<header class="nav">
  <div class="nav-inner">
    <a class="brand-mark" href="#">${businessName}</a>
    <input type="checkbox" id="nav-toggle" class="nav-toggle" aria-label="Menü öffnen" />
    <label for="nav-toggle" class="nav-burger" aria-hidden="true"><span></span></label>
    <nav class="main-nav">
      <a href="#kollektionen">Kollektionen</a>
      <a href="#lookbook">Lookbook</a>
      <a href="#services">Leistungen</a>
      <a href="#besuchen">Besuchen</a>
    </nav>
    <a href="#besuchen" class="nav-action">Im Geschäft</a>
  </div>
</header>

<section class="hero">
  <div class="hero-text">
    <div class="hero-eyebrow">${escapeHtml(tagline.slice(0, 60))}</div>
    <h1>${escapeHtml(headline.replace(/(\S+)\.\s*$/, '|$1|.'))
            .replace(/\|([^|]+)\|/, '<em>$1</em>')}</h1>
    <p>${subhead}</p>
    ${renderRatingPill(spec)}
    <div class="hero-cta-row">
      <a href="#kollektionen" class="btn-primary">Kollektionen ansehen</a>
      <a href="#besuchen" class="btn-link">Im Geschäft besuchen →</a>
    </div>
  </div>
  <div class="hero-image" aria-hidden="true"></div>
</section>

${renderMarquee(marqueeItems)}

${renderTrustBar(trustStats)}

<section id="kollektionen" class="section">
  <div class="container">
    <div class="section-head reveal" style="max-width: 720px;">
      <div class="section-eyebrow">Kollektionen</div>
      <h2 class="section-title">Drei Welten,<br>eine <em>Handschrift</em>.</h2>
      <p class="section-lead">Sorgfältig kuratierte Marken aus Europa und Übersee — viele davon exklusiv in unserer Region. Wir wählen aus, damit Sie sich den Aufwand sparen.</p>
    </div>
    <div class="collections-grid">
      ${collections.map((c, i) => `
        <article class="collection reveal">
          <div class="collection-photo"><img src="${product(spec, slug, i + 10, 700, 900)}" alt="${escapeHtml(c.name)}" loading="lazy"></div>
          <div class="collection-info">
            <span class="collection-name">${escapeHtml(c.name)}</span>
            <span class="collection-tag">${escapeHtml(c.tag)}</span>
          </div>
          <div class="collection-sub">${escapeHtml(c.subtitle)}</div>
        </article>
      `).join('')}
    </div>
  </div>
</section>

<section id="lookbook" class="lookbook">
  <div class="container">
    <div class="section-head center reveal">
      <div class="section-eyebrow">Lookbook</div>
      <h2 class="section-title">Frühjahr / <em>Sommer</em>.</h2>
      <p class="section-lead">Auszug aus der aktuellen Kollektion. Vollständig im Geschäft — wir freuen uns über Ihren Besuch.</p>
    </div>
    <div class="lookbook-grid">
      ${[20,21,22,23,24,25,26,27].map(i => `
        <div class="look-tile reveal"><img src="${product(spec, slug, i, 500, 700)}" alt="" loading="lazy"></div>
      `).join('')}
    </div>
  </div>
</section>

<section id="services" class="section">
  <div class="container">
    <div class="section-head reveal" style="max-width: 720px;">
      <div class="section-eyebrow">Leistungen</div>
      <h2 class="section-title">Mehr als nur <em>verkaufen</em>.</h2>
      <p class="section-lead">Persönliche Beratung, Maßänderungen, Geschenkservice — alles unter einem Dach.</p>
    </div>
    <div class="services-grid">
      ${services.map(s => `
        <article class="service-card reveal">
          <h3>${escapeHtml(s.name)}</h3>
          <p>${escapeHtml(s.description)}</p>
        </article>
      `).join('')}
    </div>
  </div>
</section>

<section id="besuchen" class="visit-section">
  <div class="visit-text">
    <div class="section-eyebrow">Besuchen</div>
    <h2>Mitten in der Stadt — und doch <em>persönlich</em>.</h2>
    <p>Wir freuen uns auf Sie — kommen Sie gern unverbindlich vorbei. Beratung jederzeit ohne Termin, Maßnahme bevorzugt mit.</p>
    <div class="visit-info">
      ${address ? `<div class="row"><span class="lbl">Adresse</span><span class="val">${address}</span></div>` : ''}
      <div class="row"><span class="lbl">Öffnungszeiten</span><span class="val">Mo–Fr 10:00 – 18:00 · Sa 10:00 – 16:00</span></div>
      ${phone ? `<div class="row"><span class="lbl">Telefon</span><span class="val"><a href="tel:${phone.replace(/\s/g, '')}">${phone}</a></span></div>` : ''}
      ${email ? `<div class="row"><span class="lbl">E-Mail</span><span class="val"><a href="mailto:${email}">${email}</a></span></div>` : ''}
    </div>
  </div>
  <div class="visit-image" aria-hidden="true"></div>
</section>

${renderPullQuote(pullQuote, spec.business_name)}

${renderQuietFooter({
  businessName: spec.business_name,
  tagline: spec.tagline,
  ctaText,
  ctaHref: '#besuchen',
  socials: spec.socials,
})}

<script>
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('is-visible'); });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px' });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
</script>
</body>
</html>
`;
}
