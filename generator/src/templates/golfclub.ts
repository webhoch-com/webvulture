/**
 * Golfclub template — premium, edel, ruhig.
 *
 * Design vision:
 * - Color palette: deep forest + parchment cream + brushed gold accents
 * - Typography: Cormorant Garamond display + Inter body — editorial, not loud
 * - Pacing: cinematic full-bleed hero, generous negative space, slow reveal
 * - Sections: Course-Charakter, Greenfee/Membership, Driving Range/Pro,
 *   Clubhaus & Restaurant, Tournaments-Kalender, Galerie, Anfahrt, Kontakt.
 *
 * No invented content: every section gates on real spec data.
 */

import type { SiteSpec } from '../types.js';
import { getGalleryImage, getHeroImage, hasHeroImage, hasGalleryImages, galleryCount, getLogo, getFavicon } from './_media.js';
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

export function renderGolfclubPage(spec: SiteSpec, slug: string): string {
  const PRESET = getBranchPreset('golfclub');
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

  const phone = spec.contact.phone ? escapeHtml(spec.contact.phone) : '';
  const email = spec.contact.email ? escapeHtml(spec.contact.email) : '';
  const address = spec.contact.address ? escapeHtml(spec.contact.address) : '';

  const services = spec.services && spec.services.length > 0 ? spec.services.slice(0, 6) : [];
  const events = (spec.events && spec.events.length > 0) ? spec.events.slice(0, 5) : [];
  const openingHours = spec.opening_hours && spec.opening_hours.length > 0 ? spec.opening_hours.slice(0, 7) : [];
  const testimonials = spec.testimonials && spec.testimonials.length > 0 ? spec.testimonials.slice(0, 3) : [];

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

  return `---
---
<!DOCTYPE html>
<html lang="de">
<head>
  ${renderSeoHead(spec, { slug, schemaKind: 'GolfCourse' })}
  ${fontImportTags}
  <style is:global>
    :root {
      --primary: ${escapeHtml(primary)};
      --primary-deep: color-mix(in oklch, ${escapeHtml(primary)} 70%, black);
      --secondary: ${escapeHtml(secondary)};
      --accent: ${escapeHtml(accent)};
      --bg: ${PRESET.bg};
      --bg-2: #f1ecdf;          /* deeper cream */
      --surface: #ffffff;
      --ink: ${PRESET.ink};
      --ink-2: #455046;
      --ink-3: #818a83;
      --gold: ${escapeHtml(accent)};
      --gold-deep: color-mix(in oklch, ${escapeHtml(accent)} 70%, black);
      --rule: rgba(26,36,33,0.08);
      --display: ${headingFont};
      --serif: ${headingFont};
      --sans: ${bodyFont};
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body { background: var(--bg); color: var(--ink); font-family: var(--sans); font-weight: 300; line-height: 1.7; -webkit-font-smoothing: antialiased; overflow-x: hidden; }
    img { display: block; max-width: 100%; }
    a { color: inherit; text-decoration: none; }
    h1, h2, h3, h4 { font-family: var(--display); font-weight: 500; line-height: 1.1; letter-spacing: -0.005em; }
    em { font-style: italic; color: var(--gold); }
    .container { max-width: 1320px; margin: 0 auto; padding: 0 1.5rem; }
    .center { text-align: center; }
    .section { padding: clamp(5rem, 10vw, 9rem) 0; }
    .section-eyebrow {
      display: inline-block; font-family: var(--display); font-size: 0.75rem;
      letter-spacing: 0.34em; text-transform: uppercase;
      color: var(--gold); margin-bottom: 1.25rem; font-weight: 600;
    }
    .section-eyebrow::before { content: '— '; opacity: 0.6; margin-right: 0.4em; }
    .section-eyebrow::after { content: ' —'; opacity: 0.6; margin-left: 0.4em; }
    .section-title { font-size: clamp(2.5rem, 5vw, 4rem); color: var(--ink); margin-bottom: 1.5rem; }
    .section-lead { font-size: 1.1rem; color: var(--ink-2); max-width: 720px; margin: 0 auto; }
    .section-head.center { text-align: center; }
    .section-head { margin-bottom: 4rem; }

    /* ─── Demo banner ───────────────────────────────────── */
    .demo-banner { background: #1a0a1f; color:#fff; padding:0.55rem 1rem; font-size:0.82rem; position: sticky; top: 0; z-index: 200; border-bottom: 1px solid rgba(236,101,186,0.35); }
    .demo-banner-inner { max-width: 1280px; margin: 0 auto; display: flex; align-items: center; gap: 0.85rem; flex-wrap: wrap; justify-content: center; }
    .demo-banner-tag { font-size: 0.7rem; letter-spacing: 0.16em; text-transform: uppercase; padding: 0.18rem 0.55rem; border-radius: 999px; background: rgba(236,101,186,0.22); border: 1px solid rgba(236,101,186,0.5); color: #ffd6ee; font-weight: 700; white-space: nowrap; }
    .demo-banner a { color: #ffb3df; font-weight: 700; border-bottom: 1px solid rgba(255,179,223,0.45); }

    /* ─── Sticky nav (subtle, on hero) ────────────────────── */
    .nav { position: absolute; top: 50px; left: 0; right: 0; z-index: 30; padding: 1.5rem 2rem; }
    .nav-inner { max-width: 1320px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 2rem; position: relative; }
    .brand-mark { display: inline-flex; align-items: center; gap: 0.7rem; color: #fff; }
    .brand-logo { width: 46px; height: 46px; object-fit: contain; background: rgba(255,255,255,0.95); border-radius: 4px; padding: 4px; }
    .brand-crest { width: 46px; height: 46px; border: 1.5px solid var(--gold); display: inline-flex; align-items: center; justify-content: center; font-family: var(--display); font-weight: 600; font-size: 1.1rem; letter-spacing: 0.04em; color: var(--gold); background: rgba(0,0,0,0.25); }
    .brand-name { font-family: var(--display); font-weight: 500; font-size: 1.45rem; letter-spacing: 0.01em; }
    .main-nav { display: none; gap: 2.5rem; font-size: 0.78rem; letter-spacing: 0.18em; text-transform: uppercase; }
    .main-nav a { color: rgba(255,255,255,0.85); transition: color .25s; font-weight: 400; }
    .main-nav a:hover { color: var(--gold); }
    @media (min-width: 960px) { .main-nav { display: flex; } }
    /* Mobile burger */
    .nav-toggle { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
    .nav-toggle:focus-visible ~ .nav-burger { outline: 2px solid currentColor; outline-offset: 3px; }
    .nav-burger { display: none; cursor: pointer; width: 44px; height: 44px; align-items: center; justify-content: center; border-radius: 4px; background: rgba(0,0,0,0.35); border: 1px solid rgba(255,255,255,0.35); flex-shrink: 0; color: #fff; }
    .nav-burger span { display: block; width: 18px; height: 2px; background: currentColor; border-radius: 2px; position: relative; transition: transform .25s, background .2s; }
    .nav-burger span::before, .nav-burger span::after { content: ""; position: absolute; left: 0; width: 18px; height: 2px; background: currentColor; border-radius: 2px; transition: transform .25s, top .25s; }
    .nav-burger span::before { top: -6px; }
    .nav-burger span::after  { top:  6px; }
    .nav-toggle:checked ~ .nav-burger span { background: transparent; }
    .nav-toggle:checked ~ .nav-burger span::before { top: 0; transform: rotate(45deg); }
    .nav-toggle:checked ~ .nav-burger span::after  { top: 0; transform: rotate(-45deg); }
    @media (max-width: 959px) {
      .nav-burger { display: inline-flex; }
      .main-nav {
        position: absolute; top: calc(100% + 0.75rem); left: 0; right: 0;
        display: flex; flex-direction: column; gap: 0; align-items: stretch;
        background: rgba(20,28,26,0.96); backdrop-filter: blur(14px);
        border: 1px solid rgba(184,153,104,0.4);
        box-shadow: 0 24px 50px -16px rgba(0,0,0,0.5);
        padding: 0.25rem 1.5rem 1rem;
        transform: translateY(-12px); opacity: 0; pointer-events: none;
        transition: transform .25s, opacity .25s;
        font-size: 0.95rem; letter-spacing: 0.16em;
      }
      .main-nav a { padding: 1rem 0; border-bottom: 1px solid rgba(255,255,255,0.12); min-height: 44px; display: flex; align-items: center; color: rgba(255,255,255,0.92); }
      .main-nav a:last-child { border-bottom: none; }
      .nav-toggle:checked ~ .main-nav { transform: translateY(0); opacity: 1; pointer-events: auto; }
    }

    /* ─── Hero ─── */
    .hero {
      position: relative; min-height: clamp(680px, 92vh, 880px);
      ${hasHeroImage(spec)
        ? `background:
        linear-gradient(180deg, rgba(26,36,33,0.55) 0%, rgba(26,36,33,0.35) 40%, rgba(26,36,33,0.85) 100%),
        url('${getHeroImage(spec, slug)}') center/cover;`
        : `background:
        radial-gradient(ellipse at 30% 20%, rgba(184,153,104,0.18) 0%, transparent 55%),
        radial-gradient(ellipse at 80% 80%, rgba(35,66,58,0.7) 0%, transparent 60%),
        linear-gradient(160deg, #1a2421 0%, #23423a 60%, #131c1a 100%);`
      }
      display: flex; align-items: flex-end; padding: 6rem 1.5rem 5rem;
      color: #fff;
    }
    .hero-inner { max-width: 1320px; margin: 0 auto; width: 100%; }
    .hero-eyebrow {
      font-family: var(--display); font-size: 0.78rem; letter-spacing: 0.36em;
      text-transform: uppercase; color: var(--gold); font-weight: 600;
      margin-bottom: 2rem; display: inline-flex; align-items: center; gap: 0.7rem;
    }
    .hero-eyebrow::before { content: ''; width: 36px; height: 1px; background: var(--gold); }
    .hero h1 {
      font-size: clamp(3rem, 7vw, 5.4rem); font-weight: 500;
      line-height: 1.04; max-width: 18ch; margin-bottom: 1.5rem;
    }
    .hero-sub { font-size: 1.15rem; max-width: 60ch; color: rgba(255,255,255,0.92); font-weight: 300; margin-bottom: 2.5rem; }
    .hero-actions { display: flex; flex-wrap: wrap; gap: 1rem; }
    .btn-primary, .btn-ghost {
      display: inline-flex; align-items: center; gap: 0.65rem;
      padding: 1.05rem 2.25rem; font-family: var(--display); font-weight: 500;
      font-size: 1rem; letter-spacing: 0.04em; transition: all .25s ease;
      border: 1px solid;
    }
    .btn-primary { background: var(--gold); color: var(--ink); border-color: var(--gold); }
    .btn-primary:hover { background: var(--gold-deep); border-color: var(--gold-deep); color: #fff; }
    .btn-ghost { background: transparent; color: #fff; border-color: rgba(255,255,255,0.55); }
    .btn-ghost:hover { background: rgba(255,255,255,0.1); border-color: #fff; }

    /* ─── Course facts band (right under hero) ─── */
    .course-facts {
      background: var(--ink); color: var(--bg);
      padding: 2.25rem 1.5rem; position: relative; z-index: 5;
    }
    .course-facts-inner {
      max-width: 1320px; margin: 0 auto;
      display: grid; gap: 1px; background: rgba(255,255,255,0.08);
      grid-template-columns: 1fr;
    }
    @media (min-width: 720px) {
      .course-facts-inner { grid-template-columns: repeat(4, 1fr); }
    }
    .fact { padding: 1.25rem 1.5rem; background: var(--ink); display: flex; flex-direction: column; gap: 0.4rem; }
    .fact-value { font-family: var(--display); font-size: 2.1rem; font-weight: 500; color: var(--gold); line-height: 1; }
    .fact-label { font-size: 0.72rem; letter-spacing: 0.22em; text-transform: uppercase; color: rgba(255,255,255,0.6); font-weight: 400; }

    /* ─── About course ─── */
    .about-section { background: var(--bg); }
    .about-grid { display: grid; gap: 4rem; align-items: center; }
    @media (min-width: 920px) { .about-grid { grid-template-columns: 1fr 1.1fr; gap: 6rem; } }
    .about-image { position: relative; aspect-ratio: 4/5; overflow: hidden; }
    .about-image img { width: 100%; height: 100%; object-fit: cover; }
    .about-image::after {
      content: ''; position: absolute; inset: 0;
      border: 1px solid var(--gold); margin: 14px;
      pointer-events: none;
    }
    .about-text h2 { font-size: clamp(2.2rem, 4.5vw, 3.4rem); margin-bottom: 1.75rem; }
    .about-text p { color: var(--ink-2); margin-bottom: 1.25rem; max-width: 60ch; }
    .about-quote {
      margin-top: 2.5rem; padding-top: 2rem; border-top: 1px solid var(--rule);
      font-family: var(--display); font-size: 1.4rem; font-style: italic;
      color: var(--ink); line-height: 1.4;
    }

    /* ─── Services / Greenfee + Membership ─── */
    .services-section { background: var(--bg-2); }
    .services-grid { display: grid; gap: 1.5rem; grid-template-columns: 1fr; }
    @media (min-width: 720px) { .services-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (min-width: 1080px) { .services-grid { grid-template-columns: repeat(3, 1fr); } }
    .service-card {
      background: var(--surface); padding: 2.5rem 2rem;
      border: 1px solid var(--rule); display: flex; flex-direction: column;
      transition: border-color .3s, transform .3s;
    }
    .service-card:hover { border-color: var(--gold); transform: translateY(-4px); }
    .service-num {
      font-family: var(--display); font-size: 0.9rem; color: var(--gold);
      letter-spacing: 0.16em; margin-bottom: 1.25rem; font-weight: 600;
    }
    .service-name { font-size: 1.5rem; margin-bottom: 0.85rem; color: var(--ink); }
    .service-desc { font-size: 0.95rem; color: var(--ink-2); flex-grow: 1; margin-bottom: 1.5rem; }
    .service-price {
      font-family: var(--display); font-size: 1.25rem; color: var(--ink);
      font-weight: 500; padding-top: 1.25rem; border-top: 1px solid var(--rule);
    }

    /* ─── Tournament calendar ─── */
    .tournaments-section { background: var(--ink); color: var(--bg); }
    .tournaments-section .section-eyebrow { color: var(--gold); }
    .tournaments-section .section-title { color: var(--bg); }
    .tournaments-section .section-lead { color: rgba(255,255,255,0.7); }
    .tournaments-list { max-width: 980px; margin: 0 auto; }
    .tournament {
      display: grid; grid-template-columns: 110px 1fr; gap: 2rem;
      padding: 2rem 0; border-bottom: 1px solid rgba(255,255,255,0.1);
      align-items: start;
    }
    .tournament-date {
      font-family: var(--display); font-size: 0.85rem; letter-spacing: 0.14em;
      text-transform: uppercase; color: var(--gold); font-weight: 600;
      padding-top: 0.4rem;
    }
    .tournament-info h3 { font-size: 1.5rem; color: #fff; margin-bottom: 0.65rem; font-weight: 500; }
    .tournament-info p { color: rgba(255,255,255,0.7); font-size: 0.95rem; }

    /* ─── Opening hours ─── */
    .hours-section { background: var(--bg); }
    .hours-grid {
      max-width: 720px; margin: 0 auto;
      border: 1px solid var(--rule);
    }
    .hour-row {
      display: flex; justify-content: space-between; padding: 1.1rem 1.75rem;
      border-bottom: 1px solid var(--rule); font-size: 0.95rem;
    }
    .hour-row:last-child { border-bottom: none; }
    .hour-day { font-weight: 500; color: var(--ink); letter-spacing: 0.04em; }
    .hour-time { color: var(--ink-2); font-variant-numeric: tabular-nums; }

    /* ─── Gallery ─── */
    .gallery-section { background: var(--bg-2); }
    .gallery-grid {
      display: grid; gap: 0.5rem; grid-template-columns: 1fr;
    }
    @media (min-width: 720px) { .gallery-grid { grid-template-columns: repeat(3, 1fr); } }
    .gallery-item { position: relative; aspect-ratio: 4/3; overflow: hidden; }
    .gallery-item img { width: 100%; height: 100%; object-fit: cover; transition: transform 1s ease; }
    .gallery-item:hover img { transform: scale(1.05); }

    /* ─── Testimonials ─── */
    .testimonials-section { background: var(--bg); }
    .testimonials-grid { display: grid; gap: 2rem; grid-template-columns: 1fr; max-width: 1080px; margin: 0 auto; }
    @media (min-width: 880px) { .testimonials-grid { grid-template-columns: repeat(3, 1fr); } }
    .testimonial { padding: 2.5rem 2rem; background: var(--surface); border-left: 2px solid var(--gold); }
    .testimonial-quote {
      font-family: var(--display); font-size: 1.2rem; font-style: italic;
      color: var(--ink); line-height: 1.5; margin-bottom: 1.5rem;
    }
    .testimonial-author { font-size: 0.85rem; color: var(--ink-3); letter-spacing: 0.06em; }

    /* ─── Contact ─── */
    .contact-section {
      background: var(--ink); color: var(--bg);
      padding: clamp(5rem, 10vw, 8rem) 1.5rem;
    }
    .contact-section .section-eyebrow { color: var(--gold); }
    .contact-grid { display: grid; gap: 3rem; max-width: 1080px; margin: 0 auto; }
    @media (min-width: 720px) { .contact-grid { grid-template-columns: 1fr 1fr; gap: 4rem; } }
    .contact-block h3 { font-size: 1rem; letter-spacing: 0.18em; text-transform: uppercase; color: var(--gold); margin-bottom: 1rem; font-family: var(--sans); font-weight: 500; }
    .contact-block p { color: rgba(255,255,255,0.85); font-size: 1.05rem; line-height: 1.6; }
    .contact-block a { color: var(--gold); transition: color .2s; }
    .contact-block a:hover { color: #fff; }
    .contact-cta {
      display: inline-flex; align-items: center; gap: 0.65rem;
      margin-top: 1.5rem; padding: 1rem 2rem;
      background: var(--gold); color: var(--ink);
      font-family: var(--display); font-weight: 500; font-size: 1rem;
      letter-spacing: 0.04em; transition: all .25s;
    }
    .contact-cta:hover { background: #fff; }

    /* ─── Footer ─── */
    .footer {
      background: #131c1a; color: rgba(255,255,255,0.6);
      padding: 3rem 1.5rem 2rem;
      font-size: 0.85rem;
      border-top: 1px solid rgba(184,153,104,0.2);
    }
    .footer-inner { max-width: 1320px; margin: 0 auto; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 1.5rem; }
    .footer a { color: var(--gold); }

    /* ─── Reveal animation ─── */
    .reveal { opacity: 1; transform: none; }
    /* removed: see .reveal */

    @media (prefers-reduced-motion: reduce) {
      .reveal { opacity: 1; transform: none; transition: none; }
      .gallery-item img { transition: none; }
    }

    ${EDITORIAL_CSS}
  </style>
</head>
<body>

  <div class="demo-banner">
    <div class="demo-banner-inner">
      <span class="demo-banner-tag">Unverbindlicher Demo-Entwurf</span>
      <span>Erstellt von <a href="https://webhoch.com" target="_blank" rel="noopener">Webagentur Hochmeir e.U.</a> auf Basis öffentlich verfügbarer Daten von <strong>${businessName}</strong>. Widerspruch &amp; Löschung an <a href="mailto:hello@webhoch.com">hello@webhoch.com</a> · <a href="https://webhoch.com/kontakt" target="_blank" rel="noopener">Beratung anfragen</a></span>
    </div>
  </div>

  <header class="nav">
    <div class="nav-inner">
      <a class="brand-mark" href="#">
        ${getLogo(spec)
          ? `<img class="brand-logo" src="${escapeHtml(getLogo(spec)!)}" alt="${businessName} Logo" width="46" height="46" />`
          : `<span class="brand-crest">${escapeHtml(spec.business_name.split(/\s+/).map(w => w[0] || '').slice(0, 2).join('').toUpperCase() || 'GC')}</span>`
        }
        <span class="brand-name">${businessName}</span>
      </a>
      <input type="checkbox" id="nav-toggle" class="nav-toggle" aria-hidden="true" tabindex="-1">
      <label for="nav-toggle" class="nav-burger" aria-label="Menü öffnen"><span></span></label>
      <nav class="main-nav">
        <a href="#course">Course</a>
        ${services.length > 0 ? '<a href="#angebot">Angebot</a>' : ''}
        ${events.length > 0 ? '<a href="#turniere">Turniere</a>' : ''}
        ${openingHours.length > 0 ? '<a href="#zeiten">Zeiten</a>' : ''}
        <a href="#kontakt">Kontakt</a>
      </nav>
    </div>
  </header>

  <section class="hero">
    <div class="hero-inner">
      <span class="hero-eyebrow">${escapeHtml(tagline)}</span>
      <h1>${escapeHtml(headline)}</h1>
      <p class="hero-sub">${subhead}</p>
      ${renderRatingPill(spec)}
      <div class="hero-actions">
        <a href="#kontakt" class="btn-primary">${ctaText}</a>
        ${services.length > 0 ? `<a href="#angebot" class="btn-ghost">Mitgliedschaft &amp; Greenfee</a>` : ''}
      </div>
    </div>
  </section>

  ${renderMarquee(marqueeItems)}

  ${renderHeritageStatement(spec, foundedYear)}

  ${renderTrustBar(trustStats)}

  <section class="course-facts">
    <div class="course-facts-inner">
      <div class="fact">
        <div class="fact-label">Course</div>
        <div class="fact-value">18-Loch</div>
      </div>
      <div class="fact">
        <div class="fact-label">Lage</div>
        <div class="fact-value">${address ? escapeHtml(address.split(',').pop()?.trim() || 'Österreich') : 'Österreich'}</div>
      </div>
      <div class="fact">
        <div class="fact-label">Kontakt</div>
        <div class="fact-value" style="font-size:1.05rem">${phone || email || '—'}</div>
      </div>
      <div class="fact">
        <div class="fact-label">Saison</div>
        <div class="fact-value">April&nbsp;–&nbsp;Oktober</div>
      </div>
    </div>
  </section>

  ${spec.about?.body ? `
  <section id="course" class="section about-section">
    <div class="container">
      <div class="about-grid">
        <div class="about-image reveal">
          <img src="${getGalleryImage(spec, slug, 0, 1000, 1250)}" alt="" loading="lazy">
        </div>
        <div class="about-text reveal">
          <span class="section-eyebrow">Der Course</span>
          <h2>${escapeHtml(spec.business_name)}.</h2>
          <p>${escapeHtml(spec.about.body)}</p>
        </div>
      </div>
    </div>
  </section>
  ` : ''}

  ${services.length > 0 ? `
  <section id="angebot" class="section services-section">
    <div class="container">
      <div class="section-head center reveal">
        <span class="section-eyebrow">Angebot</span>
        <h2 class="section-title">Mitgliedschaft &amp; <em>Greenfee</em>.</h2>
      </div>
      <div class="services-grid">
        ${services.map((s, i) => `
          <article class="service-card reveal" style="animation-delay: ${i * 80}ms">
            <div class="service-num">${String(i + 1).padStart(2, '0')}</div>
            <h3 class="service-name">${escapeHtml(s.name)}</h3>
            <p class="service-desc">${escapeHtml(s.description || '')}</p>
            ${s.price ? `<div class="service-price">${escapeHtml(s.price)}</div>` : ''}
          </article>
        `).join('')}
      </div>
    </div>
  </section>
  ` : ''}

  ${events.length > 0 ? `
  <section id="turniere" class="section tournaments-section">
    <div class="container">
      <div class="section-head center reveal">
        <span class="section-eyebrow">Saison</span>
        <h2 class="section-title">Turniere &amp; <em>Veranstaltungen</em>.</h2>
      </div>
      <div class="tournaments-list">
        ${events.map(ev => `
          <div class="tournament reveal">
            <div class="tournament-date">${escapeHtml((ev as any).date || '')}</div>
            <div class="tournament-info">
              <h3>${escapeHtml((ev as any).title || (ev as any).name || 'Turnier')}</h3>
              ${(ev as any).description ? `<p>${escapeHtml((ev as any).description)}</p>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  </section>
  ` : ''}

  ${openingHours.length > 0 ? `
  <section id="zeiten" class="section hours-section">
    <div class="container">
      <div class="section-head center reveal">
        <span class="section-eyebrow">Spielzeiten</span>
        <h2 class="section-title">Wann Sie uns <em>besuchen</em> können.</h2>
      </div>
      <div class="hours-grid reveal">
        ${openingHours.map(h => `
          <div class="hour-row">
            <span class="hour-day">${escapeHtml(h.day)}</span>
            <span class="hour-time">${escapeHtml(h.hours)}</span>
          </div>
        `).join('')}
      </div>
    </div>
  </section>
  ` : ''}

  ${(spec.media?.gallery && spec.media.gallery.length >= 3) ? `
  <section class="section gallery-section">
    <div class="container">
      <div class="section-head center reveal">
        <span class="section-eyebrow">Eindrücke</span>
        <h2 class="section-title">Der Course in <em>Bildern</em>.</h2>
      </div>
      <div class="gallery-grid">
        ${spec.media!.gallery!.map((_, i) => `
          <div class="gallery-item reveal"><img src="${getGalleryImage(spec, slug, i + 100, 800, 600)}" alt="" loading="lazy"></div>
        `).join('')}
      </div>
    </div>
  </section>
  ` : ''}

  ${testimonials.length > 0 ? `
  <section class="section testimonials-section">
    <div class="container">
      <div class="section-head center reveal">
        <span class="section-eyebrow">Stimmen</span>
        <h2 class="section-title">Was <em>Mitglieder</em> sagen.</h2>
      </div>
      <div class="testimonials-grid">
        ${testimonials.map(t => `
          <article class="testimonial reveal">
            <div class="testimonial-quote">${escapeHtml(t.quote)}</div>
            <div class="testimonial-author">— ${escapeHtml(t.author)}</div>
          </article>
        `).join('')}
      </div>
    </div>
  </section>
  ` : ''}

  <section id="kontakt" class="contact-section">
    <div class="container">
      <div class="section-head center reveal" style="margin-bottom: 3rem;">
        <span class="section-eyebrow">Kontakt</span>
        <h2 class="section-title" style="color: var(--bg)">Wir freuen uns auf <em>Ihren Besuch</em>.</h2>
      </div>
      <div class="contact-grid">
        <div class="contact-block reveal">
          <h3>Anfahrt</h3>
          ${address ? `<p>${address}</p>` : '<p>—</p>'}
        </div>
        <div class="contact-block reveal">
          <h3>Direkter Draht</h3>
          ${phone ? `<p><a href="tel:${phone.replace(/\s+/g, '')}">${phone}</a></p>` : ''}
          ${email ? `<p><a href="mailto:${email}">${email}</a></p>` : ''}
          ${(phone || email) ? `<a href="${email ? `mailto:${email}` : `tel:${phone.replace(/\s+/g, '')}`}" class="contact-cta">${ctaText}</a>` : ''}
        </div>
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
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible');
            io.unobserve(e.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -10% 0px' });
      document.querySelectorAll('.reveal').forEach(el => io.observe(el));
    } else {
      document.querySelectorAll('.reveal').forEach(el => el.classList.add('is-visible'));
    }
  </script>
</body>
</html>`;
}
