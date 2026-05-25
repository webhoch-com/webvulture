/**
 * Friseur / Beauty / Wellness template — bold, modern, booking-led.
 * Big colour blocks, large display type, service-list with prices front-and-centre,
 * sticky booking CTA. Stylist team grid. Inspired by Treatwell / Booksy style.
 */

import type { SiteSpec } from '../types.js';
import { getGalleryImage, getHeroImage, hasHeroImage, hasGalleryImages, galleryCount } from './_media.js';
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

function salonPhoto(spec: SiteSpec, slug: string, idx: number, w = 1200, h = 800): string {
  return getGalleryImage(spec, slug, idx, w, h);
}

import { avatarPlaceholder, SYMBOLIC_TAG_CSS } from './_avatar.js';

function stylistAvatar(name: string): string {
  return avatarPlaceholder(name, '#ec4899');
}

export function renderFriseurPage(spec: SiteSpec, slug: string): string {
  const PRESET = getBranchPreset('friseur');
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
    if (years > 0) trustStats.push({ value: `Seit ${foundedYear}`, label: `${years} Jahre Salon` });
  }
  if (spec.business?.rating && spec.business?.review_count && spec.business.review_count >= 5) {
    trustStats.push({ value: `${spec.business.rating.toFixed(1).replace('.', ',')} ★`, label: `${spec.business.review_count} Kundenstimmen` });
  }

  const services = spec.services && spec.services.length >= 3 ? spec.services : [
    { name: 'Damenhaarschnitt', description: 'Beratung, Waschen, Schnitt, Föhnen', price: 'ab 49 €' },
    { name: 'Herrenhaarschnitt', description: 'Klassik bis Fade — präzise Schnitte', price: 'ab 32 €' },
    { name: 'Färben', description: 'Naturfarben, Strähnen, Balayage', price: 'ab 89 €' },
    { name: 'Hochsteckfrisur', description: 'Hochzeit, Ball, Festakt', price: 'ab 79 €' },
    { name: 'Pflegebehandlung', description: 'Olaplex, Keratin, Kopfhaut-Therapie', price: 'ab 39 €' },
    { name: 'Beratung', description: 'Typberatung, Stilberatung — 30 Minuten', price: 'gratis' },
  ];

  const stylists = [
    { name: 'Anna', role: 'Geschäftsführerin · Color-Expertin', focus: 'Balayage · Curly Hair' },
    { name: 'Lisa', role: 'Senior Stylist', focus: 'Bridal · Hochsteckfrisuren' },
    { name: 'Tom', role: 'Barber', focus: 'Herren · Bart' },
    { name: 'Mira', role: 'Junior Stylist', focus: 'Schneiden · Föhnen' },
  ];

  const phone = spec.contact.phone ? escapeHtml(spec.contact.phone) : '';
  const email = spec.contact.email ? escapeHtml(spec.contact.email) : '';
  const address = spec.contact.address ? escapeHtml(spec.contact.address) : '';

  return `---
---
<!DOCTYPE html>
<html lang="de">
<head>
  ${renderSeoHead(spec, { slug, schemaKind: 'BeautySalon' })}
  ${fontImportTags}
  <style>
    :root {
      --bg: ${PRESET.bg};
      --surface: #ffffff;
      --ink: ${PRESET.ink};
      --ink-2: #5b4046;
      --ink-3: #8a737a;
      --primary: ${escapeHtml(primary)};
      --primary-deep: color-mix(in oklch, ${escapeHtml(primary)} 70%, black);
      --primary-dark: color-mix(in oklch, ${escapeHtml(primary)} 70%, black);
      --secondary: ${escapeHtml(secondary)};
      --accent: ${escapeHtml(accent)};
      --rule: rgba(26,13,16,0.08);
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

    /* ─── Sticky header with prominent booking ──────────── */
    .nav {
      position: sticky; top: 0; z-index: 100;
      background: rgba(255, 245, 247, 0.92); backdrop-filter: blur(14px);
      border-bottom: 1px solid var(--rule);
    }
    .nav-inner {
      max-width: 1300px; margin: 0 auto; padding: 1rem 1.5rem;
      display: flex; align-items: center; justify-content: space-between; gap: 1.5rem;
    }
    .brand-mark {
      font-family: var(--display); font-size: 1.6rem; letter-spacing: 0.04em;
      text-transform: uppercase; line-height: 1;
    }
    .brand-mark span { color: var(--primary); }
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
        background: rgba(255, 245, 247, 0.97); backdrop-filter: blur(14px);
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
      background: var(--ink); color: #fff;
      padding: 0.85rem 1.5rem; border-radius: 999px;
      font-weight: 600; font-size: 0.9rem;
      transition: background .2s, transform .2s;
    }
    .nav-cta:hover { background: var(--primary); transform: translateY(-1px); }
    @media (max-width: 879px) { .nav-cta { display: none; } }

    /* ─── Hero — split colour block ──────────────────────── */
    .hero {
      display: grid; gap: 0;
      grid-template-columns: 1fr;
    }
    @media (min-width: 880px) {
      .hero { grid-template-columns: 1.1fr 1fr; min-height: 80vh; }
    }
    .hero-text {
      padding: clamp(3rem, 7vw, 6rem) clamp(1.5rem, 5vw, 4rem);
      display: flex; flex-direction: column; justify-content: center;
      background: var(--bg);
    }
    .hero-eyebrow {
      display: inline-flex; align-items: center; gap: 0.6rem;
      font-size: 0.78rem; letter-spacing: 0.18em; text-transform: uppercase;
      color: var(--primary); font-weight: 700; margin-bottom: 1.5rem;
    }
    .hero-eyebrow::before { content: ''; width: 24px; height: 2px; background: var(--primary); }
    .hero-text h1 {
      font-family: var(--display); font-weight: 400;
      font-size: clamp(3rem, 7vw, 6rem); line-height: 0.95; letter-spacing: -0.01em;
      text-transform: uppercase; max-width: 12ch;
    }
    .hero-text h1 em {
      font-style: normal;
      background: linear-gradient(135deg, var(--primary), var(--primary-dark));
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .hero-text p { color: var(--ink-2); font-size: 1.1rem; margin-top: 1.75rem; max-width: 480px; line-height: 1.7; }
    .hero-text .cta-row { display: flex; gap: 1rem; margin-top: 2.5rem; flex-wrap: wrap; }
    .btn-primary {
      background: var(--primary); color: #fff;
      padding: 1.05rem 1.85rem; border-radius: 999px;
      font-weight: 700; font-size: 0.95rem;
      transition: background .2s, transform .2s, box-shadow .2s;
      box-shadow: 0 8px 24px -8px var(--primary);
    }
    .btn-primary:hover { background: var(--primary-dark); transform: translateY(-2px); box-shadow: 0 14px 32px -8px var(--primary); }
    .btn-ghost {
      border: 2px solid var(--ink); padding: 0.95rem 1.85rem; border-radius: 999px;
      font-weight: 700; font-size: 0.95rem;
      transition: background .2s, color .2s;
    }
    .btn-ghost:hover { background: var(--ink); color: #fff; }

    .hero-image {
      background-image: url('${getHeroImage(spec, slug, 1200, 1400)}');
      background-size: cover; background-position: center;
      min-height: 50vh;
    }

    /* ─── Booking strip ──────────────────────────────────── */
    .booking-strip {
      background: var(--ink); color: #fff;
      padding: 2rem 1.5rem;
    }
    .booking-strip-inner {
      max-width: 1100px; margin: 0 auto;
      display: flex; align-items: center; justify-content: space-between; gap: 2rem; flex-wrap: wrap;
    }
    .booking-strip h3 { font-family: var(--display); font-size: 2rem; line-height: 1; text-transform: uppercase; letter-spacing: 0.02em; }
    .booking-strip p { color: rgba(255,255,255,0.8); margin-top: 0.5rem; }
    .booking-strip-cta {
      background: var(--primary); color: #fff;
      padding: 1.2rem 2.25rem; border-radius: 999px;
      font-weight: 700; font-size: 1rem;
      transition: transform .2s, background .2s;
    }
    .booking-strip-cta:hover { background: #fff; color: var(--primary-dark); transform: translateY(-2px); }

    /* ─── Services / price list ─────────────────────────── */
    .services { padding: clamp(5rem, 9vw, 8rem) 1.5rem; }
    .services-inner { max-width: 1100px; margin: 0 auto; }
    .section-eyebrow { display: inline-block; font-size: 0.78rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--primary); font-weight: 700; margin-bottom: 1rem; }
    .section-title { font-family: var(--display); font-weight: 400; font-size: clamp(2.5rem, 5vw, 4.25rem); line-height: 1; letter-spacing: -0.005em; text-transform: uppercase; margin-bottom: 1rem; }
    .section-title em { font-style: normal; color: var(--primary); }
    .section-lead { color: var(--ink-2); font-size: 1.05rem; max-width: 560px; line-height: 1.7; margin-bottom: 4rem; }

    .price-list { background: var(--surface); border-radius: 24px; padding: clamp(2rem, 4vw, 3rem); box-shadow: 0 24px 60px -28px rgba(190, 24, 93, 0.18); }
    .price-row {
      display: grid; grid-template-columns: 1fr auto; gap: 1rem;
      padding: 1.5rem 0; border-bottom: 1px dashed var(--rule);
      align-items: baseline;
    }
    .price-row:last-child { border-bottom: none; }
    .price-name { font-family: var(--display); font-size: 1.4rem; line-height: 1.3; letter-spacing: 0.02em; text-transform: uppercase; color: var(--ink); }
    .price-amount {
      font-family: var(--display); font-size: 1.5rem;
      color: var(--primary); white-space: nowrap; letter-spacing: 0.02em;
    }
    .price-desc { grid-column: 1 / -1; color: var(--ink-2); font-size: 0.95rem; line-height: 1.6; margin-top: 0.5rem; }

    /* ─── Stylist team ──────────────────────────────────── */
    .team { background: var(--accent); padding: clamp(5rem, 9vw, 8rem) 1.5rem; }
    .team-inner { max-width: 1300px; margin: 0 auto; }
    .team-head { text-align: center; margin-bottom: 4rem; }
    .team-head .section-lead { margin-inline: auto; }
    .team-grid {
      display: grid; gap: 1.5rem;
      grid-template-columns: repeat(auto-fit, minmax(min(220px, 100%), 1fr));
    }
    @media (min-width: 880px) {
      .team-grid { grid-template-columns: repeat(4, 1fr); }
    }
    .stylist {
      background: var(--surface); border-radius: 18px; overflow: hidden;
      transition: transform .35s ease, box-shadow .35s ease;
    }
    .stylist:hover { transform: translateY(-6px); box-shadow: 0 18px 40px -16px rgba(190, 24, 93, 0.25); }
    .stylist-photo { aspect-ratio: 4/5; background-size: cover; background-position: center top; }
    ${SYMBOLIC_TAG_CSS}
    .stylist-info { padding: 1.5rem 1.25rem 1.75rem; }
    .stylist-name { font-family: var(--display); font-size: 1.85rem; line-height: 1; letter-spacing: 0.02em; text-transform: uppercase; }
    .stylist-role { color: var(--primary); font-size: 0.82rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; margin: 0.5rem 0 0.4rem; }
    .stylist-focus { color: var(--ink-2); font-size: 0.92rem; }

    /* ─── Gallery (small, cropped) ───────────────────────── */
    .gallery { padding: clamp(5rem, 9vw, 8rem) 1.5rem; }
    .gallery-inner { max-width: 1300px; margin: 0 auto; }
    .gallery-head { text-align: center; margin-bottom: 4rem; }
    .gallery-grid { display: grid; gap: 1rem; grid-template-columns: repeat(2, 1fr); }
    @media (min-width: 700px) { .gallery-grid { grid-template-columns: repeat(3, 1fr); } }
    .gallery-img {
      aspect-ratio: 1/1; overflow: hidden; border-radius: 14px;
      transition: transform .35s ease;
    }
    .gallery-img img { width: 100%; height: 100%; object-fit: cover; transition: transform 1s ease; }
    .gallery-img:hover { transform: scale(1.02); }
    .gallery-img:hover img { transform: scale(1.08); }

    /* ─── Final CTA ──────────────────────────────────────── */
    .cta-final {
      padding: clamp(5rem, 9vw, 8rem) 1.5rem; text-align: center;
      background: linear-gradient(135deg, var(--primary), var(--primary-dark));
      color: #fff;
    }
    .cta-final h2 { font-family: var(--display); font-size: clamp(2.5rem, 5vw, 4.5rem); line-height: 1; letter-spacing: 0.01em; text-transform: uppercase; margin-bottom: 1rem; }
    .cta-final p { font-size: 1.1rem; max-width: 540px; margin: 0 auto 2.5rem; opacity: 0.92; line-height: 1.7; }
    .cta-final .btn-white { background: #fff; color: var(--primary-dark); padding: 1.15rem 2.25rem; border-radius: 999px; font-weight: 700; font-size: 1rem; }
    .cta-final .btn-white:hover { background: var(--ink); color: #fff; }
    .cta-info { display: flex; justify-content: center; gap: 2rem; margin-top: 2rem; font-size: 0.95rem; flex-wrap: wrap; opacity: 0.9; }
    .cta-info a { color: #fff; border-bottom: 1px solid rgba(255,255,255,0.4); padding-bottom: 1px; }

    /* ─── Footer ────────────────────────────────────────── */
    footer { background: var(--ink); color: rgba(255,255,255,0.55); padding: 3rem 1.5rem; text-align: center; font-size: 0.85rem; }
    footer .brand { font-family: var(--display); font-size: 1.5rem; color: #fff; margin-bottom: 0.5rem; letter-spacing: 0.04em; text-transform: uppercase; }
    footer .legal { display: flex; gap: 1.5rem; justify-content: center; margin-top: 1rem; flex-wrap: wrap; }
    footer .legal a:hover { color: var(--primary); }

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
    <a class="brand-mark" href="#">${businessName.replace(/\s+/, '<span> </span>')}</a>
    <input type="checkbox" id="nav-toggle" class="nav-toggle" aria-label="Menü öffnen" />
    <label for="nav-toggle" class="nav-burger" aria-hidden="true"><span></span></label>
    <nav class="main-nav">
      <a href="#preise">Leistungen &amp; Preise</a>
      <a href="#team">Team</a>
      <a href="#galerie">Galerie</a>
      <a href="#kontakt">Kontakt</a>
    </nav>
    <a href="#kontakt" class="nav-cta">${ctaText}</a>
  </div>
</header>

<section class="hero">
  <div class="hero-text">
    <span class="hero-eyebrow">${escapeHtml(tagline.slice(0, 60))}</span>
    <h1>${escapeHtml(headline.replace(/\.([^.]*)$/, '.$1')).replace(/(\S+)\.\s*$/, '<em>$1.</em>')}</h1>
    <p>${subhead}</p>
    ${renderRatingPill(spec)}
    <div class="cta-row">
      <a href="#kontakt" class="btn-primary">${ctaText} →</a>
      <a href="#preise" class="btn-ghost">Leistungen ansehen</a>
    </div>
  </div>
  ${hasHero
    ? `<div class="hero-image" style="background-image: url('${escapeHtml(heroImage)}'); background-size: cover; background-position: center;" aria-hidden="true"></div>`
    : `<div class="hero-image" aria-hidden="true" style="background: linear-gradient(135deg, var(--primary), var(--accent)); display: grid; place-items: center;"><span style="font-family: var(--display); font-size: clamp(4rem, 12vw, 11rem); line-height: 0.9; color: rgba(255,255,255,0.18); letter-spacing: -0.04em; padding: 1rem; text-align: center;">${businessName}</span></div>`
  }
</section>

${renderMarquee(marqueeItems)}

${renderTrustBar(trustStats)}

<section class="booking-strip">
  <div class="booking-strip-inner">
    <div>
      <h3>Online buchen</h3>
      <p>Termin per Anruf oder WhatsApp anfragen — wir melden uns mit dem nächsten freien Slot.</p>
    </div>
    <a href="#kontakt" class="booking-strip-cta">Jetzt Termin wählen →</a>
  </div>
</section>

<section id="preise" class="services">
  <div class="services-inner">
    <span class="section-eyebrow">Leistungen &amp; Preise</span>
    <h2 class="section-title">Klare <em>Preise</em>.<br>Keine Überraschungen.</h2>
    <p class="section-lead">Beratung gehört bei uns immer dazu. Sie wissen vorher, was kommt — und was es kostet.</p>

    <div class="price-list reveal">
      ${services.map(s => `
        <div class="price-row">
          <div class="price-name">${escapeHtml(s.name)}</div>
          <div class="price-amount">${escapeHtml(s.price ?? '')}</div>
          ${s.description ? `<div class="price-desc">${escapeHtml(s.description)}</div>` : ''}
        </div>
      `).join('')}
    </div>
  </div>
</section>

<section id="team" class="team">
  <div class="team-inner">
    <div class="team-head">
      <span class="section-eyebrow">Team</span>
      <h2 class="section-title">Die <em>Hände</em>,<br>denen Sie vertrauen.</h2>
      <p class="section-lead">Vier Stylist:innen, vier Spezialgebiete — jede:r mit eigener Handschrift.</p>
    </div>
    <div class="team-grid">
      ${stylists.map((s, i) => `
        <article class="stylist reveal">
          <div class="stylist-photo avatar-symbolic-wrap" style="background-image: url('${stylistAvatar(s.name)}');"><span class="avatar-symbolic-tag">Symbolfoto</span></div>
          <div class="stylist-info">
            <div class="stylist-name">${escapeHtml(s.name)}</div>
            <div class="stylist-role">${escapeHtml(s.role)}</div>
            <div class="stylist-focus">${escapeHtml(s.focus)}</div>
          </div>
        </article>
      `).join('')}
    </div>
  </div>
</section>

${renderPullQuote(pullQuote, spec.business_name)}

${hasGallery && galleryCount(spec) >= 1 ? `
<section id="galerie" class="gallery">
  <div class="gallery-inner">
    <div class="gallery-head">
      <span class="section-eyebrow">Inspiration</span>
      <h2 class="section-title"><em>Eindrücke</em> aus dem Salon.</h2>
    </div>
    <div class="gallery-grid">
      ${[1,2,3,4,5,6].slice(0, Math.min(galleryCount(spec), 6)).map(i => `
        <div class="gallery-img reveal"><img src="${salonPhoto(spec, slug, i, 600, 600)}" alt="" loading="lazy"></div>
      `).join('')}
    </div>
  </div>
</section>
` : ''}

<section id="kontakt" class="cta-final">
  <h2>Termin <em>buchen</em>.</h2>
  <p>Online, telefonisch oder spontan vorbei. Wir freuen uns auf Sie.</p>
  ${email ? `<a href="mailto:${email}?subject=${encodeURIComponent('Terminanfrage')}" class="btn-white">Anfrage senden</a>` : ''}
  <div class="cta-info">
    ${phone ? `<a href="tel:${phone.replace(/\s/g, '')}">${phone}</a>` : ''}
    ${email ? `<a href="mailto:${email}">${email}</a>` : ''}
    ${address ? `<span>${address}</span>` : ''}
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
