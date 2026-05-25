/**
 * Fitness template — bold, dark, high-energy.
 * Black canvas with neon accent (lime/green), giant condensed type,
 * class-schedule grid, membership pricing comparison, training photos.
 * Inspired by premium gym sites (Equinox, Barry's, Crossfit).
 */

import type { SiteSpec } from '../types.js';
import { renderSeoHead } from './_seo.js';
import { getGalleryImage, getHeroImage } from './_media.js';
import { avatarPlaceholder, SYMBOLIC_TAG_CSS } from './_avatar.js';
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

function gymPhoto(spec: SiteSpec, slug: string, idx: number, w = 1200, h = 800): string {
  return getGalleryImage(spec, slug, idx, w, h);
}

export function renderFitnessPage(spec: SiteSpec, slug: string): string {
  const PRESET = getBranchPreset('fitness');
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

  const services = spec.services && spec.services.length >= 3 ? spec.services : [
    { name: 'Krafttraining', description: 'Großzügiger Hantelbereich, Maschinen, Functional Zone.', price: 'ab 39 €' },
    { name: 'Yoga & Pilates', description: 'Klassen für alle Levels.', price: 'ab 49 €' },
    { name: 'Personal Training', description: 'Individuell, ergebnisorientiert.', price: 'ab 79 €' },
    { name: 'Probetraining', description: 'Kostenfrei, mit Einführung.', price: 'gratis' },
    { name: 'Ernährungsberatung', description: 'Realistische Pläne, keine Diäten.', price: '69 €' },
    { name: 'Wellness', description: 'Sauna, Dampfbad, Kaltwasserbecken.', price: 'inkl.' },
  ];

  const phone = spec.contact.phone ? escapeHtml(spec.contact.phone) : '';
  const email = spec.contact.email ? escapeHtml(spec.contact.email) : '';
  const address = spec.contact.address ? escapeHtml(spec.contact.address) : '';

  return `---
---
<!DOCTYPE html>
<html lang="de">
<head>
  ${renderSeoHead(spec, { slug, schemaKind: 'HealthAndBeautyBusiness' })}
  ${fontImportTags}
  <style>
    :root {
      --bg: ${PRESET.bg};
      --surface: #141414;
      --surface-2: #1c1c1c;
      --ink: ${PRESET.ink};
      --ink-2: rgba(245,245,244,0.7);
      --ink-3: rgba(245,245,244,0.4);
      --rule: rgba(255,255,255,0.10);
      --primary: ${escapeHtml(primary)};
      --primary-deep: color-mix(in oklch, ${escapeHtml(primary)} 70%, black);
      --secondary: ${escapeHtml(secondary)};
      --accent: ${escapeHtml(accent)};
      --accent-dim: color-mix(in oklch, ${escapeHtml(accent)} 70%, black);
      --display: ${headingFont};
      --serif: ${headingFont};
      --sans: ${bodyFont};
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body { background: var(--bg); color: var(--ink); font-family: var(--sans); line-height: 1.55; -webkit-font-smoothing: antialiased; overflow-x: hidden; }
    img { display: block; max-width: 100%; }
    a { color: inherit; text-decoration: none; }

    .demo-banner { background: #1a0a1f; color:#fff; padding:0.55rem 1rem; font-size:0.82rem; position: relative; z-index: 200; border-bottom: 1px solid rgba(236,101,186,0.35); }
    .demo-banner-inner { max-width: 1280px; margin: 0 auto; display: flex; align-items: center; gap: 0.85rem; flex-wrap: wrap; justify-content: center; }
    .demo-banner-tag { font-size: 0.7rem; letter-spacing: 0.16em; text-transform: uppercase; padding: 0.18rem 0.55rem; border-radius: 999px; background: rgba(236,101,186,0.22); border: 1px solid rgba(236,101,186,0.5); color: #ffd6ee; font-weight: 700; white-space: nowrap; }
    .demo-banner a { color: #ffb3df; font-weight: 700; border-bottom: 1px solid rgba(255,179,223,0.45); }

    /* ─── Header ────────────────────────────────────────── */
    .nav {
      position: sticky; top: 0; z-index: 50;
      background: rgba(10,10,10,0.92); backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--rule);
    }
    .nav-inner {
      max-width: 1300px; margin: 0 auto; padding: 1rem 1.5rem;
      display: flex; align-items: center; justify-content: space-between; gap: 1.5rem;
    }
    .brand-mark {
      font-family: var(--display); font-weight: 800; font-size: 1.75rem;
      letter-spacing: 0.04em; text-transform: uppercase; line-height: 1;
    }
    .brand-mark span { color: var(--accent); }
    .main-nav { display: none; gap: 2rem; font-size: 0.85rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; }
    .main-nav a { color: var(--ink-2); transition: color .2s; }
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
      .nav-burger { display: inline-flex; border-color: rgba(255,255,255,0.2); }
      .nav-burger:hover { background: rgba(255,255,255,0.06); }
      .main-nav {
        position: absolute; top: 100%; left: 0; right: 0;
        display: flex; flex-direction: column; gap: 0;
        background: rgba(10,10,10,0.96); backdrop-filter: blur(12px);
        border-bottom: 1px solid var(--rule);
        box-shadow: 0 14px 30px -16px rgba(0,0,0,0.4);
        padding: 0.25rem 1.5rem 1rem;
        transform: translateY(-12px); opacity: 0; pointer-events: none;
        transition: transform .25s ease, opacity .25s ease;
      }
      .main-nav a {
        padding: 0.95rem 0;
        border-bottom: 1px solid rgba(255,255,255,0.08);
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
      background: var(--accent); color: var(--bg);
      padding: 0.85rem 1.5rem;
      font-weight: 700; font-size: 0.85rem; letter-spacing: 0.06em; text-transform: uppercase;
      transition: background .2s, transform .2s;
    }
    .nav-cta:hover { background: var(--accent-dim); transform: translateY(-1px); }
    @media (max-width: 879px) { .nav-cta { display: none; } }

    /* ─── Hero — full-bleed photo + giant type ──────────── */
    .hero {
      position: relative; min-height: 92vh; overflow: hidden;
      display: grid; place-items: center;
      isolation: isolate;
    }
    .hero-img { position: absolute; inset: 0; z-index: -2; background-size: cover; background-position: center; }
    .hero::after { content: ''; position: absolute; inset: 0; z-index: -1; background: linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.65) 100%); }
    .hero-text { max-width: 1300px; padding: 4rem 2rem; text-align: center; }
    .hero-eyebrow {
      display: inline-flex; align-items: center; gap: 0.6rem;
      font-size: 0.78rem; letter-spacing: 0.24em; text-transform: uppercase;
      color: var(--accent); font-weight: 700; margin-bottom: 1.5rem;
    }
    .hero-eyebrow::before, .hero-eyebrow::after { content:''; width: 24px; height: 2px; background: var(--accent); }
    .hero-text h1 {
      font-family: var(--display); font-weight: 800;
      font-size: clamp(3.5rem, 11vw, 11rem); line-height: 0.85; letter-spacing: -0.01em;
      text-transform: uppercase; color: var(--ink);
    }
    .hero-text h1 em { font-style: normal; color: var(--accent); }
    .hero-text p {
      color: var(--ink-2); font-size: clamp(1.05rem, 1.4vw, 1.25rem);
      max-width: 600px; margin: 2rem auto 0; line-height: 1.65;
    }
    .hero-cta-row { display: flex; gap: 1rem; justify-content: center; margin-top: 2.5rem; flex-wrap: wrap; }
    .btn-primary {
      background: var(--accent); color: var(--bg);
      padding: 1.15rem 2rem;
      font-weight: 700; font-size: 0.95rem; letter-spacing: 0.06em; text-transform: uppercase;
      transition: background .2s, transform .2s, box-shadow .2s;
    }
    .btn-primary:hover { background: #fff; transform: translate(2px, -2px); box-shadow: -4px 4px 0 var(--accent); }
    .btn-ghost {
      background: transparent; color: #fff; border: 2px solid #fff;
      padding: 1rem 2rem;
      font-weight: 700; font-size: 0.95rem; letter-spacing: 0.06em; text-transform: uppercase;
      transition: background .2s, color .2s;
    }
    .btn-ghost:hover { background: #fff; color: var(--bg); }

    /* ─── Marquee ────────────────────────────────────────── */
    .marquee {
      background: var(--accent); color: var(--bg);
      padding: 0.85rem 0; overflow: hidden;
      border-top: 1px solid var(--bg); border-bottom: 1px solid var(--bg);
    }
    .marquee-track {
      display: flex; gap: 3rem; white-space: nowrap;
      animation: scroll 22s linear infinite;
      font-family: var(--display); font-weight: 700; font-size: 1.4rem; letter-spacing: 0.04em; text-transform: uppercase;
    }
    .marquee-track span::before { content: '★'; margin-right: 3rem; }
    @keyframes scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
    @media (prefers-reduced-motion: reduce) { .marquee-track { animation: none; } }

    /* ─── Section base ───────────────────────────────────── */
    .section { padding: clamp(5rem, 9vw, 9rem) 1.5rem; }
    .container { max-width: 1300px; margin: 0 auto; }
    .section-eyebrow { display: inline-block; font-size: 0.78rem; font-weight: 700; letter-spacing: 0.22em; text-transform: uppercase; color: var(--accent); margin-bottom: 1rem; }
    .section-title {
      font-family: var(--display); font-weight: 800;
      font-size: clamp(2.5rem, 6vw, 5rem); line-height: 0.9; letter-spacing: -0.005em;
      text-transform: uppercase; margin-bottom: 1.25rem; color: #fff;
    }
    .section-title em { font-style: normal; color: var(--accent); }
    .section-lead { color: var(--ink-2); font-size: 1.05rem; line-height: 1.7; max-width: 600px; }
    .section-head.center { text-align: center; }
    .section-head.center .section-lead { margin-inline: auto; }

    /* ─── Programs grid ──────────────────────────────────── */
    .programs {
      display: grid; gap: 1px; background: var(--rule);
      grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr));
      margin-top: 4rem;
    }
    @media (min-width: 880px) { .programs { grid-template-columns: repeat(3, 1fr); } }
    .program {
      background: var(--surface);
      padding: 2.5rem 2rem; transition: background .25s ease;
      position: relative; overflow: hidden;
    }
    .program::before {
      content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 4px;
      background: var(--accent); transform: scaleX(0); transform-origin: left;
      transition: transform .35s ease;
    }
    .program:hover { background: var(--surface-2); }
    .program:hover::before { transform: scaleX(1); }
    .program-num { font-family: var(--display); font-weight: 700; font-size: 0.85rem; color: var(--accent); margin-bottom: 1rem; letter-spacing: 0.1em; }
    .program h3 { font-family: var(--display); font-weight: 700; font-size: 1.85rem; line-height: 1; text-transform: uppercase; letter-spacing: 0.02em; margin-bottom: 0.85rem; color: #fff; }
    .program p { color: var(--ink-2); font-size: 0.95rem; line-height: 1.6; margin-bottom: 1.5rem; }
    .program .price { font-family: var(--display); font-size: 1.5rem; color: var(--accent); font-weight: 700; }

    /* ─── Schedule grid ──────────────────────────────────── */
    .schedule { background: var(--surface); padding: clamp(5rem, 9vw, 8rem) 1.5rem; }
    .schedule-table {
      max-width: 1100px; margin: 3rem auto 0;
      display: grid; gap: 1px; background: var(--rule);
      grid-template-columns: 1fr;
    }
    @media (min-width: 700px) {
      .schedule-table { grid-template-columns: repeat(5, 1fr); }
    }
    .schedule-day {
      background: var(--bg); padding: 1.5rem;
    }
    .schedule-day .day-name { font-family: var(--display); font-size: 1.1rem; letter-spacing: 0.04em; text-transform: uppercase; color: var(--accent); margin-bottom: 1rem; font-weight: 700; }
    .schedule-class {
      display: flex; flex-direction: column; gap: 0.25rem;
      padding: 0.85rem 0; border-top: 1px solid var(--rule);
      font-size: 0.88rem;
    }
    .schedule-class:first-of-type { border-top: none; }
    .schedule-class .time { color: var(--ink-3); font-variant-numeric: tabular-nums; }
    .schedule-class .name { color: #fff; font-weight: 600; }

    /* ─── Trainer team ───────────────────────────────────── */
    .team { padding: clamp(5rem, 9vw, 8rem) 1.5rem; }
    .team-grid { display: grid; gap: 1.25rem; grid-template-columns: repeat(auto-fit, minmax(min(220px, 100%), 1fr)); margin-top: 4rem; }
    @media (min-width: 880px) { .team-grid { grid-template-columns: repeat(4, 1fr); } }
    .trainer { position: relative; aspect-ratio: 4/5; overflow: hidden; }
    .trainer img { width: 100%; height: 100%; object-fit: cover; filter: grayscale(0.4) contrast(1.05); transition: filter .4s, transform .8s; }
    .trainer:hover img { filter: grayscale(0); transform: scale(1.04); }
    ${SYMBOLIC_TAG_CSS}
    .trainer-info {
      position: absolute; left: 0; right: 0; bottom: 0;
      background: linear-gradient(0deg, var(--bg) 0%, transparent 100%);
      padding: 4rem 1.25rem 1.25rem;
    }
    .trainer-name { font-family: var(--display); font-size: 1.5rem; line-height: 1; text-transform: uppercase; letter-spacing: 0.02em; font-weight: 700; color: #fff; }
    .trainer-role { color: var(--accent); font-size: 0.78rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; margin-top: 0.4rem; }

    /* ─── Final CTA ──────────────────────────────────────── */
    .final-cta {
      padding: clamp(6rem, 11vw, 10rem) 1.5rem; text-align: center;
      background: var(--accent); color: var(--bg);
    }
    .final-cta h2 {
      font-family: var(--display); font-weight: 800;
      font-size: clamp(3rem, 8vw, 7rem); line-height: 0.85; letter-spacing: -0.005em;
      text-transform: uppercase; margin-bottom: 1.5rem;
    }
    .final-cta p { font-size: 1.2rem; max-width: 540px; margin: 0 auto 2.5rem; line-height: 1.6; font-weight: 500; }
    .final-cta .btn-black {
      background: var(--bg); color: var(--accent);
      padding: 1.2rem 2.5rem;
      font-weight: 700; font-size: 1rem; letter-spacing: 0.06em; text-transform: uppercase;
      transition: transform .2s, box-shadow .2s;
    }
    .final-cta .btn-black:hover { transform: translate(2px, -2px); box-shadow: -4px 4px 0 #fff; }
    .cta-info { display: flex; gap: 2rem; justify-content: center; margin-top: 2.5rem; flex-wrap: wrap; font-size: 0.95rem; font-weight: 600; }
    .cta-info a { color: var(--bg); border-bottom: 2px solid var(--bg); padding-bottom: 1px; }

    footer { background: #050505; color: rgba(255,255,255,0.55); padding: 3rem 1.5rem; text-align: center; font-size: 0.85rem; }
    footer .brand { font-family: var(--display); font-size: 1.5rem; color: #fff; margin-bottom: 0.5rem; letter-spacing: 0.04em; text-transform: uppercase; font-weight: 800; }
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
    <a class="brand-mark" href="#">${businessName.split(' ').map((w, i) => i === 0 ? `<span>${w}</span>` : w).join(' ')}</a>
    <input type="checkbox" id="nav-toggle" class="nav-toggle" aria-label="Menü öffnen" />
    <label for="nav-toggle" class="nav-burger" aria-hidden="true"><span></span></label>
    <nav class="main-nav">
      <a href="#programme">Programme</a>
      <a href="#kursplan">Kursplan</a>
      <a href="#trainer">Trainer</a>
      <a href="#kontakt">Kontakt</a>
    </nav>
    <a href="#kontakt" class="nav-cta">Probetraining</a>
  </div>
</header>

<section class="hero">
  <div class="hero-img" style="background-image: url('${getHeroImage(spec, slug, 1800, 1200)}');"></div>
  <div class="hero-text">
    <span class="hero-eyebrow">${escapeHtml(tagline.slice(0, 60))}</span>
    <h1>${escapeHtml(headline.replace(/\s*(\S+\.?)$/, '|$1|')).replace(/\|([^|]+)\|/, '<em>$1</em>')}</h1>
    <p>${subhead}</p>
    ${renderRatingPill(spec)}
    <div class="hero-cta-row">
      <a href="#kontakt" class="btn-primary">${ctaText} →</a>
      <a href="#programme" class="btn-ghost">Programme</a>
    </div>
  </div>
</section>

${renderMarquee(marqueeItems) || `<div class="marquee">
  <div class="marquee-track" aria-hidden="true">
    <span>NIE WIEDER WARTEN</span>
    <span>OFFEN AB 6 UHR</span>
    <span>FREIES PROBETRAINING</span>
    <span>FAIRE PREISE</span>
    <span>ZERTIFIZIERTE TRAINER</span>
    <span>NIE WIEDER WARTEN</span>
    <span>OFFEN AB 6 UHR</span>
    <span>FREIES PROBETRAINING</span>
  </div>
</div>`}

${renderTrustBar(trustStats)}

<section id="programme" class="section">
  <div class="container">
    <div class="section-head reveal">
      <span class="section-eyebrow">Programme</span>
      <h2 class="section-title">Sechs Wege<br>zum <em>Fortschritt</em>.</h2>
      <p class="section-lead">Egal ob Kraft, Beweglichkeit oder Ausdauer — wir haben das Konzept und die Trainer dafür.</p>
    </div>
    <div class="programs">
      ${services.map((s, i) => `
        <article class="program reveal">
          <div class="program-num">${String(i + 1).padStart(2, '0')} / ${String(services.length).padStart(2, '0')}</div>
          <h3>${escapeHtml(s.name)}</h3>
          <p>${escapeHtml(s.description)}</p>
          <span class="price">${escapeHtml(s.price ?? '')}</span>
        </article>
      `).join('')}
    </div>
  </div>
</section>

<section id="kursplan" class="schedule">
  <div class="container">
    <div class="section-head center reveal">
      <span class="section-eyebrow">Kursplan</span>
      <h2 class="section-title">Diese <em>Woche</em>.</h2>
      <p class="section-lead">Ein Auszug aus dem aktuellen Wochenplan — der vollständige Plan ist in der App.</p>
    </div>
    <div class="schedule-table">
      <div class="schedule-day">
        <div class="day-name">Mo</div>
        <div class="schedule-class"><span class="time">06:30</span><span class="name">Morning Strength</span></div>
        <div class="schedule-class"><span class="time">10:00</span><span class="name">Pilates</span></div>
        <div class="schedule-class"><span class="time">18:00</span><span class="name">HIIT</span></div>
      </div>
      <div class="schedule-day">
        <div class="day-name">Di</div>
        <div class="schedule-class"><span class="time">07:00</span><span class="name">Yoga Flow</span></div>
        <div class="schedule-class"><span class="time">12:00</span><span class="name">Lunch Lift</span></div>
        <div class="schedule-class"><span class="time">19:00</span><span class="name">Functional</span></div>
      </div>
      <div class="schedule-day">
        <div class="day-name">Mi</div>
        <div class="schedule-class"><span class="time">06:30</span><span class="name">CrossCore</span></div>
        <div class="schedule-class"><span class="time">10:00</span><span class="name">Mobility</span></div>
        <div class="schedule-class"><span class="time">18:30</span><span class="name">Powerflow</span></div>
      </div>
      <div class="schedule-day">
        <div class="day-name">Do</div>
        <div class="schedule-class"><span class="time">07:00</span><span class="name">Yoga Flow</span></div>
        <div class="schedule-class"><span class="time">17:30</span><span class="name">Cardio Burn</span></div>
        <div class="schedule-class"><span class="time">19:30</span><span class="name">Strength 60</span></div>
      </div>
      <div class="schedule-day">
        <div class="day-name">Fr</div>
        <div class="schedule-class"><span class="time">06:30</span><span class="name">Friday Power</span></div>
        <div class="schedule-class"><span class="time">12:30</span><span class="name">Mid-day HIIT</span></div>
        <div class="schedule-class"><span class="time">18:00</span><span class="name">End-of-Week</span></div>
      </div>
    </div>
  </div>
</section>

<section id="trainer" class="team">
  <div class="container">
    <div class="section-head center reveal">
      <span class="section-eyebrow">Trainer</span>
      <h2 class="section-title">Wer <em>dich</em> begleitet.</h2>
      <p class="section-lead">Vier Trainer:innen mit Spezialisierungen — keine Standard-Pläne, sondern dein Programm.</p>
    </div>
    <div class="team-grid">
      ${[1,2,3,4].map(i => {
        const names = ['MAX', 'LENA', 'SARA', 'NICO'];
        const roles = ['HEAD COACH · STRENGTH', 'YOGA · MOBILITY', 'PERSONAL TRAINING', 'CARDIO · GROUP'];
        return `
          <article class="trainer reveal avatar-symbolic-wrap">
            <img src="${avatarPlaceholder(names[i - 1], '#0a0a0a')}" alt="${names[i - 1]}" loading="lazy">
            <span class="avatar-symbolic-tag">Symbolfoto</span>
            <div class="trainer-info">
              <div class="trainer-name">${names[i - 1]}</div>
              <div class="trainer-role">${roles[i - 1]}</div>
            </div>
          </article>
        `;
      }).join('')}
    </div>
  </div>
</section>

<section id="kontakt" class="final-cta">
  <h2>Komm vorbei.<br>Trainier mit.</h2>
  <p>Probetraining ist immer kostenlos und unverbindlich. Du bekommst eine Einführung in alle Bereiche und kannst direkt loslegen.</p>
  ${email ? `<a href="mailto:${email}?subject=${encodeURIComponent('Probetraining')}" class="btn-black">${ctaText} →</a>` : ''}
  <div class="cta-info">
    ${phone ? `<a href="tel:${phone.replace(/\s/g, '')}">${phone}</a>` : ''}
    ${email ? `<a href="mailto:${email}">${email}</a>` : ''}
    ${address ? `<span>${address}</span>` : ''}
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
