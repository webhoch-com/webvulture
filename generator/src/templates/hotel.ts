/**
 * Hotel template — luxury, photo-rich, room-led.
 * Big hero photo with overlaid booking widget. Room cards with prices.
 * Wellness/restaurant photo strips. Direct-booking CTA dominant.
 * Inspired by boutique-hotel sites (Aman, Sacher, Belmond).
 */

import type { SiteSpec } from '../types.js';
import { renderSeoHead } from './_seo.js';
import { getGalleryImage, getHeroImage, hasHeroImage, hasGalleryImages, galleryCount } from './_media.js';
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

function hotelPhoto(spec: SiteSpec, slug: string, idx: number, w = 1200, h = 800): string {
  return getGalleryImage(spec, slug, idx, w, h);
}

export function renderHotelPage(spec: SiteSpec, slug: string): string {
  const PRESET = getBranchPreset('hotel');
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
  const hasHero = hasHeroImage(spec);
  const hasGallery = hasGalleryImages(spec);
  const heroImage = getHeroImage(spec, slug, 1800, 1100);

  const foundedYear = extractFoundedYear(spec);
  const marqueeItems = buildMarqueeItems(spec, foundedYear);
  const pullQuote = pickPullQuote(spec);

  const trustStats: Array<{ value: string; label: string }> = [];
  if (foundedYear) {
    const years = new Date().getFullYear() - foundedYear;
    if (years > 0) trustStats.push({ value: `Seit ${foundedYear}`, label: `${years} Jahre Gastgeber` });
  }
  if (spec.business?.rating && spec.business?.review_count && spec.business.review_count >= 5) {
    trustStats.push({ value: `${spec.business.rating.toFixed(1).replace('.', ',')} ★`, label: `${spec.business.review_count} Gäste-Bewertungen` });
  }

  const rooms = spec.services && spec.services.length >= 3 ? spec.services : [
    { name: 'Doppelzimmer Komfort', description: 'Bergblick, Holzboden, Dusche/WC, ab 95 €/Nacht inkl. Frühstück.', price: 'ab 95 €' },
    { name: 'Suite mit Balkon', description: 'Wohn-/Schlafraum, Kingsize, freistehende Wanne — für besondere Anlässe.', price: 'ab 165 €' },
    { name: 'Familienzimmer', description: 'Bis zu 5 Personen, separates Kinderzimmer, Spielecke im Garten.', price: 'ab 145 €' },
  ];

  const phone = spec.contact.phone ? escapeHtml(spec.contact.phone) : '';
  const email = spec.contact.email ? escapeHtml(spec.contact.email) : '';
  const address = spec.contact.address ? escapeHtml(spec.contact.address) : '';

  return `---
---
<!DOCTYPE html>
<html lang="de">
<head>
  ${renderSeoHead(spec, { slug, schemaKind: 'LodgingBusiness' })}
  ${fontImportTags}
  <style>
    :root {
      --bg: ${PRESET.bg};
      --bg-2: color-mix(in oklch, ${PRESET.bg} 60%, white);
      --surface: #ffffff;
      --ink: ${PRESET.ink};
      --ink-2: #5a4a40;
      --ink-3: #948374;
      --primary: ${escapeHtml(primary)};
      --primary-deep: color-mix(in oklch, ${escapeHtml(primary)} 70%, black);
      --secondary: ${escapeHtml(secondary)};
      --accent: ${escapeHtml(accent)};
      --accent-dark: color-mix(in oklch, ${escapeHtml(accent)} 70%, black);
      --rule: rgba(28,20,16,0.10);
      --display: ${headingFont};
      --serif: ${headingFont};
      --sans: ${bodyFont};
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body { background: var(--bg); color: var(--ink); font-family: var(--sans); line-height: 1.65; -webkit-font-smoothing: antialiased; overflow-x: hidden; }
    img { display: block; max-width: 100%; }
    a { color: inherit; text-decoration: none; }

    .demo-banner { background: #1a0a1f; color:#fff; padding:0.55rem 1rem; font-size:0.82rem; position: relative; z-index: 200; border-bottom: 1px solid rgba(236,101,186,0.35); }
    .demo-banner-inner { max-width: 1280px; margin: 0 auto; display: flex; align-items: center; gap: 0.85rem; flex-wrap: wrap; justify-content: center; }
    .demo-banner-tag { font-size: 0.7rem; letter-spacing: 0.16em; text-transform: uppercase; padding: 0.18rem 0.55rem; border-radius: 999px; background: rgba(236,101,186,0.22); border: 1px solid rgba(236,101,186,0.5); color: #ffd6ee; font-weight: 700; white-space: nowrap; }
    .demo-banner a { color: #ffb3df; font-weight: 700; border-bottom: 1px solid rgba(255,179,223,0.45); }

    /* ─── Header overlay on hero ────────────────────────── */
    .nav {
      position: absolute; top: 33px; left: 0; right: 0; z-index: 30;
      padding: 1.25rem 2rem;
    }
    .nav-inner {
      max-width: 1400px; margin: 0 auto;
      display: flex; align-items: center; justify-content: space-between; gap: 1.5rem;
    }
    .brand-mark {
      font-family: var(--serif); font-weight: 500; font-size: 1.6rem; color: #fff;
      letter-spacing: 0.04em;
    }
    .main-nav { display: none; gap: 2.25rem; font-size: 0.9rem; font-weight: 400; }
    .main-nav a { color: #fff; opacity: 0.85; transition: opacity .2s; letter-spacing: 0.04em; }
    .main-nav a:hover { opacity: 1; }
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
      .nav-burger { display: inline-flex; border-color: rgba(255,255,255,0.4); }
      .nav-burger:hover { background: rgba(255,255,255,0.08); }
      .main-nav {
        position: absolute; top: 100%; left: 0; right: 0;
        display: flex; flex-direction: column; gap: 0;
        background: rgba(0,0,0,0.85); backdrop-filter: blur(12px);
        box-shadow: 0 14px 30px -16px rgba(0,0,0,0.4);
        padding: 0.25rem 2rem 1rem;
        transform: translateY(-12px); opacity: 0; pointer-events: none;
        transition: transform .25s ease, opacity .25s ease;
      }
      .main-nav a {
        padding: 0.95rem 0;
        border-bottom: 1px solid rgba(255,255,255,0.12);
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
      border: 1px solid rgba(255,255,255,0.5); padding: 0.7rem 1.4rem;
      font-size: 0.82rem; letter-spacing: 0.06em; color: #fff;
      transition: background .2s, border-color .2s;
    }
    .nav-cta:hover { background: rgba(255,255,255,0.15); border-color: #fff; }
    @media (max-width: 879px) { .nav-cta { display: none; } }

    /* ─── Hero — full-bleed photo + overlay heading ─────── */
    .hero {
      position: relative; min-height: 100vh; min-height: 100svh;
      display: grid; place-items: center end;
      isolation: isolate; padding: 0 0 8rem;
    }
    .hero-img { position: absolute; inset: 0; z-index: -2; background-size: cover; background-position: center; }
    .hero::after { content: ''; position: absolute; inset: 0; z-index: -1; background: linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.15) 50%, rgba(0,0,0,0.6) 100%); }
    .hero-text {
      max-width: 1400px; width: 100%; padding: 0 2rem; color: #fff;
      text-align: center;
    }
    .hero-text .eyebrow {
      display: inline-block; padding: 0.4rem 1rem;
      border: 1px solid rgba(255,255,255,0.4);
      font-size: 0.72rem; letter-spacing: 0.22em; text-transform: uppercase;
      backdrop-filter: blur(4px); margin-bottom: 2rem;
    }
    .hero-text h1 {
      font-family: var(--serif); font-weight: 400;
      font-size: clamp(2.5rem, 7vw, 6rem); line-height: 1; letter-spacing: -0.02em;
      max-width: 14ch; margin: 0 auto;
    }
    .hero-text h1 em { font-style: italic; color: var(--accent); font-weight: 400; }
    .hero-text p { font-size: clamp(1rem, 1.4vw, 1.2rem); margin-top: 1.75rem; max-width: 540px; margin-inline: auto; opacity: 0.92; line-height: 1.65; }

    /* ─── Booking widget overlay ────────────────────────── */
    .booking-widget {
      position: absolute; bottom: -3rem; left: 50%; transform: translateX(-50%);
      max-width: 1100px; width: calc(100% - 4rem); z-index: 5;
      background: var(--surface); border-radius: 8px;
      padding: 1.5rem 2rem; box-shadow: 0 30px 80px -20px rgba(0,0,0,0.4);
      display: grid; gap: 1rem;
      grid-template-columns: 1fr;
    }
    @media (min-width: 720px) {
      .booking-widget { grid-template-columns: 1fr 1fr 1fr auto; align-items: end; padding: 1.75rem 2rem; }
    }
    .bw-field label { display: block; font-size: 0.72rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-3); margin-bottom: 0.4rem; font-weight: 600; }
    .bw-field .v { font-family: var(--serif); font-size: 1.15rem; font-weight: 500; color: var(--ink); border-bottom: 1px solid var(--rule); padding-bottom: 0.6rem; min-height: 1.5em; }
    .bw-cta {
      background: var(--accent); color: #fff;
      padding: 1.05rem 1.85rem;
      font-size: 0.9rem; letter-spacing: 0.04em; font-weight: 600;
      transition: background .2s;
    }
    .bw-cta:hover { background: var(--accent-dark); }

    /* ─── Section base ───────────────────────────────────── */
    .section { padding: clamp(7rem, 11vw, 11rem) 1.5rem; }
    .container { max-width: 1300px; margin: 0 auto; }
    .section-eyebrow {
      font-size: 0.72rem; letter-spacing: 0.22em; text-transform: uppercase;
      color: var(--accent); font-weight: 600; margin-bottom: 1.25rem;
    }
    .section-title {
      font-family: var(--serif); font-weight: 400;
      font-size: clamp(2.25rem, 5vw, 4rem); line-height: 1.05; letter-spacing: -0.02em;
      max-width: 18ch; margin-bottom: 1.5rem;
    }
    .section-title em { font-style: italic; color: var(--accent); }
    .section-lead { color: var(--ink-2); font-size: 1.1rem; line-height: 1.75; max-width: 620px; }

    /* ─── Rooms ──────────────────────────────────────────── */
    #zimmer { background: var(--bg); padding-top: 10rem; /* leave room for booking widget overlap */ }
    .rooms-head { display: grid; gap: 1.5rem; margin-bottom: 4rem; }
    @media (min-width: 880px) { .rooms-head { grid-template-columns: 1fr 1fr; align-items: end; gap: 4rem; } }
    .rooms-grid {
      display: grid; gap: 1.5rem;
      grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 1fr));
    }
    @media (min-width: 880px) { .rooms-grid { grid-template-columns: repeat(3, 1fr); } }
    .room {
      display: flex; flex-direction: column;
      background: var(--surface); overflow: hidden;
      transition: transform .35s ease;
    }
    .room:hover { transform: translateY(-4px); }
    .room-photo { aspect-ratio: 4/3; background-size: cover; background-position: center; transition: transform .8s ease; }
    .room:hover .room-photo { transform: scale(1.02); }
    .room-info { padding: 2rem 1.75rem; }
    .room-name { font-family: var(--serif); font-weight: 500; font-size: 1.6rem; line-height: 1.2; margin-bottom: 0.85rem; }
    .room-desc { color: var(--ink-2); font-size: 0.95rem; line-height: 1.65; margin-bottom: 1.25rem; }
    .room-foot { display: flex; align-items: baseline; justify-content: space-between; padding-top: 1.25rem; border-top: 1px solid var(--rule); }
    .room-price { font-family: var(--serif); font-size: 1.25rem; color: var(--accent); font-weight: 600; }
    .room-link { font-size: 0.82rem; letter-spacing: 0.14em; text-transform: uppercase; font-weight: 600; color: var(--ink); border-bottom: 1px solid var(--accent); padding-bottom: 2px; }

    /* ─── Photo split (Restaurant + Wellness) ────────────── */
    .photo-split { background: var(--bg-2); }
    .ps-grid {
      max-width: 1400px; margin: 0 auto;
      display: grid; gap: 1.5rem;
    }
    @media (min-width: 880px) { .ps-grid { grid-template-columns: 1fr 1fr; gap: 4rem; align-items: center; } }
    .ps-image {
      aspect-ratio: 4/3.2; background-size: cover; background-position: center;
    }
    .ps-text { padding: 2rem; }
    .ps-text .lead { color: var(--ink-2); font-size: 1.05rem; line-height: 1.7; margin-top: 1.25rem; }
    .ps-text .ctas { margin-top: 2rem; }
    .ps-text .ctas a {
      border-bottom: 1px solid var(--accent); padding-bottom: 2px; font-size: 0.85rem;
      letter-spacing: 0.14em; text-transform: uppercase; font-weight: 600;
    }

    /* ─── Photo gallery ──────────────────────────────────── */
    .gallery { padding: clamp(5rem, 9vw, 8rem) 1.5rem; }
    .gallery-head { text-align: center; margin-bottom: 4rem; max-width: 720px; margin-inline: auto; }
    .gallery-grid { display: grid; gap: 0.75rem; grid-template-columns: repeat(2, 1fr); max-width: 1400px; margin: 0 auto; }
    @media (min-width: 700px) { .gallery-grid { grid-template-columns: repeat(3, 1fr); } }
    .gallery-img { aspect-ratio: 4/3; overflow: hidden; transition: transform .4s ease; }
    .gallery-img img { width: 100%; height: 100%; object-fit: cover; transition: transform 1s ease; }
    .gallery-img:hover { transform: scale(1.01); }
    .gallery-img:hover img { transform: scale(1.06); }

    /* ─── Direct booking advantage ───────────────────────── */
    .advantage {
      background-image: linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.7)), url('${hotelPhoto(spec, slug, 80, 1800, 1200)}');
      background-size: cover; background-position: center;
      color: #fff;
      padding: clamp(6rem, 10vw, 10rem) 1.5rem; text-align: center;
    }
    .advantage h2 { font-family: var(--serif); font-weight: 400; font-size: clamp(2.25rem, 5vw, 3.75rem); line-height: 1.1; max-width: 18ch; margin: 0 auto 2rem; }
    .advantage h2 em { font-style: italic; color: var(--accent); }
    .advantage-list { display: grid; gap: 2rem; max-width: 900px; margin: 0 auto 2.5rem; grid-template-columns: repeat(auto-fit, minmax(min(220px, 100%), 1fr)); }
    .advantage-list li { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; list-style: none; font-size: 0.95rem; opacity: 0.92; line-height: 1.5; max-width: 260px; margin-inline: auto; }
    .advantage-list .ic { width: 48px; height: 48px; border: 1px solid rgba(255,255,255,0.4); border-radius: 50%; display: grid; place-items: center; color: var(--accent); }
    .advantage-list strong { color: #fff; font-weight: 600; }
    .advantage .btn-gold {
      background: var(--accent); color: #fff;
      padding: 1.15rem 2.5rem; font-size: 0.95rem; letter-spacing: 0.04em; font-weight: 600;
      transition: background .2s, transform .2s;
    }
    .advantage .btn-gold:hover { background: var(--accent-dark); transform: translateY(-2px); }

    /* ─── Contact + map area ─────────────────────────────── */
    .contact-section { padding: clamp(5rem, 9vw, 8rem) 1.5rem; background: var(--bg-2); }
    .contact-grid { max-width: 1100px; margin: 0 auto; display: grid; gap: 2rem; grid-template-columns: repeat(auto-fit, minmax(min(220px, 100%), 1fr)); }
    .contact-card { background: var(--surface); padding: 2rem 1.75rem; }
    .contact-card .lbl { font-size: 0.72rem; letter-spacing: 0.18em; text-transform: uppercase; color: var(--ink-3); font-weight: 600; margin-bottom: 0.6rem; }
    .contact-card .val { font-family: var(--serif); font-size: 1.25rem; line-height: 1.4; }
    .contact-card a:hover { color: var(--accent); }

    /* ─── Footer ─────────────────────────────────────────── */
    footer { background: var(--ink); color: rgba(255,255,255,0.55); padding: 3rem 1.5rem; text-align: center; font-size: 0.85rem; }
    footer .brand { font-family: var(--serif); font-size: 1.5rem; color: #fff; margin-bottom: 0.5rem; }
    footer .legal { display: flex; gap: 1.5rem; justify-content: center; margin-top: 1rem; flex-wrap: wrap; }
    footer .legal a:hover { color: var(--accent); }

    .reveal { opacity: 1; transform: none; }
    /* visible by default */
    @media (prefers-reduced-motion: reduce) { .reveal { opacity: 1 !important; transform: none !important; } }

    /* Hero fallback when no scraped photo */
    .hero.hero-no-img { background: linear-gradient(135deg, #1c1410 0%, ${escapeHtml(primary)} 100%); }
    .hero-no-img .hero-img { display: none; }
    .hero-decor-bigtype {
      position: absolute; bottom: clamp(4rem, 7vw, 8rem); right: clamp(2rem, 5vw, 6rem); z-index: 0;
      font-family: var(--display); font-weight: 500;
      font-size: clamp(4rem, 13vw, 13rem); line-height: 0.92; letter-spacing: -0.04em;
      color: rgba(255,255,255,0.10); text-align: right; max-width: 80vw;
      pointer-events: none;
    }

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
    <a class="brand-mark" href="#">${businessName}</a>
    <input type="checkbox" id="nav-toggle" class="nav-toggle" aria-label="Menü öffnen" />
    <label for="nav-toggle" class="nav-burger" aria-hidden="true"><span></span></label>
    <nav class="main-nav">
      <a href="#zimmer">Zimmer</a>
      <a href="#restaurant">Restaurant</a>
      <a href="#wellness">Wellness</a>
      <a href="#kontakt">Kontakt</a>
    </nav>
    <a href="#zimmer" class="nav-cta">${ctaText}</a>
  </div>
</header>

<section class="hero ${hasHero ? '' : 'hero-no-img'}">
  ${hasHero ? `<div class="hero-img" style="background-image: url('${escapeHtml(heroImage)}');"></div>` : `<div class="hero-decor-bigtype" aria-hidden="true">${businessName}</div>`}
  <div class="hero-text">
    <span class="eyebrow">${escapeHtml(tagline.slice(0, 60))}</span>
    <h1>${escapeHtml(headline.replace(/(\.|!|\?)([^.!?]*)$/, '|$1$2|')).replace(/\|([^|]+)\|/, '<em>$1</em>')}</h1>
    <p>${subhead}</p>
    ${renderRatingPill(spec)}
  </div>

  <div class="booking-widget" role="search" aria-label="Demo-Anfrage senden">
    <div class="bw-field"><label>Anreise</label><div class="v">— wählen —</div></div>
    <div class="bw-field"><label>Abreise</label><div class="v">— wählen —</div></div>
    <div class="bw-field"><label>Gäste</label><div class="v">2 Erwachsene</div></div>
    <a href="#kontakt" class="bw-cta">Demo-Anfrage senden →</a>
  </div>
</section>

${renderMarquee(marqueeItems)}

${renderTrustBar(trustStats)}

<section id="zimmer" class="section">
  <div class="container">
    <div class="rooms-head">
      <div class="reveal">
        <span class="section-eyebrow">Unsere Zimmer</span>
        <h2 class="section-title">Wohnen mit <em>Aussicht</em>.</h2>
      </div>
      <p class="section-lead reveal">Drei Zimmertypen, eine gemeinsame Linie: warme Materialien, viel Tageslicht, eigener Charakter. Für eine Nacht oder eine ganze Woche.</p>
    </div>
    <div class="rooms-grid">
      ${rooms.map((r, i) => `
        <article class="room reveal">
          <div class="room-photo" style="background-image: url('${hotelPhoto(spec, slug, 10 + i)}');"></div>
          <div class="room-info">
            <h3 class="room-name">${escapeHtml(r.name)}</h3>
            <p class="room-desc">${escapeHtml(r.description)}</p>
            <div class="room-foot">
              <span class="room-price">${escapeHtml(r.price ?? '')}</span>
              <a href="#kontakt" class="room-link">Anfragen</a>
            </div>
          </div>
        </article>
      `).join('')}
    </div>
  </div>
</section>

<section id="restaurant" class="photo-split">
  <div class="ps-grid">
    <div class="ps-image" style="background-image: url('${hotelPhoto(spec, slug, 30)}');" aria-hidden="true"></div>
    <div class="ps-text reveal">
      <span class="section-eyebrow">Restaurant</span>
      <h2 class="section-title">Saisonal, regional, <em>sorgfältig</em>.</h2>
      <p class="lead">Hauseigene Küche mit Produkten aus der Region. Frühstück mit hausgebackenem Brot, abends à la carte oder Menü. Auch für Tagesgäste geöffnet.</p>
      <div class="ctas"><a href="#kontakt">Speisekarte anfragen →</a></div>
    </div>
  </div>
</section>

<section id="wellness" class="photo-split" style="background: var(--bg);">
  <div class="ps-grid">
    <div class="ps-text reveal" style="order: 2;">
      <span class="section-eyebrow">Wellness</span>
      <h2 class="section-title">Sauna, Stille, <em>Bergblick</em>.</h2>
      <p class="lead">Finnische Sauna, Infrarotkabine, Ruheraum mit Panoramafenster — kostenfrei für Hausgäste. Massagen auf Anfrage.</p>
      <div class="ctas"><a href="#kontakt">Anwendungen anfragen →</a></div>
    </div>
    <div class="ps-image" style="background-image: url('${hotelPhoto(spec, slug, 40)}'); order: 1;" aria-hidden="true"></div>
  </div>
</section>

${renderPullQuote(pullQuote, spec.business_name)}

${hasGallery && galleryCount(spec) >= 1 ? `
<section class="gallery">
  <div class="gallery-head reveal">
    <span class="section-eyebrow">Eindrücke</span>
    <h2 class="section-title" style="max-width: 100%;"><em>Atmosphäre</em>.</h2>
    <p class="section-lead" style="margin-inline: auto;">Ein Auszug aus dem Haus, aus dem Garten und aus den Bergen.</p>
  </div>
  <div class="gallery-grid">
    ${[51,52,53,54,55,56].slice(0, Math.min(galleryCount(spec), 6)).map(i => `
      <div class="gallery-img reveal"><img src="${hotelPhoto(spec, slug, i, 700, 525)}" alt="" loading="lazy"></div>
    `).join('')}
  </div>
</section>
` : ''}

<section class="advantage">
  <span class="section-eyebrow" style="color: var(--accent); display: block; margin-bottom: 1.5rem;">Direkt buchen</span>
  <h2>Vier Gründe, <em>direkt</em> bei uns zu buchen.</h2>
  <ul class="advantage-list">
    <li>
      <span class="ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></span>
      <strong>Bester Preis</strong>
      <span>Direktbuchung lohnt sich — wir machen Ihnen ein faires Angebot.</span>
    </li>
    <li>
      <span class="ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>
      <strong>Flexible Stornierung</strong>
      <span>Kostenfrei bis 24 h vor Anreise.</span>
    </li>
    <li>
      <span class="ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></span>
      <strong>Spätes Check-out</strong>
      <span>Bis 13 Uhr — auf Anfrage und nach Verfügbarkeit.</span>
    </li>
    <li>
      <span class="ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></span>
      <strong>Persönlicher Kontakt</strong>
      <span>Sie erreichen uns direkt — keine Hotline, keine Warteschleife.</span>
    </li>
  </ul>
  <a href="#kontakt" class="btn-gold">Direkt anfragen →</a>
</section>

<section id="kontakt" class="contact-section">
  <div style="text-align:center; max-width: 720px; margin: 0 auto 4rem;" class="reveal">
    <span class="section-eyebrow">Kontakt</span>
    <h2 class="section-title" style="max-width: 100%;">Wir sind <em>für Sie</em> da.</h2>
    <p class="section-lead" style="margin-inline: auto;">Anreise zwischen 15 und 19 Uhr. Frühe oder späte Anreise gern auf Anfrage.</p>
  </div>
  <div class="contact-grid">
    ${address ? `<div class="contact-card reveal">
      <div class="lbl">Anschrift</div>
      <div class="val">${address}</div>
    </div>` : ''}
    ${phone ? `<div class="contact-card reveal">
      <div class="lbl">Telefon</div>
      <div class="val"><a href="tel:${phone.replace(/\s/g, '')}">${phone}</a></div>
    </div>` : ''}
    ${email ? `<div class="contact-card reveal">
      <div class="lbl">E-Mail</div>
      <div class="val"><a href="mailto:${email}?subject=${encodeURIComponent('Zimmeranfrage')}">${email}</a></div>
    </div>` : ''}
  </div>
</section>

${renderQuietFooter({
  businessName: spec.business_name,
  tagline: spec.tagline,
  ctaText,
  ctaHref: '#kontakt',
  socials: spec.socials,
})}
<footer style="display:none">
  <div class="brand">${businessName}</div>
  <div>${escapeHtml(tagline)}</div>
  <div class="legal">
    <a href="/impressum">Impressum</a>
    <a href="/datenschutz">Datenschutz</a>
  </div>
</footer>

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
