/**
 * Autohaus / Immobilienmakler / Bauträger template — vehicle/object-led, premium dealer style.
 * Dark navy + steel palette. Big inventory cards with prices. Service grid. Test-drive CTA.
 * Inspired by Porsche / Mercedes-Benz dealership sites.
 */

import type { SiteSpec } from '../types.js';
import { renderSeoHead } from './_seo.js';
import { getGalleryImage, getHeroImage } from './_media.js';
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

function vehiclePhoto(spec: SiteSpec, slug: string, idx: number, w = 1000, h = 670): string {
  return getGalleryImage(spec, slug, idx, w, h);
}

export function renderAutohausPage(spec: SiteSpec, slug: string): string {
  const PRESET = getBranchPreset('autohaus');
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

  // Inventar: bei realem Lead aus spec.vehicles (Enrichment befüllt aus alter Webseite),
  // sonst 3 generische Modell-Kategorien — keine konkreten Markennamen, um keine
  // implizite Mehrmarkenhändler-Behauptung zu erzeugen.
  const inventory = (spec as any).vehicles && Array.isArray((spec as any).vehicles) && (spec as any).vehicles.length > 0
    ? (spec as any).vehicles.slice(0, 6)
    : [
        { brand: 'Modell A', model: 'Kompakt-SUV · Diesel', detail: '2024 · ca. 18.500 km · Automatik · Topausstattung', price: 'auf Anfrage', photo: 1 },
        { brand: 'Modell B', model: 'Mittelklasse-Kombi', detail: '2023 · ca. 32.000 km · Schaltgetriebe · gepflegt', price: 'auf Anfrage', photo: 2 },
        { brand: 'Modell C', model: 'Elektro-SUV', detail: '2024 · ca. 9.800 km · ca. 480 km Reichweite', price: 'auf Anfrage', photo: 3 },
      ];

  const services = spec.services && spec.services.length >= 3 ? spec.services : [
    { name: 'Neuwagen', description: 'Aktuelle Modelle aller Hauptmarken — ab Lager oder konfigurierbar.' },
    { name: 'Junge Gebrauchte', description: 'Höchstens 3 Jahre, scheckheftgepflegt, 12 Monate Garantie.' },
    { name: 'Service & Reparatur', description: 'Markenwerkstatt mit Originalteilen für alle gängigen Hersteller.' },
    { name: '§ 57a Begutachtung', description: 'Pickerl direkt vor Ort — meist ohne Voranmeldung.' },
    { name: 'Finanzierung & Leasing', description: 'Über alle Hausbanken, auch Restwert-Leasing.' },
    { name: 'Probefahrten', description: 'Auch über das Wochenende — Termin online oder telefonisch.' },
  ];

  const phone = spec.contact.phone ? escapeHtml(spec.contact.phone) : '';
  const email = spec.contact.email ? escapeHtml(spec.contact.email) : '';
  const address = spec.contact.address ? escapeHtml(spec.contact.address) : '';

  return `---
---
<!DOCTYPE html>
<html lang="de">
<head>
  ${renderSeoHead(spec, { slug, schemaKind: 'AutomotiveBusiness' })}
  ${fontImportTags}
  <style>
    :root {
      --bg: ${PRESET.bg};
      --bg-2: #e8ebf0;
      --surface: #ffffff;
      --ink: ${PRESET.ink};
      --ink-2: #3a4256;
      --ink-3: #6b7280;
      --primary: ${escapeHtml(primary)};
      --primary-deep: color-mix(in oklch, ${escapeHtml(primary)} 70%, black);
      --secondary: ${escapeHtml(secondary)};
      --accent: ${escapeHtml(accent)};
      --accent-dark: color-mix(in oklch, ${escapeHtml(accent)} 70%, black);
      --rule: rgba(12,18,32,0.10);
      --display: ${headingFont};
      --serif: ${headingFont};
      --sans: ${bodyFont};
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body { background: var(--bg); color: var(--ink); font-family: var(--sans); line-height: 1.6; -webkit-font-smoothing: antialiased; overflow-x: hidden; }
    img { display: block; max-width: 100%; }
    a { color: inherit; text-decoration: none; }

    .demo-banner { background: #1a0a1f; color:#fff; padding:0.55rem 1rem; font-size:0.82rem; position: relative; z-index: 200; border-bottom: 1px solid rgba(236,101,186,0.35); }
    .demo-banner-inner { max-width: 1280px; margin: 0 auto; display: flex; align-items: center; gap: 0.85rem; flex-wrap: wrap; justify-content: center; }
    .demo-banner-tag { font-size: 0.7rem; letter-spacing: 0.16em; text-transform: uppercase; padding: 0.18rem 0.55rem; border-radius: 999px; background: rgba(236,101,186,0.22); border: 1px solid rgba(236,101,186,0.5); color: #ffd6ee; font-weight: 700; white-space: nowrap; }
    .demo-banner a { color: #ffb3df; font-weight: 700; border-bottom: 1px solid rgba(255,179,223,0.45); }

    /* ─── Header ────────────────────────────────────────── */
    .nav {
      background: var(--ink); color: #fff;
      position: sticky; top: 0; z-index: 50;
    }
    .nav-inner {
      max-width: 1400px; margin: 0 auto; padding: 1rem 1.5rem;
      display: flex; align-items: center; justify-content: space-between; gap: 1.5rem;
    }
    .brand-mark {
      font-family: var(--display); font-weight: 800; font-size: 1.5rem;
      letter-spacing: 0.02em; color: #fff;
    }
    .brand-mark .ic { display: inline-block; width: 0.35rem; height: 0.35rem; background: var(--accent); margin-right: 0.55rem; vertical-align: middle; transform: rotate(45deg); }
    .main-nav { display: none; gap: 2rem; font-size: 0.88rem; font-weight: 500; letter-spacing: 0.04em; }
    .main-nav a { color: rgba(255,255,255,0.82); transition: color .2s; }
    .main-nav a:hover { color: var(--accent); }
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
      .nav-burger { display: inline-flex; border-color: rgba(255,255,255,0.25); }
      .nav-burger:hover { background: rgba(255,255,255,0.06); }
      .main-nav {
        position: absolute; top: 100%; left: 0; right: 0;
        display: flex; flex-direction: column; gap: 0;
        background: var(--ink);
        box-shadow: 0 14px 30px -16px rgba(0,0,0,0.4);
        padding: 0.25rem 1.5rem 1rem;
        transform: translateY(-12px); opacity: 0; pointer-events: none;
        transition: transform .25s ease, opacity .25s ease;
      }
      .main-nav a {
        padding: 0.95rem 0;
        border-bottom: 1px solid rgba(255,255,255,0.1);
        font-size: 1rem;
        min-height: 44px;
        display: flex; align-items: center;
      }
      .main-nav a:last-child { border-bottom: none; }
      .nav-toggle:checked ~ .main-nav {
        transform: translateY(0); opacity: 1; pointer-events: auto;
      }
    }
    .nav-cta {
      background: var(--accent); color: var(--ink);
      padding: 0.85rem 1.5rem;
      font-weight: 600; font-size: 0.85rem; letter-spacing: 0.04em;
      transition: background .2s, transform .2s;
    }
    .nav-cta:hover { background: #fff; transform: translateY(-1px); }
    @media (max-width: 879px) { .nav-cta { display: none; } }

    /* ─── Hero — full-bleed photo + overlay ──────────────── */
    .hero {
      position: relative; min-height: 85vh; overflow: hidden;
      display: grid; place-items: center start;
      isolation: isolate; padding: 4rem 2rem;
    }
    .hero-img { position: absolute; inset: 0; z-index: -2; background-size: cover; background-position: center; }
    .hero::after { content: ''; position: absolute; inset: 0; z-index: -1; background: linear-gradient(110deg, rgba(12,18,32,0.85) 0%, rgba(12,18,32,0.5) 60%, rgba(12,18,32,0.2) 100%); }
    .hero-text { max-width: 1400px; width: 100%; color: #fff; }
    .hero-eyebrow {
      display: inline-flex; align-items: center; gap: 0.5rem;
      font-size: 0.78rem; letter-spacing: 0.18em; text-transform: uppercase;
      color: var(--accent); font-weight: 600; margin-bottom: 1.5rem;
    }
    .hero-eyebrow::before { content: ''; width: 32px; height: 2px; background: var(--accent); }
    .hero h1 {
      font-family: var(--display); font-weight: 700;
      font-size: clamp(2.5rem, 6vw, 5rem); line-height: 1; letter-spacing: -0.02em;
      max-width: 16ch;
    }
    .hero h1 em { font-style: normal; color: var(--accent); }
    .hero p { color: rgba(255,255,255,0.85); font-size: clamp(1.05rem, 1.4vw, 1.2rem); margin-top: 1.5rem; max-width: 520px; line-height: 1.65; }
    .hero-cta-row { display: flex; gap: 1rem; margin-top: 2.5rem; flex-wrap: wrap; }
    .btn-primary {
      background: var(--accent); color: var(--ink);
      padding: 1.1rem 1.85rem;
      font-weight: 600; font-size: 0.95rem; letter-spacing: 0.04em;
      transition: background .2s, transform .2s;
    }
    .btn-primary:hover { background: #fff; transform: translateY(-2px); }
    .btn-ghost {
      background: transparent; color: #fff; border: 1.5px solid rgba(255,255,255,0.4);
      padding: 1.05rem 1.85rem;
      font-weight: 600; font-size: 0.95rem; letter-spacing: 0.04em;
      transition: background .2s, border-color .2s;
    }
    .btn-ghost:hover { background: rgba(255,255,255,0.1); border-color: #fff; }

    /* ─── Trust strip ────────────────────────────────────── */
    .trust-strip { background: var(--ink); color: #fff; padding: 2rem 1.5rem; border-top: 1px solid rgba(255,255,255,0.08); }
    .trust-inner { max-width: 1300px; margin: 0 auto; display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(min(180px, 100%), 1fr)); text-align: center; }
    .trust-num { font-family: var(--display); font-weight: 700; font-size: 2.25rem; line-height: 1; color: var(--accent); margin-bottom: 0.3rem; }
    .trust-lbl { font-size: 0.78rem; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(255,255,255,0.6); }

    /* ─── Section base ───────────────────────────────────── */
    .section { padding: clamp(5rem, 9vw, 8rem) 1.5rem; }
    .container { max-width: 1400px; margin: 0 auto; }
    .section-eyebrow { display: inline-block; font-size: 0.75rem; letter-spacing: 0.18em; text-transform: uppercase; color: var(--accent); font-weight: 600; margin-bottom: 1rem; }
    .section-title { font-family: var(--display); font-weight: 700; font-size: clamp(2.25rem, 5vw, 3.75rem); line-height: 1.05; letter-spacing: -0.02em; margin-bottom: 1.25rem; }
    .section-title em { font-style: normal; color: var(--accent); }
    .section-lead { color: var(--ink-2); font-size: 1.05rem; line-height: 1.7; max-width: 600px; }

    /* ─── Inventory grid ─────────────────────────────────── */
    .inventory-grid {
      display: grid; gap: 1.5rem;
      grid-template-columns: repeat(auto-fit, minmax(min(320px, 100%), 1fr));
      margin-top: 4rem;
    }
    @media (min-width: 1100px) { .inventory-grid { grid-template-columns: repeat(3, 1fr); } }
    .vehicle {
      background: var(--surface); overflow: hidden;
      transition: transform .35s ease, box-shadow .35s ease;
    }
    .vehicle:hover { transform: translateY(-4px); box-shadow: 0 18px 40px -16px rgba(12,18,32,0.18); }
    .vehicle-photo { aspect-ratio: 4/3; background-size: cover; background-position: center; transition: transform .8s ease; }
    .vehicle:hover .vehicle-photo { transform: scale(1.02); }
    .vehicle-info { padding: 1.5rem 1.5rem 1.75rem; }
    .vehicle-brand { font-size: 0.72rem; letter-spacing: 0.18em; text-transform: uppercase; color: var(--accent); font-weight: 600; }
    .vehicle-model { font-family: var(--display); font-weight: 700; font-size: 1.4rem; line-height: 1.2; margin-top: 0.3rem; }
    .vehicle-detail { color: var(--ink-2); font-size: 0.9rem; margin-top: 0.85rem; line-height: 1.55; }
    .vehicle-foot { display: flex; align-items: baseline; justify-content: space-between; padding-top: 1.25rem; margin-top: 1.25rem; border-top: 1px solid var(--rule); }
    .vehicle-price { font-family: var(--display); font-size: 1.45rem; color: var(--ink); font-weight: 700; }
    .vehicle-link { font-size: 0.82rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink); border-bottom: 1px solid var(--accent); padding-bottom: 2px; font-weight: 600; }

    /* ─── Services ───────────────────────────────────────── */
    .services { background: var(--bg-2); }
    .services-grid {
      display: grid; gap: 1px; background: var(--rule);
      grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr));
      margin-top: 4rem;
    }
    @media (min-width: 880px) { .services-grid { grid-template-columns: repeat(3, 1fr); } }
    .service-card { background: var(--surface); padding: 2.5rem 2rem; }
    .service-num { font-family: var(--display); font-size: 0.85rem; color: var(--ink-3); font-weight: 600; letter-spacing: 0.06em; margin-bottom: 1rem; }
    .service-card h3 { font-family: var(--display); font-weight: 700; font-size: 1.4rem; line-height: 1.2; margin-bottom: 0.85rem; }
    .service-card p { color: var(--ink-2); font-size: 0.95rem; line-height: 1.65; }

    /* ─── Probefahrt CTA ─────────────────────────────────── */
    .test-drive {
      background: var(--ink); color: #fff;
      padding: clamp(5rem, 9vw, 8rem) 1.5rem;
    }
    .td-grid {
      max-width: 1100px; margin: 0 auto;
      display: grid; gap: 4rem;
    }
    @media (min-width: 880px) { .td-grid { grid-template-columns: 1fr 1fr; gap: 6rem; align-items: center; } }
    .td-grid h2 { font-family: var(--display); font-weight: 700; font-size: clamp(2rem, 4vw, 3.25rem); line-height: 1.1; color: #fff; margin-bottom: 1.25rem; }
    .td-grid h2 em { font-style: normal; color: var(--accent); }
    .td-grid p { color: rgba(255,255,255,0.78); margin-bottom: 1.5rem; line-height: 1.7; max-width: 480px; }
    .td-form { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.12); padding: 2rem; }
    .td-form h3 { font-family: var(--display); font-weight: 600; font-size: 1.4rem; color: #fff; margin-bottom: 1.5rem; }
    .td-row { padding: 1rem 0; border-bottom: 1px solid rgba(255,255,255,0.08); }
    .td-row:last-child { border-bottom: none; }
    .td-row .lbl { font-size: 0.74rem; letter-spacing: 0.16em; text-transform: uppercase; color: rgba(255,255,255,0.55); margin-bottom: 0.4rem; font-weight: 500; }
    .td-row .val { color: #fff; font-size: 1rem; }
    .td-row a { color: #fff; }
    .td-row a:hover { color: var(--accent); }

    footer { background: #050a14; color: rgba(255,255,255,0.55); padding: 3rem 1.5rem; text-align: center; font-size: 0.85rem; }
    footer .brand { font-family: var(--display); font-size: 1.4rem; color: #fff; margin-bottom: 0.5rem; font-weight: 700; }
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

<header class="nav">
  <div class="nav-inner">
    <a class="brand-mark" href="#"><span class="ic"></span>${businessName}</a>
    <input type="checkbox" id="nav-toggle" class="nav-toggle" aria-label="Menü öffnen" />
    <label for="nav-toggle" class="nav-burger" aria-hidden="true"><span></span></label>
    <nav class="main-nav">
      <a href="#bestand">Bestand</a>
      <a href="#services">Service</a>
      <a href="#finanzierung">Finanzierung</a>
      <a href="#kontakt">Kontakt</a>
    </nav>
    <a href="#kontakt" class="nav-cta">Probefahrt</a>
  </div>
</header>

<section class="hero">
  <div class="hero-img" style="background-image: url('${getHeroImage(spec, slug, 1800, 1100)}');"></div>
  <div class="hero-text">
    <span class="hero-eyebrow">${escapeHtml(tagline.slice(0, 60))}</span>
    <h1>${escapeHtml(headline.replace(/(\.|!|\?)([^.!?]*)$/, '|$1$2|')).replace(/\|([^|]+)\|/, '<em>$1</em>')}</h1>
    <p>${subhead}</p>
    ${renderRatingPill(spec)}
    <div class="hero-cta-row">
      <a href="#kontakt" class="btn-primary">${ctaText}</a>
      <a href="#bestand" class="btn-ghost">Aktuelle Fahrzeuge</a>
    </div>
  </div>
</section>

${renderMarquee(marqueeItems)}

${trustStats.length >= 2 ? renderTrustBar(trustStats) : `<section class="trust-strip">
  <div class="trust-inner">
    <div><div class="trust-num">50+</div><div class="trust-lbl">Jahre am Markt</div></div>
    <div><div class="trust-num">200+</div><div class="trust-lbl">Fahrzeuge im Bestand</div></div>
    <div><div class="trust-num">12 Mon.</div><div class="trust-lbl">Garantie</div></div>
    <div><div class="trust-num">48 h</div><div class="trust-lbl">Service-Termin</div></div>
  </div>
</section>`}

<section id="bestand" class="section">
  <div class="container">
    <div class="reveal" style="display: grid; gap: 1rem; align-items: end; margin-bottom: 1rem;">
      <div>
        <span class="section-eyebrow">Aktueller Bestand</span>
        <h2 class="section-title">Sechs Fahrzeuge,<br>von <em>jung gebraucht</em> bis Premium.</h2>
        <p class="section-lead">Auszug aus unserem Bestand. Über 200 Fahrzeuge stehen im Lager — kommen Sie unverbindlich vorbei.</p>
      </div>
    </div>
    <div class="inventory-grid">
      ${inventory.map((v: any) => `
        <article class="vehicle reveal">
          <div class="vehicle-photo" style="background-image: url('${vehiclePhoto(spec, slug, v.photo)}');"></div>
          <div class="vehicle-info">
            <div class="vehicle-brand">${escapeHtml(v.brand)}</div>
            <div class="vehicle-model">${escapeHtml(v.model)}</div>
            <div class="vehicle-detail">${escapeHtml(v.detail)}</div>
            <div class="vehicle-foot">
              <span class="vehicle-price">${escapeHtml(v.price)}</span>
              <a href="#kontakt" class="vehicle-link">Anfragen →</a>
            </div>
          </div>
        </article>
      `).join('')}
    </div>
  </div>
</section>

<section id="services" class="section services">
  <div class="container">
    <div class="reveal" style="text-align:center; max-width: 720px; margin: 0 auto;">
      <span class="section-eyebrow">Leistungen</span>
      <h2 class="section-title">Mehr als nur <em>verkaufen</em>.</h2>
      <p class="section-lead" style="margin-inline: auto;">Von der Probefahrt über Finanzierung bis zur Werkstatt — alles unter einem Dach.</p>
    </div>
    <div class="services-grid">
      ${services.map((s, i) => `
        <article class="service-card reveal">
          <div class="service-num">${String(i + 1).padStart(2, '0')} / 06</div>
          <h3>${escapeHtml(s.name)}</h3>
          <p>${escapeHtml(s.description)}</p>
        </article>
      `).join('')}
    </div>
  </div>
</section>

<section id="kontakt" class="test-drive">
  <div class="td-grid">
    <div class="reveal">
      <span class="section-eyebrow" style="color: var(--accent);">Probefahrt</span>
      <h2>Erleben Sie es selbst.<br>Probefahrt — auch <em>am Wochenende</em>.</h2>
      <p>Wir reservieren Ihr Wunschfahrzeug. Sie holen es bei uns ab, fahren in Ruhe — entscheiden danach.</p>
      <a href="#kontakt" class="btn-primary" style="background: var(--accent); color: var(--ink);">${ctaText} →</a>
    </div>
    <div class="td-form reveal">
      <h3>Direkt erreichbar</h3>
      ${address ? `<div class="td-row"><div class="lbl">Standort</div><div class="val">${address}</div></div>` : ''}
      ${phone ? `<div class="td-row"><div class="lbl">Telefon</div><div class="val"><a href="tel:${phone.replace(/\s/g, '')}">${phone}</a></div></div>` : ''}
      ${email ? `<div class="td-row"><div class="lbl">E-Mail</div><div class="val"><a href="mailto:${email}">${email}</a></div></div>` : ''}
      <div class="td-row"><div class="lbl">Öffnungszeiten Verkauf</div><div class="val">Mo–Fr 08:00 – 18:00 · Sa 09:00 – 13:00</div></div>
      <div class="td-row"><div class="lbl">Werkstatt</div><div class="val">Mo–Fr 07:30 – 17:30</div></div>
    </div>
  </div>
</section>

${renderPullQuote(pullQuote, spec.business_name)}

${renderQuietFooter({
  businessName: spec.business_name,
  tagline: spec.tagline,
  ctaText,
  ctaHref: '#kontakt',
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
