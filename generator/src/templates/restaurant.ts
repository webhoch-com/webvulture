/**
 * Restaurant template — full custom layout, menu-led design.
 * Inspired by digital-menu / fine-dining sites: hero photo, large menu sections,
 * reservation CTA, gallery, opening hours, single-page flow.
 *
 * Distinguishes itself from the generic scaffolder: dark warm palette,
 * serif display, image-led, sticky reservation bar.
 */

import type { SiteSpec } from '../types.js';
import { getHeroImage, getGalleryImage, hasHeroImage, hasGalleryImages, galleryCount } from './_media.js';
import { renderSeoHead } from './_seo.js';
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
  renderHeritageStatement,
  EDITORIAL_CSS,
} from './_editorial.js';

function heroPhoto(spec: SiteSpec, slug: string): string {
  return getHeroImage(spec, slug, 1800, 1100);
}

function galleryPhoto(spec: SiteSpec, slug: string, idx: number): string {
  return getGalleryImage(spec, slug, idx + 100, 700, 520);
}

export function renderRestaurantPage(spec: SiteSpec, slug: string): string {
  // Brand-preset for this branch — restaurant cluster (Noma/Mirazur/EMP).
  // Real scraped brand values from the orchestrator override defaults via
  // the CSS var declarations further down; the preset only steps in when
  // the prospect's site had no detectable theme.
  const PRESET = getBranchPreset('restaurant');
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
  const tagline = escapeHtml(spec.tagline);
  const headline = escapeHtml(spec.hero.headline);
  const subhead = escapeHtml(spec.hero.subheadline);
  const ctaText = escapeHtml(spec.hero.cta_text || PRESET.cta_text);
  const heroImage = heroPhoto(spec, slug);
  const hasHero = hasHeroImage(spec);
  const hasGallery = hasGalleryImages(spec);

  // Editorial helpers
  const foundedYear = extractFoundedYear(spec);
  const marqueeItems = buildMarqueeItems(spec, foundedYear);
  const pullQuote = pickPullQuote(spec);

  // Trust-bar stats — only emit when we have real numbers, never invent.
  const trustStats: Array<{ value: string; label: string }> = [];
  if (foundedYear) {
    const years = new Date().getFullYear() - foundedYear;
    if (years > 0) trustStats.push({ value: `Seit ${foundedYear}`, label: `${years} Jahre Gastfreundschaft` });
  }
  if (spec.business?.rating && spec.business?.review_count && spec.business.review_count >= 5) {
    trustStats.push({ value: `${spec.business.rating.toFixed(1).replace('.', ',')} ★`, label: `${spec.business.review_count} Google-Bewertungen` });
  }
  if (spec.contact?.address) {
    const cityMatch = spec.contact.address.match(/\b\d{4,5}\s+([A-ZÄÖÜ][\wäöüÄÖÜß\s-]{2,30})/);
    if (cityMatch) trustStats.push({ value: cityMatch[1].trim().split(' ')[0], label: 'Standort' });
  }

  const menu = spec.menu ?? [
    {
      category: 'Vorspeisen',
      items: [
        { name: 'Bruschetta', description: 'Geröstetes Sauerteigbrot, Tomaten, Basilikum, Olivenöl.', price: '7,90 €' },
        { name: 'Caprese', description: 'Büffelmozzarella, Strauchtomaten, Basilikum.', price: '9,80 €' },
        { name: 'Vitello tonnato', description: 'Dünn aufgeschnittenes Kalbfleisch mit Thunfischsauce, Kapern.', price: '13,50 €' },
      ],
    },
    {
      category: 'Hauptspeisen',
      items: [
        { name: 'Spaghetti Carbonara', description: 'Klassisch mit Guanciale, Pecorino, Eigelb.', price: '14,50 €' },
        { name: 'Risotto al Tartufo', description: 'Trüffelrisotto mit Parmigiano Reggiano.', price: '22,00 €' },
        { name: 'Pizza Margherita', description: 'Steinofen, San-Marzano-Tomaten, Mozzarella di bufala.', price: '12,90 €' },
        { name: 'Tagliata di Manzo', description: 'Rinderfilet vom Holzofen, Rucola, Parmesanspäne.', price: '24,90 €' },
      ],
    },
    {
      category: 'Dolci',
      items: [
        { name: 'Tiramisu della casa', description: 'Hausgemacht mit Espresso und Mascarpone.', price: '7,50 €' },
        { name: 'Panna cotta', description: 'Vanille mit Beeren-Coulis.', price: '6,90 €' },
      ],
    },
  ];

  const openingHours = spec.opening_hours ?? [
    { day: 'Di–Fr', hours: '11:30 – 14:30 · 17:30 – 22:30' },
    { day: 'Sa', hours: '17:30 – 23:00' },
    { day: 'So', hours: '11:30 – 15:00' },
    { day: 'Mo', hours: 'Ruhetag' },
  ];

  const phone = spec.contact.phone ? escapeHtml(spec.contact.phone) : '';
  const email = spec.contact.email ? escapeHtml(spec.contact.email) : '';
  const address = spec.contact.address ? escapeHtml(spec.contact.address) : '';


  return `---
---
<!DOCTYPE html>
<html lang="de">
<head>
  ${renderSeoHead(spec, { slug, schemaKind: 'Restaurant' })}
  ${fontImportTags}
  <style>
    :root {
      --primary: ${escapeHtml(primary)};
      --primary-deep: color-mix(in oklch, ${escapeHtml(primary)} 70%, black);
      --secondary: ${escapeHtml(secondary)};
      --accent: ${escapeHtml(accent)};
      --bg: ${PRESET.bg};
      --surface: #ffffff;
      --ink: ${PRESET.ink};
      --ink-2: #5a5147;
      --ink-3: #998c7e;
      --rule: rgba(26,20,16,0.10);
      --border: rgba(26,20,16,0.10);
      --display: ${headingFont};
      --serif: ${headingFont};
      --sans: ${bodyFont};
      --shadow-sm: 0 1px 2px rgba(0,0,0,0.04);
      --shadow: 0 8px 30px -8px rgba(0,0,0,0.18);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body { background: var(--bg); color: var(--ink); font-family: var(--sans); line-height: 1.65; -webkit-font-smoothing: antialiased; overflow-x: hidden; }
    img { display: block; max-width: 100%; }
    a { color: inherit; text-decoration: none; }

    /* ─── Banner from agency (always present in demos) ──── */
    .demo-banner {
      background: linear-gradient(90deg,#1a0a1f,#2a0d2a,#0a0a1f);
      color:#fff; padding:0.55rem 1rem; font-size:0.82rem;
      position: relative; z-index: 200; border-bottom: 1px solid rgba(236,101,186,0.35);
      letter-spacing: 0.01em;
    }
    .demo-banner-inner {
      max-width: 1280px; margin: 0 auto; display: flex; align-items: center; gap: 0.85rem;
      flex-wrap: wrap; justify-content: center; line-height: 1.5;
    }
    .demo-banner-tag {
      display: inline-flex; align-items: center; font-size: 0.7rem;
      letter-spacing: 0.16em; text-transform: uppercase;
      padding: 0.18rem 0.55rem; border-radius: 999px;
      background: rgba(236,101,186,0.22); border: 1px solid rgba(236,101,186,0.5);
      color: #ffd6ee; font-weight: 700; white-space: nowrap;
    }
    .demo-banner a { color: #ffb3df; text-decoration: none; font-weight: 700;
      border-bottom: 1px solid rgba(255,179,223,0.45); }
    .demo-banner a:hover { color:#fff; border-color:#fff; }

    /* ─── Sticky reservation bar ─────────────────────────── */
    .reserve-bar {
      position: sticky; top: 0; z-index: 100;
      background: var(--surface); border-bottom: 1px solid var(--border);
      backdrop-filter: blur(8px);
    }
    .reserve-inner {
      max-width: 1280px; margin: 0 auto; padding: 0.9rem 1.5rem;
      display: flex; align-items: center; justify-content: space-between; gap: 1.5rem;
    }
    .reserve-brand {
      font-family: var(--serif); font-weight: 700; font-size: 1.25rem;
      letter-spacing: -0.01em;
    }
    .reserve-brand span { color: var(--primary); }
    .reserve-nav { display: none; gap: 2rem; font-size: 0.92rem; font-weight: 500; }
    .reserve-nav a { color: var(--ink-2); transition: color .2s ease; }
    .reserve-nav a:hover { color: var(--primary); }
    .reserve-cta {
      display: inline-flex; align-items: center; gap: 0.45rem;
      background: var(--primary); color: #fff;
      padding: 0.7rem 1.4rem; border-radius: 999px;
      font-weight: 600; font-size: 0.9rem; transition: transform .2s, box-shadow .2s;
    }
    .reserve-cta:hover { transform: translateY(-2px); box-shadow: 0 12px 28px -10px ${escapeHtml(primary)}; }
    @media (min-width: 880px) { .reserve-nav { display: flex; } }

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
      border: 1px solid var(--border);
      transition: background .2s, border-color .2s;
    }
    .nav-burger:hover { background: rgba(0,0,0,0.04); }
    .nav-burger span {
      display: block; width: 18px; height: 2px;
      background: var(--ink); border-radius: 2px;
      position: relative; transition: transform .25s ease, opacity .2s ease;
    }
    .nav-burger span::before, .nav-burger span::after {
      content: ''; position: absolute; left: 0;
      width: 18px; height: 2px;
      background: var(--ink); border-radius: 2px;
      transition: transform .25s ease, top .25s ease;
    }
    .nav-burger span::before { top: -6px; }
    .nav-burger span::after  { top:  6px; }
    .nav-toggle:checked ~ .nav-burger span { background: transparent; }
    .nav-toggle:checked ~ .nav-burger span::before { top: 0; transform: rotate(45deg); }
    .nav-toggle:checked ~ .nav-burger span::after  { top: 0; transform: rotate(-45deg); }

    @media (max-width: 879px) {
      .nav-burger { display: inline-flex; }
      .reserve-cta { display: none; }
      .reserve-nav {
        position: absolute; top: 100%; left: 0; right: 0;
        display: flex; flex-direction: column; gap: 0;
        background: var(--surface);
        border-bottom: 1px solid var(--border);
        box-shadow: 0 14px 30px -16px rgba(0,0,0,0.18);
        padding: 0.5rem 1.5rem 1rem;
        transform: translateY(-12px); opacity: 0; pointer-events: none;
        transition: transform .25s ease, opacity .25s ease;
      }
      .reserve-nav a {
        padding: 0.95rem 0;
        border-bottom: 1px solid var(--border);
        font-size: 1rem;
        min-height: 44px;
        display: flex; align-items: center;
      }
      .reserve-nav a:last-child { border-bottom: none; }
      .reserve-nav .reserve-mobile-cta {
        margin-top: 0.85rem;
        background: var(--primary); color: #fff;
        padding: 0.95rem 1.4rem; border-radius: 999px;
        font-weight: 600; text-align: center; justify-content: center;
        border-bottom: none;
      }
      .nav-toggle:checked ~ .reserve-nav {
        transform: translateY(0); opacity: 1; pointer-events: auto;
      }
    }

    /* ─── Hero — full-bleed image ─────────────────────────── */
    .hero { position: relative; min-height: 78vh; display: grid; place-items: end center;
      overflow: hidden; isolation: isolate; }
    .hero-img { position: absolute; inset: 0; z-index: -2; background-size: cover; background-position: center;
      filter: saturate(1.05); }
    .hero::after {
      content: ''; position: absolute; inset: 0; z-index: -1;
      background: linear-gradient(180deg, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0.35) 60%, rgba(0,0,0,0.75) 100%);
    }
    .hero-text {
      max-width: 920px; padding: 4rem 1.5rem 5rem; text-align: center; color: #fff;
    }
    .hero-eyebrow {
      display: inline-block; padding: 0.4rem 0.9rem;
      border: 1px solid rgba(255,255,255,0.35); border-radius: 999px;
      font-size: 0.7rem; letter-spacing: 0.18em; text-transform: uppercase; font-weight: 600;
      margin-bottom: 1.5rem; backdrop-filter: blur(6px);
    }
    .hero-text h1 {
      font-family: var(--serif); font-weight: 600;
      font-size: clamp(2.5rem, 6vw, 4.75rem); line-height: 1.05; letter-spacing: -0.02em;
      margin-bottom: 1.25rem; text-shadow: 0 2px 30px rgba(0,0,0,0.5);
    }
    .hero-text h1 em { font-style: italic; font-weight: 400; color: #f4d2b6; }
    .hero-text p {
      font-size: clamp(1rem, 1.4vw, 1.2rem); max-width: 620px; margin: 0 auto 2.25rem;
      color: rgba(255,255,255,0.92);
    }
    .hero-ctas { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; }
    .hero-ctas .cta-primary {
      background: var(--primary); color: #fff;
      padding: 1rem 1.9rem; border-radius: 999px; font-weight: 600; font-size: 1rem;
      transition: transform .2s, box-shadow .2s;
    }
    .hero-ctas .cta-primary:hover { transform: translateY(-2px); box-shadow: 0 16px 36px -12px rgba(0,0,0,0.5); }
    .hero-ctas .cta-secondary {
      color:#fff; padding: 1rem 1.9rem; border-radius: 999px;
      border: 1.5px solid rgba(255,255,255,0.6); font-weight: 600; font-size: 1rem;
      backdrop-filter: blur(6px); background: rgba(255,255,255,0.06);
      transition: background .2s;
    }
    .hero-ctas .cta-secondary:hover { background: rgba(255,255,255,0.16); }

    /* ─── Section base ───────────────────────────────────── */
    .section { padding: clamp(4rem, 7vw, 7rem) 0; }
    .container { max-width: 1180px; margin: 0 auto; padding: 0 clamp(1.25rem, 4vw, 2rem); }
    .container-narrow { max-width: 820px; }
    .eyebrow {
      display: inline-block; font-size: 0.78rem; font-weight: 600;
      letter-spacing: 0.18em; text-transform: uppercase; color: var(--primary);
      margin-bottom: 0.85rem;
    }
    h2.section-title {
      font-family: var(--serif); font-weight: 600;
      font-size: clamp(2rem, 4vw, 3.25rem); line-height: 1.1; letter-spacing: -0.02em;
      margin-bottom: 1rem;
    }
    .section-lead {
      color: var(--ink-2); font-size: 1.05rem; max-width: 640px; line-height: 1.7;
    }

    /* ─── Menu (the centerpiece) ─────────────────────────── */
    #menu { background: var(--surface); }
    .menu-head { text-align: center; margin-bottom: 4rem; }
    .menu-head .section-lead { margin: 0 auto; }
    .menu-cat {
      max-width: 880px; margin: 0 auto 4rem;
    }
    .menu-cat-title {
      font-family: var(--serif); font-size: 2rem; font-weight: 600;
      text-align: center; margin-bottom: 2.5rem;
      position: relative; padding-bottom: 1rem;
    }
    .menu-cat-title::after {
      content: ''; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%);
      width: 60px; height: 2px; background: var(--primary);
    }
    .menu-list { display: flex; flex-direction: column; gap: 2rem; }
    .menu-item {
      display: grid; grid-template-columns: 1fr auto; gap: 0.5rem 1rem;
      padding-bottom: 1.5rem; border-bottom: 1px dashed var(--border);
    }
    .menu-item:last-child { border-bottom: none; padding-bottom: 0; }
    .menu-item-name {
      font-family: var(--serif); font-size: 1.25rem; font-weight: 500; color: var(--ink);
    }
    .menu-item-price {
      font-family: var(--serif); font-size: 1.15rem; font-weight: 600; color: var(--primary);
      align-self: start; white-space: nowrap;
    }
    .menu-item-desc {
      grid-column: 1 / -1; color: var(--ink-2); font-size: 0.95rem; line-height: 1.6;
      font-style: italic;
    }

    .menu-cta-row { text-align: center; margin-top: 3rem; }
    .menu-cta-row a {
      display: inline-flex; gap: 0.5rem; align-items: center;
      padding: 0.95rem 1.7rem; border-radius: 999px;
      background: var(--primary); color: #fff; font-weight: 600;
      transition: transform .2s, box-shadow .2s;
    }
    .menu-cta-row a:hover { transform: translateY(-2px); box-shadow: 0 14px 30px -10px ${escapeHtml(primary)}; }

    /* ─── About — split with image ───────────────────────── */
    #ueber-uns { background: var(--bg); }
    .about-grid {
      display: grid; gap: 3rem; align-items: center;
    }
    @media (min-width: 880px) {
      .about-grid { grid-template-columns: 5fr 6fr; gap: 5rem; }
    }
    .about-img {
      aspect-ratio: 4/5; border-radius: 6px; overflow: hidden;
      box-shadow: var(--shadow);
      background-image: url('${galleryPhoto(spec, slug, 99)}');
      background-size: cover; background-position: center;
    }
    .about-text h2 {
      font-family: var(--serif); font-size: clamp(1.85rem, 3.5vw, 2.75rem); line-height: 1.15;
      letter-spacing: -0.02em; margin: 0.6rem 0 1.5rem;
    }
    .about-text p { color: var(--ink-2); font-size: 1.05rem; line-height: 1.75; }
    .about-text p + p { margin-top: 1rem; }

    /* ─── Gallery — masonry-ish grid ─────────────────────── */
    #galerie { background: var(--surface); }
    .gallery-head { text-align: center; margin-bottom: 3rem; }
    .gallery-grid {
      display: grid; gap: 0.75rem;
      grid-template-columns: repeat(2, 1fr);
    }
    @media (min-width: 700px) { .gallery-grid { grid-template-columns: repeat(3, 1fr); } }
    .gallery-item {
      aspect-ratio: 4/3; overflow: hidden; border-radius: 4px;
      transition: transform .4s ease;
    }
    .gallery-item img { width: 100%; height: 100%; object-fit: cover; transition: transform 1s ease; }
    .gallery-item:hover { transform: scale(1.02); }
    .gallery-item:hover img { transform: scale(1.06); }

    /* ─── Hours + Reservation ─────────────────────────────── */
    #reservierung { background: var(--ink); color: #f4ece0; }
    .reservierung-grid {
      display: grid; gap: 3rem;
    }
    @media (min-width: 880px) {
      .reservierung-grid { grid-template-columns: 1fr 1fr; gap: 5rem; }
    }
    .reservierung-grid h2 { color: #fff; font-family: var(--serif); font-size: clamp(1.85rem,3vw,2.5rem); margin-bottom: 1rem; line-height: 1.2; }
    .reservierung-grid p { color: rgba(255,255,255,0.78); margin-bottom: 1.5rem; line-height: 1.7; }
    .hours-list { list-style: none; }
    .hours-list li {
      display: flex; justify-content: space-between; gap: 1rem;
      padding: 0.85rem 0; border-bottom: 1px solid rgba(255,255,255,0.12);
      font-size: 1rem;
    }
    .hours-list li strong { font-weight: 600; color: #fff; }
    .hours-list li span { color: rgba(255,255,255,0.7); }
    .reserve-card {
      background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12);
      border-radius: 16px; padding: 2.5rem 2rem; backdrop-filter: blur(10px);
    }
    .reserve-card h3 { font-family: var(--serif); font-size: 1.5rem; margin-bottom: 1rem; color: #fff; }
    .reserve-card .row {
      display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem;
      color: rgba(255,255,255,0.85); font-size: 0.95rem;
    }
    .reserve-card .row svg { color: var(--primary); flex-shrink: 0; }
    .reserve-card a { color: #f4d2b6; }
    .reserve-card .btn {
      display: block; text-align: center; margin-top: 1.75rem;
      padding: 1rem; background: var(--primary); color: #fff;
      border-radius: 8px; font-weight: 600; transition: filter .2s;
    }
    .reserve-card .btn:hover { filter: brightness(1.1); }

    /* ─── Footer ─────────────────────────────────────────── */
    footer { background: #0f0a07; color: rgba(255,255,255,0.55); padding: 3rem 1.5rem; text-align: center; font-size: 0.85rem; }
    footer .brand { font-family: var(--serif); font-size: 1.25rem; color: #f4ece0; margin-bottom: 0.5rem; }
    footer .legal { display: flex; gap: 1.5rem; justify-content: center; margin-top: 1rem; }
    footer .legal a { color: inherit; transition: color .2s; }
    footer .legal a:hover { color: #f4d2b6; }

    /* ─── Reveal animations ───────────────────────────────── */
    .reveal { opacity: 1; transform: none; }
    /* visible by default */
    @media (prefers-reduced-motion: reduce) {
      .reveal, .hero-text * { opacity: 1 !important; transform: none !important; }
    }

    /* ─── Hero fallback when no scraped photo (big-type wordmark) ── */
    .hero.hero-no-img { background: linear-gradient(135deg, #1a1410 0%, ${escapeHtml(primary)} 100%); }
    .hero-no-img .hero-img { display: none; }
    .hero-decor-bigtype {
      position: absolute; bottom: clamp(2rem, 4vw, 4rem); right: clamp(2rem, 5vw, 6rem); z-index: -1;
      font-family: var(--display); font-weight: 500;
      font-size: clamp(4.5rem, 14vw, 14rem); line-height: 0.92; letter-spacing: -0.04em;
      color: rgba(255,255,255,0.10); text-align: right; max-width: 80vw;
      pointer-events: none;
    }

    /* ─── About fallback when no gallery image ────────────────── */
    .about-img.about-img-fallback {
      background: linear-gradient(135deg, var(--primary), var(--primary-deep)); aspect-ratio: 3/4;
      display: grid; place-items: center; padding: 2rem; border-radius: 4px;
    }
    .about-img-fallback::after {
      content: attr(data-letter); font-family: var(--display); font-weight: 500;
      font-size: clamp(8rem, 16vw, 14rem); line-height: 1; color: rgba(255,255,255,0.18);
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

<header class="reserve-bar">
  <div class="reserve-inner">
    <a class="reserve-brand" href="#"><span>·</span> ${businessName}</a>
    <input type="checkbox" id="nav-toggle" class="nav-toggle" aria-label="Menü öffnen" />
    <label for="nav-toggle" class="nav-burger" aria-hidden="true"><span></span></label>
    <nav class="reserve-nav">
      <a href="#menu">Speisekarte</a>
      <a href="#ueber-uns">Über uns</a>
      <a href="#galerie">Galerie</a>
      <a href="#reservierung">Öffnungszeiten</a>
      <a href="#reservierung" class="reserve-mobile-cta">${ctaText} →</a>
    </nav>
    <a href="#reservierung" class="reserve-cta">${ctaText} →</a>
  </div>
</header>

<section class="hero ${hasHero ? '' : 'hero-no-img'}">
  ${hasHero ? `<div class="hero-img" style="background-image: url('${escapeHtml(heroImage)}');"></div>` : `<div class="hero-decor-bigtype" aria-hidden="true">${businessName}</div>`}
  <div class="hero-text">
    <span class="hero-eyebrow">${escapeHtml(spec.tagline.slice(0, 50))}</span>
    <h1>${headline.replace(/\.([^.]*)$/, '<em>.$1</em>')}</h1>
    <p>${subhead}</p>
    ${renderRatingPill(spec)}
    <div class="hero-ctas">
      <a href="#reservierung" class="cta-primary">${ctaText}</a>
      <a href="#menu" class="cta-secondary">Speisekarte ansehen</a>
    </div>
  </div>
</section>

${renderMarquee(marqueeItems)}

${renderHeritageStatement(spec, foundedYear)}

${renderTrustBar(trustStats)}

<section id="menu" class="section">
  <div class="container">
    <div class="menu-head reveal">
      <span class="eyebrow">Speisekarte</span>
      <h2 class="section-title">Aus der Küche</h2>
      <p class="section-lead">Saisonal, regional, mit Liebe zum Detail. Unsere Karte wechselt mit den Jahreszeiten — was Sie hier sehen, ist eine Auswahl unserer Klassiker.</p>
    </div>

    ${menu.map((cat: NonNullable<SiteSpec['menu']>[number]) => `
      <div class="menu-cat reveal">
        <h3 class="menu-cat-title">${escapeHtml(cat.category)}</h3>
        <div class="menu-list">
          ${cat.items.map((item: NonNullable<SiteSpec['menu']>[number]['items'][number]) => `
            <div class="menu-item">
              <div class="menu-item-name">${escapeHtml(item.name)}</div>
              <div class="menu-item-price">${escapeHtml(item.price ?? '')}</div>
              ${item.description ? `<div class="menu-item-desc">${escapeHtml(item.description)}</div>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `).join('')}

    <div class="menu-cta-row reveal">
      <a href="#reservierung">Tisch reservieren →</a>
    </div>
  </div>
</section>

<section id="ueber-uns" class="section">
  <div class="container">
    <div class="about-grid">
      ${hasGallery
        ? `<div class="about-img reveal" style="background-image: url('${escapeHtml(getGalleryImage(spec, slug, 0, 900, 1200))}'); background-size: cover; background-position: center;" aria-hidden="true"></div>`
        : `<div class="about-img about-img-fallback reveal" data-letter="${escapeHtml(spec.business_name.charAt(0).toUpperCase())}" aria-hidden="true"></div>`
      }
      <div class="about-text reveal">
        <span class="eyebrow">Über uns</span>
        <h2>${businessName} — gelebte Gastfreundschaft.</h2>
        <p>${escapeHtml(spec.about.body)}</p>
        <p>Bei uns geht es nicht um Trends, sondern um ehrliches Handwerk: gute Zutaten, klare Aromen, Zeit für jeden Gang. Wir freuen uns, wenn Sie sich bei uns wie zu Hause fühlen.</p>
      </div>
    </div>
  </div>
</section>

${renderPullQuote(pullQuote, spec.business_name)}

${hasGallery && galleryCount(spec) >= 1 ? `
<section id="galerie" class="section">
  <div class="container">
    <div class="gallery-head reveal">
      <span class="eyebrow">Eindrücke</span>
      <h2 class="section-title">Atmosphäre</h2>
    </div>
    <div class="gallery-grid">
      ${Array.from({ length: Math.min(galleryCount(spec), 6) }, (_, i) => `
        <div class="gallery-item reveal" style="transition-delay: ${i * 60}ms">
          <img src="${galleryPhoto(spec, slug, i + 1)}" alt="Eindruck ${i + 1}" loading="lazy" decoding="async" width="700" height="520" />
        </div>
      `).join('')}
    </div>
  </div>
</section>
` : ''}

<section id="reservierung" class="section">
  <div class="container">
    <div class="reservierung-grid">
      <div class="reveal">
        <span class="eyebrow" style="color: var(--primary);">Öffnungszeiten</span>
        <h2>Wann wir auf Sie warten</h2>
        <p>Wir empfehlen frühzeitige Reservierung — besonders an Wochenenden und Feiertagen.</p>
        <ul class="hours-list">
          ${openingHours.map(h => `<li><strong>${escapeHtml(h.day)}</strong><span>${escapeHtml(h.hours)}</span></li>`).join('')}
        </ul>
      </div>
      <div class="reserve-card reveal">
        <h3>Tisch reservieren</h3>
        ${phone ? `<div class="row">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          <a href="tel:${escapeHtml(phone.replace(/\s/g, ''))}">${phone}</a>
        </div>` : ''}
        ${email ? `<div class="row">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          <a href="mailto:${email}">${email}</a>
        </div>` : ''}
        ${address ? `<div class="row">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          <span>${address}</span>
        </div>` : ''}
        ${email ? `<a href="mailto:${email}?subject=${encodeURIComponent('Reservierungsanfrage — ' + spec.business_name)}" class="btn">Anfrage senden</a>` : ''}
      </div>
    </div>
  </div>
</section>

${renderQuietFooter({
  businessName: spec.business_name,
  tagline: spec.tagline,
  ctaText,
  ctaHref: '#reservierung',
  socials: spec.socials,
})}

<script>
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('is-visible'); });
  }, { threshold: 0.1, rootMargin: '0px 0px -60px' });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
</script>
</body>
</html>
`;
}
