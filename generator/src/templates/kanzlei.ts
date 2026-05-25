/**
 * Kanzlei template — editorial, monochrome, trust-led.
 * Inspired by top-tier law firm sites (Freshfields / A&O / Wolf Theiss):
 * dark-navy on cream, restrained typography, narrow editorial columns,
 * single-column read-flow, no playful motion.
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
  EDITORIAL_CSS,
} from './_editorial.js';

import { avatarPlaceholder, SYMBOLIC_TAG_CSS } from './_avatar.js';

function lawyerPhoto(name: string): string {
  // Neutral initials silhouette — replaces real-person stock photos to avoid
  // implied impersonation in demos. Use Kanzlei navy as accent.
  return avatarPlaceholder(name, '#1e3a8a');
}

export function renderKanzleiPage(spec: SiteSpec, slug: string): string {
  const PRESET = getBranchPreset('kanzlei');
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

  const foundedYear = extractFoundedYear(spec);
  const marqueeItems = buildMarqueeItems(spec, foundedYear);
  const pullQuote = pickPullQuote(spec);

  const trustStats: Array<{ value: string; label: string }> = [];
  if (foundedYear) {
    const years = new Date().getFullYear() - foundedYear;
    if (years > 0) trustStats.push({ value: `${years}+`, label: 'Jahre Kanzleierfahrung' });
  }
  if (spec.business?.rating && spec.business?.review_count && spec.business.review_count >= 5) {
    trustStats.push({ value: `${spec.business.rating.toFixed(1).replace('.', ',')} ★`, label: `${spec.business.review_count} Mandanten-Bewertungen` });
  }

  // Curated practice areas — fall back to spec.services
  const practiceAreas = (spec.services?.length ?? 0) >= 3 ? spec.services : [
    { name: 'Wirtschaftsrecht', description: 'Vertragsgestaltung, M&A, Compliance, Gesellschaftsrecht — strategische Begleitung im Geschäftsalltag.' },
    { name: 'Arbeitsrecht', description: 'Anstellungsverträge, Kündigungsschutz, Reorganisationen — beratend und prozessführend für Arbeitgeber.' },
    { name: 'Vertragsrecht', description: 'Internationale Verträge, AGB-Prüfung, Streitbeilegung — präzise, durchsetzungsstark.' },
    { name: 'IT- &amp; Datenschutzrecht', description: 'DSGVO, IT-Verträge, Lizenzrecht — für digitale Geschäftsmodelle.' },
    { name: 'Immobilienrecht', description: 'Kauf, Bauvertrag, WEG-Recht — von der Beurkundung bis zur Streitbeilegung.' },
    { name: 'Erbrecht', description: 'Nachfolgeplanung, Testamente, Auseinandersetzung — diskret und vorausschauend.' },
  ];

  const lawyers = [
    { name: 'Dr. Franz Wagner, LL.M.', role: 'Geschäftsführender Partner', focus: 'Wirtschaftsrecht · M&A', seed: 'wagner' },
    { name: 'Mag. Maria Steiner', role: 'Partnerin', focus: 'Arbeitsrecht · Reorganisationen', seed: 'steiner' },
    { name: 'Dr. Andreas Lechner', role: 'Of Counsel', focus: 'IT- & Datenschutzrecht', seed: 'lechner' },
  ];

  const cases = [
    { type: 'M&A', title: 'Mittelständischer Maschinenbau-Verkauf', detail: 'Begleitung des Eigentümers beim Verkauf an einen internationalen Strategen — Volumen mittlerer zweistelliger Millionenbereich.' },
    { type: 'Arbeitsrecht', title: 'Konzernreorganisation', detail: 'Beratung eines österreichischen Marktführers bei einer betriebsbedingten Umstrukturierung mit 200+ Mitarbeitern.' },
    { type: 'Datenschutz', title: 'DSGVO-Compliance-Programm', detail: 'Aufbau einer konzernweiten DSGVO-Struktur inklusive DSFA, Auftragsverarbeiter-Management und Schulungen.' },
  ];

  const phone = spec.contact.phone ? escapeHtml(spec.contact.phone) : '';
  const email = spec.contact.email ? escapeHtml(spec.contact.email) : '';
  const address = spec.contact.address ? escapeHtml(spec.contact.address) : '';

  return `---
---
<!DOCTYPE html>
<html lang="de">
<head>
  ${renderSeoHead(spec, { slug, schemaKind: 'LegalService' })}
  ${fontImportTags}
  <style>
    :root {
      --ink: ${PRESET.ink};
      --ink-2: #3a4256;
      --ink-3: #6b7280;
      --paper: ${PRESET.bg};
      --paper-2: color-mix(in oklch, ${PRESET.bg} 60%, #ece8df);
      --bg: ${PRESET.bg};
      --primary: ${escapeHtml(primary)};
      --primary-deep: color-mix(in oklch, ${escapeHtml(primary)} 70%, black);
      --secondary: ${escapeHtml(secondary)};
      --accent: ${escapeHtml(accent)};
      --rule: rgba(15,23,41,0.14);
      --gold: ${escapeHtml(accent)};
      --display: ${headingFont};
      --serif: ${headingFont};
      --sans: ${bodyFont};
      --col: 720px;            /* editorial reading column */
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body { background: var(--paper); color: var(--ink); font-family: var(--sans); line-height: 1.65; -webkit-font-smoothing: antialiased; overflow-x: hidden; }
    img { display: block; max-width: 100%; }
    a { color: inherit; text-decoration: none; }

    /* ─── Demo banner ────────────────────────────────────── */
    .demo-banner {
      background: #0f0814; color:#fff; padding:0.55rem 1rem; font-size:0.82rem;
      position: relative; z-index: 200; border-bottom: 1px solid rgba(236,101,186,0.35);
    }
    .demo-banner-inner {
      max-width: 1280px; margin: 0 auto; display: flex; align-items: center; gap: 0.85rem;
      flex-wrap: wrap; justify-content: center;
    }
    .demo-banner-tag {
      font-size: 0.7rem; letter-spacing: 0.16em; text-transform: uppercase;
      padding: 0.18rem 0.55rem; border-radius: 999px;
      background: rgba(236,101,186,0.22); border: 1px solid rgba(236,101,186,0.5);
      color: #ffd6ee; font-weight: 700; white-space: nowrap;
    }
    .demo-banner a { color: #ffb3df; font-weight: 700; border-bottom: 1px solid rgba(255,179,223,0.45); }

    /* ─── Header ─────────────────────────────────────────── */
    .site-header { background: var(--paper); border-bottom: 1px solid var(--rule); position: relative; }
    .header-inner {
      max-width: 1280px; margin: 0 auto; padding: 1.6rem 1.5rem;
      display: flex; align-items: center; justify-content: space-between; gap: 2rem;
    }
    .brand-mark {
      font-family: var(--serif); font-weight: 600; font-size: 1.5rem;
      letter-spacing: 0.01em; color: var(--ink);
    }
    .brand-mark-amp { color: var(--gold); font-style: italic; padding: 0 0.15em; font-weight: 400; }
    .main-nav { display: none; gap: 2.25rem; font-size: 0.92rem; font-weight: 500; }
    .main-nav a { color: var(--ink-2); transition: color .2s; position: relative; padding-bottom: 2px; }
    .main-nav a:hover { color: var(--ink); }
    .main-nav a::after { content:''; position:absolute; bottom:0; left:0; right:0; height:1px; background:var(--ink); transform:scaleX(0); transform-origin:right; transition: transform .3s ease; }
    .main-nav a:hover::after { transform: scaleX(1); transform-origin: left; }
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
        background: var(--paper);
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
    .header-cta {
      border: 1px solid var(--ink); padding: 0.7rem 1.25rem;
      font-size: 0.85rem; font-weight: 500; letter-spacing: 0.02em;
      transition: background .2s, color .2s;
    }
    .header-cta:hover { background: var(--ink); color: var(--paper); }

    /* ─── Hero — editorial, no images ────────────────────── */
    .hero {
      padding: clamp(5rem, 10vw, 9rem) 1.5rem clamp(4rem, 8vw, 7rem);
      max-width: 1080px; margin: 0 auto;
    }
    .hero-eyebrow {
      font-size: 0.78rem; letter-spacing: 0.2em; text-transform: uppercase;
      color: var(--ink-3); font-weight: 500; margin-bottom: 2.5rem;
      display: flex; align-items: center; gap: 1rem;
    }
    .hero-eyebrow::before, .hero-eyebrow::after { content:''; height: 1px; background: var(--rule); flex: 1; }
    .hero h1 {
      font-family: var(--serif); font-weight: 500;
      font-size: clamp(2.5rem, 6vw, 4.5rem); line-height: 1.1; letter-spacing: -0.015em;
      max-width: 880px; margin: 0 auto;
      text-align: center;
    }
    .hero h1 em {
      font-style: italic; color: var(--gold); font-weight: 400;
    }
    .hero-sub {
      max-width: 600px; margin: 2rem auto 2.5rem;
      color: var(--ink-2); font-size: 1.1rem; line-height: 1.75; text-align: center;
    }
    .hero-ctas {
      display: flex; gap: 1.25rem; justify-content: center; flex-wrap: wrap;
    }
    .btn-solid {
      background: var(--ink); color: var(--paper);
      padding: 1rem 1.75rem; font-size: 0.9rem; font-weight: 500; letter-spacing: 0.02em;
      transition: background .2s;
    }
    .btn-solid:hover { background: #1d2949; }
    .btn-line {
      border: 1px solid var(--rule); padding: 1rem 1.75rem;
      font-size: 0.9rem; font-weight: 500; letter-spacing: 0.02em;
      transition: border-color .2s, color .2s;
    }
    .btn-line:hover { border-color: var(--ink); color: var(--ink); }

    /* ─── Trust strip ────────────────────────────────────── */
    .trust-strip {
      background: var(--ink); color: var(--paper-2); padding: 3rem 1.5rem;
    }
    .trust-strip-inner {
      max-width: 1100px; margin: 0 auto;
      display: grid; gap: 2rem; grid-template-columns: repeat(auto-fit, minmax(min(180px, 100%), 1fr));
      text-align: center;
    }
    .trust-item .num { font-family: var(--serif); font-weight: 500; font-size: 2.5rem; line-height: 1; color: #fff; margin-bottom: 0.25rem; }
    .trust-item .lbl { font-size: 0.78rem; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(247,245,240,0.6); }

    /* ─── Section base ───────────────────────────────────── */
    .section { padding: clamp(5rem, 9vw, 8rem) 1.5rem; }
    .container { max-width: 1100px; margin: 0 auto; }
    .col { max-width: var(--col); margin: 0 auto; }
    .section-header {
      margin-bottom: 4rem; max-width: var(--col);
    }
    .section-header.center { margin-left: auto; margin-right: auto; text-align: center; }
    .section-eyebrow {
      font-size: 0.75rem; letter-spacing: 0.2em; text-transform: uppercase;
      color: var(--gold); font-weight: 600; margin-bottom: 1.25rem;
    }
    .section-title {
      font-family: var(--serif); font-weight: 500;
      font-size: clamp(2rem, 4vw, 3rem); line-height: 1.15; letter-spacing: -0.015em;
      margin-bottom: 1.25rem;
    }
    .section-lead {
      color: var(--ink-2); font-size: 1.05rem; line-height: 1.75;
    }

    /* ─── Practice areas — editorial list, NOT cards ────── */
    .practice-list { border-top: 1px solid var(--rule); margin-top: 2rem; }
    .practice-item {
      display: grid; grid-template-columns: auto 1fr; gap: 2rem;
      padding: 2.25rem 0;
      border-bottom: 1px solid var(--rule);
      transition: padding-left .3s ease;
    }
    @media (min-width: 720px) {
      .practice-item { grid-template-columns: 0.6fr 1.4fr; gap: 4rem; }
      .practice-item:hover { padding-left: 0.5rem; }
    }
    .practice-num {
      font-family: var(--serif); font-style: italic; font-size: 1.6rem; color: var(--gold);
      font-weight: 400; min-width: 3ch;
    }
    .practice-name {
      font-family: var(--serif); font-weight: 500; font-size: clamp(1.25rem, 1.8vw, 1.5rem);
      line-height: 1.3; margin-bottom: 0.75rem;
    }
    .practice-desc { color: var(--ink-2); font-size: 1rem; line-height: 1.7; }

    /* ─── Lawyers — portrait grid ────────────────────────── */
    .lawyers-section { background: var(--paper-2); }
    .lawyers-grid {
      display: grid; gap: 2rem;
      grid-template-columns: repeat(auto-fit, minmax(min(260px, 100%), 1fr));
      max-width: 1100px; margin: 0 auto;
    }
    @media (min-width: 800px) {
      .lawyers-grid { grid-template-columns: repeat(3, 1fr); }
    }
    .lawyer-card { background: var(--paper); padding: 0; }
    .lawyer-photo {
      aspect-ratio: 4 / 5; background-size: cover; background-position: center top;
      filter: grayscale(0.5) contrast(1.05);
      transition: filter .5s;
    }
    .lawyer-card:hover .lawyer-photo { filter: grayscale(0) contrast(1.05); }
    .lawyer-info { padding: 1.5rem; }
    .lawyer-name { font-family: var(--serif); font-weight: 500; font-size: 1.3rem; line-height: 1.2; margin-bottom: 0.4rem; }
    .lawyer-role { font-size: 0.82rem; color: var(--gold); font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 0.6rem; }
    .lawyer-focus { font-size: 0.92rem; color: var(--ink-2); }
    ${SYMBOLIC_TAG_CSS}

    /* ─── Cases — narrative blocks ───────────────────────── */
    .cases-list { display: flex; flex-direction: column; gap: 3rem; max-width: var(--col); margin: 0 auto; }
    .case {
      padding-left: 1.5rem; border-left: 1px solid var(--gold);
    }
    .case-type {
      font-size: 0.72rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--gold);
      font-weight: 600; margin-bottom: 0.6rem;
    }
    .case-title {
      font-family: var(--serif); font-weight: 500; font-size: 1.5rem; line-height: 1.2; margin-bottom: 0.85rem;
    }
    .case-detail { color: var(--ink-2); font-size: 1rem; line-height: 1.75; }

    /* ─── Contact footer block ───────────────────────────── */
    .contact-section {
      background: var(--ink); color: var(--paper-2);
      padding: clamp(5rem, 9vw, 8rem) 1.5rem;
    }
    .contact-grid {
      max-width: 1100px; margin: 0 auto;
      display: grid; gap: 4rem;
    }
    @media (min-width: 880px) {
      .contact-grid { grid-template-columns: 1.2fr 1fr; gap: 6rem; }
    }
    .contact-section .section-eyebrow { color: var(--gold); }
    .contact-section h2 {
      font-family: var(--serif); font-weight: 500; color: #fff;
      font-size: clamp(2rem, 4vw, 3rem); line-height: 1.15; margin-bottom: 1.25rem;
    }
    .contact-section p { color: rgba(247,245,240,0.78); font-size: 1.05rem; line-height: 1.75; }
    .contact-fact {
      display: flex; gap: 0.85rem; padding: 1rem 0;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      align-items: flex-start;
    }
    .contact-fact:last-child { border-bottom: none; }
    .contact-fact svg { color: var(--gold); flex-shrink: 0; margin-top: 2px; }
    .contact-fact .lbl { display: block; font-size: 0.74rem; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(247,245,240,0.55); margin-bottom: 0.25rem; }
    .contact-fact .val { color: #fff; font-size: 1rem; }
    .contact-fact a { color: #fff; }
    .contact-fact a:hover { color: var(--gold); }

    /* ─── Footer ─────────────────────────────────────────── */
    footer { background: #08101e; color: rgba(247,245,240,0.55); padding: 2.5rem 1.5rem; text-align: center; font-size: 0.85rem; }
    footer .brand { font-family: var(--serif); font-size: 1.25rem; color: #fff; margin-bottom: 0.4rem; }
    footer .legal { display: flex; gap: 1.5rem; justify-content: center; margin-top: 1rem; flex-wrap: wrap; }
    footer .legal a:hover { color: var(--gold); }

    /* ─── Reveal ─────────────────────────────────────────── */
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

<header class="site-header">
  <div class="header-inner">
    <a class="brand-mark" href="#">${businessName.replace(/\s*&amp;\s*/g, '<span class="brand-mark-amp">&amp;</span>')}</a>
    <input type="checkbox" id="nav-toggle" class="nav-toggle" aria-label="Menü öffnen" />
    <label for="nav-toggle" class="nav-burger" aria-hidden="true"><span></span></label>
    <nav class="main-nav">
      <a href="#anwaelte">Team</a>
      <a href="#rechtsgebiete">Rechtsgebiete</a>
      <a href="#mandate">Mandate</a>
      <a href="#kontakt">Kontakt</a>
    </nav>
    <a href="#kontakt" class="header-cta">${ctaText}</a>
  </div>
</header>

<section class="hero">
  <div class="hero-eyebrow">${escapeHtml(tagline.slice(0, 70))}</div>
  <h1>${headline.replace(/(\.|\?|!)([^.?!]*)$/, '<em>$1$2</em>')}</h1>
  <p class="hero-sub">${subhead}</p>
  ${renderRatingPill(spec)}
  <div class="hero-ctas">
    <a href="#kontakt" class="btn-solid">${ctaText}</a>
    <a href="#rechtsgebiete" class="btn-line">Rechtsgebiete</a>
  </div>
</section>

${renderMarquee(marqueeItems)}

${trustStats.length >= 2 ? renderTrustBar(trustStats) : `
<section class="trust-strip">
  <div class="trust-strip-inner">
    <div class="trust-item"><div class="num">20+</div><div class="lbl">Jahre Erfahrung</div></div>
    <div class="trust-item"><div class="num">500+</div><div class="lbl">Mandate jährlich</div></div>
    <div class="trust-item"><div class="num">3</div><div class="lbl">Partner</div></div>
    <div class="trust-item"><div class="num">RAK</div><div class="lbl">Mitgliedschaften</div></div>
  </div>
</section>
`}

<section id="rechtsgebiete" class="section">
  <div class="container">
    <div class="section-header">
      <div class="section-eyebrow">Rechtsgebiete</div>
      <h2 class="section-title">Wir beraten dort, wo es zählt.</h2>
      <p class="section-lead">Sechs Schwerpunkte, eine Haltung: präzise, durchdacht, ohne Mandatshunger. Wenn ein Fall nicht zu uns passt, sagen wir das offen.</p>
    </div>
    <div class="practice-list">
      ${practiceAreas.map((p, i) => `
        <article class="practice-item reveal" style="transition-delay: ${i * 60}ms">
          <div class="practice-num">${String(i + 1).padStart(2, '0')}</div>
          <div>
            <h3 class="practice-name">${escapeHtml(p.name)}</h3>
            <p class="practice-desc">${escapeHtml(p.description)}</p>
          </div>
        </article>
      `).join('')}
    </div>
  </div>
</section>

<section id="anwaelte" class="section lawyers-section">
  <div class="container">
    <div class="section-header center">
      <div class="section-eyebrow">Team</div>
      <h2 class="section-title">Die Personen,<br>denen Sie vertrauen.</h2>
      <p class="section-lead">Drei Anwältinnen und Anwälte mit unterschiedlichen Schwerpunkten — und einem gemeinsamen Anspruch.</p>
    </div>
    <div class="lawyers-grid">
      ${lawyers.map((l, i) => `
        <article class="lawyer-card reveal" style="transition-delay: ${i * 80}ms">
          <div class="lawyer-photo avatar-symbolic-wrap" style="background-image: url('${lawyerPhoto(l.name)}');"><span class="avatar-symbolic-tag">Symbolfoto</span></div>
          <div class="lawyer-info">
            <div class="lawyer-name">${escapeHtml(l.name)}</div>
            <div class="lawyer-role">${escapeHtml(l.role)}</div>
            <div class="lawyer-focus">${escapeHtml(l.focus)}</div>
          </div>
        </article>
      `).join('')}
    </div>
  </div>
</section>

<section id="mandate" class="section">
  <div class="container">
    <div class="section-header">
      <div class="section-eyebrow">Repräsentative Mandate</div>
      <h2 class="section-title">Was wir bewegt haben.</h2>
      <p class="section-lead">Auszug aus jüngeren Mandaten — anonymisiert, aber sprechend für unsere Bandbreite.</p>
    </div>
    <div class="cases-list">
      ${cases.map((c, i) => `
        <article class="case reveal" style="transition-delay: ${i * 80}ms">
          <div class="case-type">${escapeHtml(c.type)}</div>
          <h3 class="case-title">${escapeHtml(c.title)}</h3>
          <p class="case-detail">${escapeHtml(c.detail)}</p>
        </article>
      `).join('')}
    </div>
  </div>
</section>

<section id="ueber-uns" class="section">
  <div class="container col">
    <div class="section-eyebrow">Über uns</div>
    <h2 class="section-title">Mandantennutzen vor Mandatszahl.</h2>
    <p class="section-lead">${escapeHtml(spec.about.body)}</p>
    <p class="section-lead" style="margin-top: 1.25rem;">Wir sind eine kleine Boutique-Kanzlei. Das ist kein Manko — es ist unsere Stärke. Sie erreichen uns persönlich, bekommen klare Antworten und keine Standard-Formulare.</p>
  </div>
</section>

<section id="kontakt" class="contact-section">
  <div class="contact-grid">
    <div class="reveal">
      <div class="section-eyebrow">Kontakt</div>
      <h2>Erstberatung — kostenfrei und unverbindlich.</h2>
      <p>30 Minuten. Sie schildern uns Ihren Fall, wir sagen offen, ob und wie wir helfen können. Keine versteckten Kosten, keine Verpflichtung.</p>
    </div>
    <div class="reveal">
      ${address ? `<div class="contact-fact">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        <div><span class="lbl">Anschrift</span><span class="val">${address}</span></div>
      </div>` : ''}
      ${phone ? `<div class="contact-fact">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
        <div><span class="lbl">Telefon</span><span class="val"><a href="tel:${phone.replace(/\s/g, '')}">${phone}</a></span></div>
      </div>` : ''}
      ${email ? `<div class="contact-fact">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
        <div><span class="lbl">E-Mail</span><span class="val"><a href="mailto:${email}?subject=Erstberatung">${email}</a></span></div>
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
<footer style="display:none">
  <div class="brand">${businessName}</div>
  <div>${tagline}</div>
  <div class="legal">
    <a href="/impressum">Impressum</a>
    <a href="/datenschutz">Datenschutz</a>
    ${email ? `<a href="mailto:${email}?subject=${encodeURIComponent('AGB-Anfrage')}">AGB anfragen</a>` : ''}
  </div>
</footer>

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
