/**
 * Arzt / Praxis template — calming, trustworthy, accessible.
 * Soft blue/teal palette, rounded forms, large readable type, opening hours
 * + appointment-CTA prominent. Designed for accessibility (WCAG-AA contrast).
 */

import type { SiteSpec } from '../types.js';
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

export function renderArztPage(spec: SiteSpec, slug: string): string {
  const PRESET = getBranchPreset('arzt');
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
    if (years > 0) trustStats.push({ value: `${years}+`, label: 'Jahre Praxis' });
  }
  if (spec.business?.rating && spec.business?.review_count && spec.business.review_count >= 5) {
    trustStats.push({ value: `${spec.business.rating.toFixed(1).replace('.', ',')} ★`, label: `${spec.business.review_count} Bewertungen` });
  }
  trustStats.push({ value: 'Alle Kassen', label: 'Versicherungen' });

  const services = spec.services && spec.services.length >= 3 ? spec.services : [
    { name: 'Allgemeinmedizin', description: 'Vorsorge, Akutbeschwerden, Impfungen — die ganze Familie in einer Hand.' },
    { name: 'Diagnostik', description: 'EKG, Ultraschall, Labor — moderne Geräte, klare Befunde.' },
    { name: 'Vorsorge', description: 'Gesundenuntersuchung, Krebsvorsorge, Reisemedizin.' },
    { name: 'Chronische Erkrankungen', description: 'Strukturierte Langzeitbetreuung — persönlich.' },
    { name: 'Hausbesuche', description: 'Bei Bedarf kommen wir zu Ihnen — vor allem für ältere Patient:innen.' },
    { name: 'Gesundheitsberatung', description: 'Ernährung, Bewegung, Schlaf — was wirklich hilft.' },
  ];

  const hours = spec.opening_hours && spec.opening_hours.length > 0 ? spec.opening_hours : [
    { day: 'Montag', hours: '08:00 – 12:00 · 15:00 – 18:00' },
    { day: 'Dienstag', hours: '08:00 – 12:00' },
    { day: 'Mittwoch', hours: '08:00 – 12:00 · 15:00 – 18:00' },
    { day: 'Donnerstag', hours: '08:00 – 12:00' },
    { day: 'Freitag', hours: '08:00 – 14:00' },
  ];

  const phone = spec.contact.phone ? escapeHtml(spec.contact.phone) : '';
  const email = spec.contact.email ? escapeHtml(spec.contact.email) : '';
  const address = spec.contact.address ? escapeHtml(spec.contact.address) : '';

  return `---
---
<!DOCTYPE html>
<html lang="de">
<head>
  ${renderSeoHead(spec, { slug, schemaKind: 'MedicalBusiness' })}
  ${fontImportTags}
  <style>
    :root {
      --bg: ${PRESET.bg};
      --surface: #ffffff;
      --primary: ${escapeHtml(primary)};
      --primary-deep: color-mix(in oklch, ${escapeHtml(primary)} 70%, black);
      --primary-soft: color-mix(in oklch, ${escapeHtml(primary)} 14%, white);
      --primary-50: color-mix(in oklch, ${escapeHtml(primary)} 5%, white);
      --primary-700: color-mix(in oklch, ${escapeHtml(primary)} 70%, black);
      --secondary: ${escapeHtml(secondary)};
      --accent: ${escapeHtml(accent)};
      --ink: ${PRESET.ink};
      --ink-2: #475569;
      --ink-3: #94a3b8;
      --rule: rgba(15,23,42,0.08);
      --display: ${headingFont};
      --serif: ${headingFont};
      --sans: ${bodyFont};
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body { background: var(--bg); color: var(--ink); font-family: var(--sans); font-size: 17px; line-height: 1.65; -webkit-font-smoothing: antialiased; overflow-x: hidden; }
    img { display: block; max-width: 100%; }
    a { color: inherit; text-decoration: none; }
    *:focus-visible { outline: 3px solid color-mix(in oklch, var(--primary) 50%, transparent); outline-offset: 2px; border-radius: 4px; }

    .demo-banner { background: #1a0a1f; color:#fff; padding:0.55rem 1rem; font-size:0.82rem; position: relative; z-index: 200; border-bottom: 1px solid rgba(236,101,186,0.35); }
    .demo-banner-inner { max-width: 1280px; margin: 0 auto; display: flex; align-items: center; gap: 0.85rem; flex-wrap: wrap; justify-content: center; }
    .demo-banner-tag { font-size: 0.7rem; letter-spacing: 0.16em; text-transform: uppercase; padding: 0.18rem 0.55rem; border-radius: 999px; background: rgba(236,101,186,0.22); border: 1px solid rgba(236,101,186,0.5); color: #ffd6ee; font-weight: 700; white-space: nowrap; }
    .demo-banner a { color: #ffb3df; font-weight: 700; border-bottom: 1px solid rgba(255,179,223,0.45); }

    /* ─── Top utility bar ────────────────────────────────── */
    .util {
      background: var(--primary); color: #fff;
      font-size: 0.88rem; padding: 0.65rem 1.5rem;
    }
    .util-inner {
      max-width: 1200px; margin: 0 auto;
      display: flex; gap: 1.5rem; justify-content: center; flex-wrap: wrap; align-items: center;
    }
    .util a { color: #fff; font-weight: 600; border-bottom: 1px dotted rgba(255,255,255,0.5); padding-bottom: 1px; }
    .util a:hover { border-color: #fff; }

    /* ─── Header ─────────────────────────────────────────── */
    .nav {
      position: sticky; top: 0; z-index: 50;
      background: rgba(246,249,251,0.92); backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--rule);
    }
    .nav-inner {
      max-width: 1200px; margin: 0 auto; padding: 1rem 1.5rem;
      display: flex; align-items: center; justify-content: space-between; gap: 1.5rem;
    }
    .brand-mark {
      font-family: var(--serif); font-weight: 600; font-size: 1.4rem;
      color: var(--ink); letter-spacing: -0.005em;
    }
    .brand-mark .dot {
      display: inline-block; width: 0.5rem; height: 0.5rem; border-radius: 50%;
      background: var(--primary); margin-right: 0.6rem; vertical-align: middle;
    }
    .main-nav { display: none; gap: 2rem; font-size: 0.92rem; font-weight: 500; }
    .main-nav a { color: var(--ink-2); transition: color .2s; }
    .main-nav a:hover { color: var(--primary); }
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
        background: rgba(246,249,251,0.97); backdrop-filter: blur(12px);
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
    .nav-cta {
      background: var(--primary); color: #fff;
      padding: 0.85rem 1.5rem; border-radius: 999px;
      font-weight: 600; font-size: 0.9rem;
      transition: background .2s, transform .2s;
    }
    .nav-cta:hover { background: var(--primary-700); transform: translateY(-1px); }
    @media (max-width: 879px) { .nav-cta { display: none; } }

    /* ─── Hero — 2-column with reassurance ──────────────── */
    .hero { padding: clamp(3.5rem, 7vw, 6rem) 1.5rem; }
    .hero-inner {
      max-width: 1200px; margin: 0 auto;
      display: grid; gap: 4rem; align-items: center;
    }
    @media (min-width: 880px) { .hero-inner { grid-template-columns: 1.05fr 1fr; gap: 5rem; } }
    .hero-eyebrow {
      display: inline-flex; align-items: center; gap: 0.5rem;
      background: var(--primary-soft); color: var(--primary-700);
      padding: 0.45rem 0.95rem; border-radius: 999px;
      font-size: 0.78rem; letter-spacing: 0.08em; text-transform: uppercase;
      font-weight: 600; margin-bottom: 1.5rem;
    }
    .hero-eyebrow svg { color: var(--primary); }
    .hero h1 {
      font-family: var(--serif); font-weight: 500;
      font-size: clamp(2.25rem, 5vw, 3.75rem); line-height: 1.1; letter-spacing: -0.025em;
      color: var(--ink);
    }
    .hero h1 em { font-style: italic; color: var(--primary); font-weight: 400; }
    .hero p { color: var(--ink-2); font-size: 1.1rem; margin-top: 1.5rem; max-width: 480px; line-height: 1.65; }
    .hero-cta-row { display: flex; gap: 1rem; margin-top: 2rem; flex-wrap: wrap; }
    .btn-primary {
      background: var(--primary); color: #fff;
      padding: 1rem 1.75rem; border-radius: 14px;
      font-weight: 600; font-size: 1rem;
      transition: background .2s, transform .2s, box-shadow .2s;
      box-shadow: 0 6px 20px -8px var(--primary);
    }
    .btn-primary:hover { background: var(--primary-700); transform: translateY(-2px); box-shadow: 0 12px 28px -10px var(--primary); }
    .btn-secondary {
      background: var(--surface); color: var(--ink);
      border: 1.5px solid var(--rule);
      padding: 1rem 1.75rem; border-radius: 14px;
      font-weight: 600; font-size: 1rem;
      transition: border-color .2s, color .2s;
    }
    .btn-secondary:hover { border-color: var(--primary); color: var(--primary); }

    /* Reassurance card on hero right */
    .reassurance {
      background: var(--surface); border-radius: 24px;
      padding: 2rem; box-shadow: 0 24px 60px -28px rgba(14, 116, 144, 0.25);
      border: 1px solid var(--rule);
    }
    .reassurance h3 { font-family: var(--serif); font-size: 1.35rem; margin-bottom: 1.5rem; font-weight: 500; }
    .reassurance ul { list-style: none; display: flex; flex-direction: column; gap: 0.85rem; }
    .reassurance li { display: flex; align-items: flex-start; gap: 0.75rem; color: var(--ink-2); font-size: 0.95rem; line-height: 1.5; }
    .reassurance li svg { color: var(--primary); flex-shrink: 0; margin-top: 2px; }
    .reassurance .next-slot {
      margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--rule);
      display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;
    }
    .reassurance .next-slot span { color: var(--ink-3); font-size: 0.85rem; }
    .reassurance .next-slot strong { color: var(--primary); font-size: 1.05rem; }

    /* ─── Trust strip ────────────────────────────────────── */
    .trust-strip {
      background: var(--surface); padding: 2.25rem 1.5rem; border-top: 1px solid var(--rule); border-bottom: 1px solid var(--rule);
    }
    .trust-inner {
      max-width: 1100px; margin: 0 auto;
      display: grid; gap: 1.5rem; grid-template-columns: repeat(auto-fit, minmax(min(180px, 100%), 1fr));
      text-align: center;
    }
    .trust-num { font-family: var(--serif); font-size: 2rem; line-height: 1; color: var(--primary); font-weight: 600; margin-bottom: 0.3rem; }
    .trust-lbl { font-size: 0.82rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-3); font-weight: 500; }

    /* ─── Section base ───────────────────────────────────── */
    .section { padding: clamp(4rem, 7vw, 7rem) 1.5rem; }
    .container { max-width: 1200px; margin: 0 auto; }
    .section-eyebrow {
      display: inline-block; padding: 0.4rem 0.9rem; border-radius: 999px;
      background: var(--primary-soft); color: var(--primary-700);
      font-size: 0.78rem; letter-spacing: 0.1em; text-transform: uppercase;
      font-weight: 600; margin-bottom: 1.25rem;
    }
    .section-title {
      font-family: var(--serif); font-weight: 500;
      font-size: clamp(2rem, 4vw, 3rem); line-height: 1.15; letter-spacing: -0.02em;
      margin-bottom: 1.25rem;
    }
    .section-title em { font-style: italic; color: var(--primary); font-weight: 400; }
    .section-lead { color: var(--ink-2); font-size: 1.05rem; line-height: 1.75; max-width: 600px; }
    .section-head.center { text-align: center; }
    .section-head.center .section-lead { margin-inline: auto; }

    /* ─── Services grid (3 cols) ─────────────────────────── */
    .services-grid {
      display: grid; gap: 1.25rem;
      grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr));
      margin-top: 3rem;
    }
    @media (min-width: 880px) { .services-grid { grid-template-columns: repeat(3, 1fr); } }
    .service-card {
      background: var(--surface); border: 1px solid var(--rule);
      border-radius: 18px; padding: 2rem 1.75rem;
      transition: transform .3s ease, box-shadow .3s ease, border-color .3s ease;
    }
    .service-card:hover { transform: translateY(-3px); box-shadow: 0 18px 40px -16px rgba(14, 116, 144, 0.18); border-color: color-mix(in oklch, var(--primary) 30%, transparent); }
    .service-icon {
      width: 44px; height: 44px; border-radius: 12px;
      background: var(--primary-soft); color: var(--primary);
      display: grid; place-items: center; margin-bottom: 1.25rem;
    }
    .service-card h3 { font-family: var(--serif); font-weight: 500; font-size: 1.3rem; line-height: 1.3; margin-bottom: 0.5rem; }
    .service-card p { color: var(--ink-2); font-size: 0.95rem; line-height: 1.65; }

    /* ─── Hours + Booking ───────────────────────────────── */
    .hours-block { background: var(--primary-50); }
    .hours-grid {
      max-width: 1100px; margin: 0 auto;
      display: grid; gap: 3rem;
    }
    @media (min-width: 880px) { .hours-grid { grid-template-columns: 1.05fr 1fr; gap: 5rem; align-items: center; } }
    .hours-list { background: var(--surface); border-radius: 20px; padding: 2rem; box-shadow: 0 18px 40px -20px rgba(14, 116, 144, 0.18); }
    .hours-list h3 { font-family: var(--serif); font-weight: 500; font-size: 1.35rem; margin-bottom: 1.5rem; }
    .hours-list ul { list-style: none; }
    .hours-list li {
      display: flex; justify-content: space-between; align-items: center;
      padding: 0.95rem 0; border-bottom: 1px solid var(--rule);
      font-size: 1rem;
    }
    .hours-list li:last-child { border-bottom: none; }
    .hours-list .day { font-weight: 500; color: var(--ink); }
    .hours-list .hh { color: var(--ink-2); font-variant-numeric: tabular-nums; }
    .hours-list .closed { color: var(--ink-3); font-style: italic; }

    /* ─── Notfall hint ───────────────────────────────────── */
    .notfall {
      background: #fef3c7; border-left: 4px solid #f59e0b;
      padding: 1.25rem 1.5rem; border-radius: 8px; margin-top: 1.5rem;
      font-size: 0.95rem; color: #78350f;
    }
    .notfall strong { display: block; margin-bottom: 0.25rem; }

    /* ─── Contact ────────────────────────────────────────── */
    .contact-section { background: var(--surface); }
    .contact-grid {
      display: grid; gap: 1.25rem;
      grid-template-columns: repeat(auto-fit, minmax(min(220px, 100%), 1fr));
      max-width: 1100px; margin: 3rem auto 0;
    }
    .contact-card {
      background: var(--primary-50); border-radius: 18px; padding: 2rem 1.5rem;
      text-align: center;
    }
    .contact-card .ic {
      width: 48px; height: 48px; margin: 0 auto 1rem;
      border-radius: 14px; background: var(--surface);
      display: grid; place-items: center; color: var(--primary);
      box-shadow: 0 4px 12px -4px rgba(14,116,144,0.2);
    }
    .contact-card .lbl { font-size: 0.78rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-3); font-weight: 600; margin-bottom: 0.5rem; }
    .contact-card .val { font-family: var(--serif); font-size: 1.2rem; line-height: 1.4; color: var(--ink); }
    .contact-card a { color: var(--ink); }
    .contact-card a:hover { color: var(--primary); }

    /* ─── Footer ─────────────────────────────────────────── */
    footer { background: var(--ink); color: rgba(255,255,255,0.65); padding: 3rem 1.5rem; text-align: center; font-size: 0.85rem; }
    footer .brand { font-family: var(--serif); font-size: 1.3rem; color: #fff; margin-bottom: 0.4rem; }
    footer .legal { display: flex; gap: 1.5rem; justify-content: center; margin-top: 1rem; flex-wrap: wrap; }
    footer .legal a { color: inherit; transition: color .2s; }
    footer .legal a:hover { color: var(--primary-soft); }

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

<div class="util">
  <div class="util-inner">
    ${phone ? `<span>📞 <a href="tel:${phone.replace(/\s/g, '')}">${phone}</a></span>` : ''}
    <span>Notfall außerhalb der Sprechzeiten: 144 (Rettung) · 141 (Ärztenotdienst)</span>
  </div>
</div>

<header class="nav">
  <div class="nav-inner">
    <a class="brand-mark" href="#"><span class="dot"></span>${businessName}</a>
    <input type="checkbox" id="nav-toggle" class="nav-toggle" aria-label="Menü öffnen" />
    <label for="nav-toggle" class="nav-burger" aria-hidden="true"><span></span></label>
    <nav class="main-nav">
      <a href="#leistungen">Leistungen</a>
      <a href="#sprechzeiten">Sprechzeiten</a>
      <a href="#ueber-uns">Über uns</a>
      <a href="#kontakt">Kontakt</a>
    </nav>
    <a href="#kontakt" class="nav-cta">${ctaText}</a>
  </div>
</header>

<section class="hero">
  <div class="hero-inner">
    <div class="reveal">
      <span class="hero-eyebrow">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9 12l2 2 4-4"/></svg>
        ${escapeHtml(tagline.slice(0, 60))}
      </span>
      <h1>${escapeHtml(headline.replace(/(\.|\?)([^.?]*)$/, '|$1|'))
            .replace(/\|(\.|\?)\|([^|]*)/, '<em>$1</em>$2')}</h1>
      <p>${subhead}</p>
      ${renderRatingPill(spec)}
      <div class="hero-cta-row">
        <a href="#kontakt" class="btn-primary">${ctaText}</a>
        <a href="#leistungen" class="btn-secondary">Behandlungen ansehen</a>
      </div>
    </div>

    <aside class="reassurance reveal" aria-label="Was Sie erwartet">
      <h3>Was Sie bei uns erwartet</h3>
      <ul>
        <li>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          Termine in der Regel innerhalb von 7 Tagen
        </li>
        <li>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          Kassenpraxis — alle Versicherungen
        </li>
        <li>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          Hausbesuche bei Bedarf
        </li>
        <li>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          Persönliche Beratung — wir nehmen uns Zeit
        </li>
      </ul>
      <div class="next-slot">
        <span>Nächster freier Termin</span>
        <strong>Mo, 14:30 Uhr</strong>
      </div>
    </aside>
  </div>
</section>

${renderMarquee(marqueeItems)}

${renderHeritageStatement(spec, foundedYear)}

${trustStats.length >= 2 ? renderTrustBar(trustStats) : `
<section class="trust-strip">
  <div class="trust-inner">
    <div><div class="trust-num">20+</div><div class="trust-lbl">Jahre Praxis</div></div>
    <div><div class="trust-num">5.000+</div><div class="trust-lbl">Patient:innen</div></div>
    <div><div class="trust-num">&lt; 7 Tage</div><div class="trust-lbl">Wartezeit</div></div>
    <div><div class="trust-num">100%</div><div class="trust-lbl">Diskretion</div></div>
  </div>
</section>
`}

<section id="leistungen" class="section">
  <div class="container">
    <div class="section-head center reveal">
      <span class="section-eyebrow">Behandlungen</span>
      <h2 class="section-title">Was wir <em>können</em>.</h2>
      <p class="section-lead">Allgemeinmedizin mit Schwerpunkten — vom Akutbesuch bis zur strukturierten Langzeitbetreuung.</p>
    </div>
    <div class="services-grid">
      ${services.map(s => `
        <article class="service-card reveal">
          <div class="service-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <h3>${escapeHtml(s.name)}</h3>
          <p>${escapeHtml(s.description)}</p>
        </article>
      `).join('')}
    </div>
  </div>
</section>

<section id="sprechzeiten" class="section hours-block">
  <div class="container">
    <div class="hours-grid">
      <div class="reveal">
        <span class="section-eyebrow">Sprechzeiten</span>
        <h2 class="section-title">Wann wir für Sie <em>da sind</em>.</h2>
        <p class="section-lead">Termine bevorzugt per E-Mail oder telefonisch — wir bestätigen binnen 24 Stunden. In dringenden Fällen rufen Sie uns gern direkt an.</p>
        <div class="notfall">
          <strong>Außerhalb der Sprechzeiten:</strong>
          Ärztenotdienst <a href="tel:141" style="color:#78350f; font-weight:700;">141</a>,
          bei Lebensgefahr Rettung <a href="tel:144" style="color:#78350f; font-weight:700;">144</a>.
        </div>
      </div>
      <div class="hours-list reveal">
        <h3>Öffnungszeiten</h3>
        <ul>
          ${hours.map(h => `<li><span class="day">${escapeHtml(h.day)}</span><span class="${h.hours.toLowerCase().includes('geschlossen') || h.hours.toLowerCase().includes('ruhetag') ? 'closed' : 'hh'}">${escapeHtml(h.hours)}</span></li>`).join('')}
        </ul>
      </div>
    </div>
  </div>
</section>

<section id="ueber-uns" class="section">
  <div class="container">
    <div style="max-width: 760px; margin: 0 auto; text-align: center;" class="reveal">
      <span class="section-eyebrow">Über uns</span>
      <h2 class="section-title">Persönlich, gründlich, <em>vertrauensvoll</em>.</h2>
      <p class="section-lead">${escapeHtml(spec.about.body)}</p>
    </div>
  </div>
</section>

<section id="kontakt" class="section contact-section">
  <div class="container">
    <div class="section-head center reveal">
      <span class="section-eyebrow">Kontakt</span>
      <h2 class="section-title">Termin <em>vereinbaren</em>.</h2>
      <p class="section-lead">Terminanfrage per E-Mail oder Telefon — wir antworten in der Regel binnen 24 Stunden. Telefon ist montags bis freitags vormittags besetzt.</p>
    </div>
    <div class="contact-grid">
      ${phone ? `<div class="contact-card reveal">
        <div class="ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg></div>
        <div class="lbl">Telefon</div>
        <div class="val"><a href="tel:${phone.replace(/\s/g, '')}">${phone}</a></div>
      </div>` : ''}
      ${email ? `<div class="contact-card reveal">
        <div class="ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></div>
        <div class="lbl">E-Mail</div>
        <div class="val"><a href="mailto:${email}">${email}</a></div>
      </div>` : ''}
      ${address ? `<div class="contact-card reveal">
        <div class="ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></div>
        <div class="lbl">Anschrift</div>
        <div class="val">${address}</div>
      </div>` : ''}
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
