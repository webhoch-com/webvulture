/**
 * Handwerk template — robust, trust-led, before/after-focused.
 * Burnt-orange & charcoal palette, condensed bold display, Notdienst-CTA prominent,
 * before/after slider section, master-craftsman seal, transparent fixed-price emphasis.
 */

import type { SiteSpec } from '../types.js';

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function projectPhoto(slug: string, idx: number, w = 800, h = 600): string {
  return `https://picsum.photos/seed/${encodeURIComponent(slug)}-job-${idx}/${w}/${h}`;
}

export function renderHandwerkPage(spec: SiteSpec, slug: string): string {
  const businessName = escapeHtml(spec.business_name);
  const tagline = spec.tagline;
  const headline = spec.hero.headline;
  const subhead = escapeHtml(spec.hero.subheadline);
  const ctaText = escapeHtml(spec.hero.cta_text || 'Festpreis-Angebot anfragen');

  const services = spec.services && spec.services.length >= 3 ? spec.services : [
    { name: 'Innenanstrich', description: 'Wohnräume, Büros, Praxen — sauber, auf Termin.' },
    { name: 'Fassade & Außen', description: 'Wetterfeste Beschichtungen, Dachanstrich.' },
    { name: 'Tapezier-/Spachtelarbeiten', description: 'Klassisch bis modernste Glättetechniken.' },
    { name: 'Bodenbeläge', description: 'Vinyl, Laminat, Designboden mit Garantie.' },
    { name: 'Renovierung', description: 'Alles aus einer Hand — von der Idee zum Schlüssel.' },
    { name: '24-h-Notdienst', description: 'Wasserschaden, Schimmel — wir kommen schnell.' },
  ];

  const phone = spec.contact.phone ? escapeHtml(spec.contact.phone) : '';
  const email = spec.contact.email ? escapeHtml(spec.contact.email) : '';
  const address = spec.contact.address ? escapeHtml(spec.contact.address) : '';

  return `---
const spec = ${JSON.stringify(spec, null, 2)};
---
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${businessName} — ${escapeHtml(tagline)}</title>
  <meta name="description" content="${escapeHtml(tagline)}" />
  <meta name="robots" content="noindex, nofollow" />
  <meta name="theme-color" content="#c2410c" />
  <link rel="preconnect" href="https://fonts.bunny.net" crossorigin>
  <link href="https://fonts.bunny.net/css?family=oswald:400,500,600,700|inter:400,500,600,700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #f5f2ee;          /* warm light grey */
      --surface: #ffffff;
      --primary: #c2410c;     /* burnt orange */
      --primary-dark: #9a3412;
      --ink: #1c1917;         /* near-black warm */
      --ink-2: #44403c;
      --ink-3: #78716c;
      --rule: rgba(28,25,23,0.10);
      --signal: #facc15;      /* yellow accent for emergency */
      --display: 'Oswald', 'Impact', sans-serif;
      --sans: 'Inter', system-ui, sans-serif;
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

    /* ─── Notdienst-Strip (top) ─────────────────────────── */
    .notdienst {
      background: var(--ink); color: #fff;
      padding: 0.6rem 1.5rem; font-size: 0.88rem;
    }
    .notdienst-inner {
      max-width: 1300px; margin: 0 auto;
      display: flex; gap: 1.5rem; justify-content: center; align-items: center; flex-wrap: wrap;
    }
    .notdienst .pulse {
      display: inline-block; width: 0.55rem; height: 0.55rem; border-radius: 50%;
      background: var(--signal); box-shadow: 0 0 0 0 var(--signal);
      animation: pulse 1.6s ease-in-out infinite;
    }
    @keyframes pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(250,204,21,0.7); } 50% { box-shadow: 0 0 0 8px rgba(250,204,21,0); } }
    .notdienst strong { color: var(--signal); letter-spacing: 0.04em; text-transform: uppercase; font-size: 0.78rem; }
    .notdienst a { color: #fff; font-weight: 700; border-bottom: 1px dotted rgba(255,255,255,0.5); padding-bottom: 1px; }

    /* ─── Header ─────────────────────────────────────────── */
    .nav {
      background: var(--bg); border-bottom: 1px solid var(--rule);
      position: sticky; top: 0; z-index: 50;
    }
    .nav-inner {
      max-width: 1300px; margin: 0 auto; padding: 1rem 1.5rem;
      display: flex; align-items: center; justify-content: space-between; gap: 1.5rem;
    }
    .brand-mark {
      font-family: var(--display); font-weight: 700; font-size: 1.6rem;
      letter-spacing: 0.02em; text-transform: uppercase; line-height: 1;
    }
    .brand-mark span { color: var(--primary); }
    .main-nav { display: none; gap: 2rem; font-size: 0.9rem; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; }
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
    .nav-cta {
      background: var(--primary); color: #fff;
      padding: 0.85rem 1.5rem;
      font-weight: 700; font-size: 0.85rem; letter-spacing: 0.04em; text-transform: uppercase;
      transition: background .2s, transform .2s;
    }
    .nav-cta:hover { background: var(--primary-dark); transform: translateY(-1px); }

    /* ─── Hero — split with photo and info-blocks ──────── */
    .hero {
      display: grid; gap: 0;
      grid-template-columns: 1fr;
    }
    @media (min-width: 880px) { .hero { grid-template-columns: 1.05fr 1fr; min-height: 78vh; } }
    .hero-text {
      padding: clamp(3rem, 7vw, 6rem) clamp(1.5rem, 5vw, 4rem);
      display: flex; flex-direction: column; justify-content: center;
    }
    .hero-eyebrow {
      display: inline-flex; align-items: center; gap: 0.55rem;
      font-size: 0.78rem; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase;
      color: var(--primary); margin-bottom: 1.5rem;
    }
    .hero-eyebrow::before { content: ''; width: 32px; height: 2px; background: var(--primary); }
    .hero h1 {
      font-family: var(--display); font-weight: 700;
      font-size: clamp(2.75rem, 7vw, 5.5rem); line-height: 0.95; letter-spacing: -0.005em;
      text-transform: uppercase; max-width: 14ch;
    }
    .hero h1 em {
      font-style: normal; color: var(--primary);
    }
    .hero p { color: var(--ink-2); font-size: 1.1rem; margin-top: 1.75rem; max-width: 480px; line-height: 1.65; }
    .hero-trust { display: flex; gap: 2rem; margin-top: 2rem; flex-wrap: wrap; }
    .hero-trust-item { display: flex; align-items: center; gap: 0.55rem; font-size: 0.92rem; font-weight: 600; }
    .hero-trust-item svg { color: var(--primary); flex-shrink: 0; }
    .hero-cta-row { display: flex; gap: 1rem; margin-top: 2.25rem; flex-wrap: wrap; }
    .btn-primary {
      background: var(--ink); color: #fff;
      padding: 1.05rem 1.85rem;
      font-weight: 700; font-size: 0.9rem; letter-spacing: 0.06em; text-transform: uppercase;
      transition: background .2s, transform .2s, box-shadow .2s;
    }
    .btn-primary:hover { background: var(--primary); transform: translateY(-2px); box-shadow: 0 14px 30px -10px rgba(194, 65, 12, 0.4); }
    .btn-line {
      background: transparent; color: var(--ink); border: 2px solid var(--ink);
      padding: 0.95rem 1.85rem;
      font-weight: 700; font-size: 0.9rem; letter-spacing: 0.06em; text-transform: uppercase;
      transition: background .2s, color .2s;
    }
    .btn-line:hover { background: var(--ink); color: #fff; }

    .hero-image {
      background-image: url('${projectPhoto(slug, 0, 1200, 1400)}');
      background-size: cover; background-position: center;
      min-height: 50vh;
      position: relative;
    }
    .hero-image::after {
      content: 'Meisterbetrieb seit 1987';
      position: absolute; bottom: 2rem; right: 2rem;
      background: var(--surface); color: var(--ink);
      padding: 0.85rem 1.25rem;
      font-family: var(--display); font-size: 0.92rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase;
      border-left: 4px solid var(--primary);
      box-shadow: 0 12px 30px -10px rgba(0,0,0,0.3);
    }

    /* ─── Promise strip ──────────────────────────────────── */
    .promise {
      background: var(--ink); color: #fff;
      padding: 1.5rem;
    }
    .promise-inner {
      max-width: 1300px; margin: 0 auto;
      display: grid; gap: 1rem;
      grid-template-columns: repeat(auto-fit, minmax(min(220px, 100%), 1fr));
    }
    .promise-item {
      display: flex; gap: 0.85rem; align-items: center;
      font-size: 0.95rem;
      padding: 0.5rem 1rem;
    }
    .promise-item svg { color: var(--signal); flex-shrink: 0; }
    .promise-item strong { color: #fff; font-family: var(--display); text-transform: uppercase; letter-spacing: 0.04em; font-weight: 600; }

    /* ─── Section base ───────────────────────────────────── */
    .section { padding: clamp(5rem, 9vw, 8rem) 1.5rem; }
    .container { max-width: 1300px; margin: 0 auto; }
    .section-eyebrow { display: inline-block; font-size: 0.78rem; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: var(--primary); margin-bottom: 1rem; }
    .section-title { font-family: var(--display); font-weight: 700; font-size: clamp(2.25rem, 5vw, 4rem); line-height: 1; letter-spacing: 0; text-transform: uppercase; margin-bottom: 1.25rem; }
    .section-title em { font-style: normal; color: var(--primary); }
    .section-lead { color: var(--ink-2); font-size: 1.05rem; line-height: 1.7; max-width: 600px; }
    .section-head.center { text-align: center; }
    .section-head.center .section-lead { margin-inline: auto; }

    /* ─── Services ───────────────────────────────────────── */
    .services-grid {
      display: grid; gap: 1.25rem;
      grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr));
      margin-top: 3rem;
    }
    @media (min-width: 880px) { .services-grid { grid-template-columns: repeat(3, 1fr); } }
    .service-card {
      background: var(--surface);
      padding: 2.25rem 1.75rem;
      border-top: 4px solid var(--primary);
      transition: transform .25s ease, box-shadow .25s ease;
      position: relative;
    }
    .service-card:hover { transform: translateY(-4px); box-shadow: 0 14px 30px -10px rgba(0,0,0,0.15); }
    .service-num { font-family: var(--display); font-weight: 700; font-size: 0.85rem; color: var(--ink-3); margin-bottom: 1rem; letter-spacing: 0.1em; }
    .service-card h3 { font-family: var(--display); font-weight: 600; font-size: 1.4rem; line-height: 1.2; text-transform: uppercase; letter-spacing: 0.02em; margin-bottom: 0.75rem; }
    .service-card p { color: var(--ink-2); font-size: 0.95rem; line-height: 1.6; }

    /* ─── Before/After grid ─────────────────────────────── */
    .ba-section { background: var(--ink); color: #fff; }
    .ba-section .section-eyebrow { color: var(--signal); }
    .ba-section .section-title { color: #fff; }
    .ba-section .section-lead { color: rgba(255,255,255,0.78); }
    .ba-grid {
      display: grid; gap: 0.75rem;
      grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr));
      margin-top: 3rem;
    }
    @media (min-width: 700px) { .ba-grid { grid-template-columns: repeat(3, 1fr); } }
    .ba-pair {
      position: relative; aspect-ratio: 4/3; overflow: hidden;
      background-size: cover; background-position: center;
    }
    .ba-pair img { width: 100%; height: 100%; object-fit: cover; }
    .ba-tag {
      position: absolute; top: 1rem; left: 1rem;
      background: var(--primary); color: #fff;
      padding: 0.35rem 0.85rem;
      font-family: var(--display); font-size: 0.78rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase;
    }

    /* ─── Process — 4 boxed steps ───────────────────────── */
    .process-grid {
      display: grid; gap: 1.25rem; margin-top: 3rem;
      grid-template-columns: repeat(auto-fit, minmax(min(220px, 100%), 1fr));
    }
    @media (min-width: 880px) { .process-grid { grid-template-columns: repeat(4, 1fr); } }
    .process-step {
      background: var(--surface); padding: 2rem 1.5rem;
      border-left: 4px solid var(--primary);
      position: relative;
    }
    .process-step .num { font-family: var(--display); font-size: 3rem; line-height: 1; color: var(--primary); font-weight: 700; margin-bottom: 1rem; }
    .process-step h4 { font-family: var(--display); font-size: 1.2rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.02em; margin-bottom: 0.6rem; }
    .process-step p { color: var(--ink-2); font-size: 0.92rem; line-height: 1.6; }

    /* ─── CTA ────────────────────────────────────────────── */
    .cta-section {
      background-image: linear-gradient(rgba(28,25,23,0.85), rgba(28,25,23,0.92)), url('${projectPhoto(slug, 90, 1800, 1200)}');
      background-size: cover; background-position: center;
      color: #fff; padding: clamp(5rem, 9vw, 9rem) 1.5rem; text-align: center;
    }
    .cta-section h2 { font-family: var(--display); font-size: clamp(2.25rem, 5vw, 4rem); line-height: 1; letter-spacing: 0; text-transform: uppercase; max-width: 18ch; margin: 0 auto 1.5rem; }
    .cta-section h2 em { font-style: normal; color: var(--primary); }
    .cta-section p { color: rgba(255,255,255,0.85); max-width: 560px; margin: 0 auto 2.5rem; line-height: 1.7; font-size: 1.1rem; }
    .cta-section .btn-orange {
      background: var(--primary); color: #fff;
      padding: 1.2rem 2.5rem; font-weight: 700; font-size: 0.95rem; letter-spacing: 0.06em; text-transform: uppercase;
      transition: background .2s, transform .2s;
    }
    .cta-section .btn-orange:hover { background: var(--primary-dark); transform: translateY(-2px); }
    .cta-info { display: flex; gap: 2rem; justify-content: center; margin-top: 2rem; flex-wrap: wrap; font-size: 0.95rem; }
    .cta-info a { color: #fff; border-bottom: 1px solid rgba(255,255,255,0.4); padding-bottom: 1px; }

    footer { background: var(--ink); color: rgba(255,255,255,0.55); padding: 3rem 1.5rem; text-align: center; font-size: 0.85rem; }
    footer .brand { font-family: var(--display); font-size: 1.4rem; color: #fff; margin-bottom: 0.5rem; letter-spacing: 0.04em; text-transform: uppercase; }
    footer .legal { display: flex; gap: 1.5rem; justify-content: center; margin-top: 1rem; flex-wrap: wrap; }
    footer .legal a:hover { color: var(--primary); }

    .reveal { opacity: 0; transform: translateY(20px); transition: opacity .8s ease, transform .8s ease; }
    .reveal.is-visible { opacity: 1; transform: translateY(0); }
    @media (prefers-reduced-motion: reduce) { .reveal { opacity: 1 !important; transform: none !important; } .notdienst .pulse { animation: none; } }
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

<div class="notdienst" role="contentinfo">
  <div class="notdienst-inner">
    <span class="pulse" aria-hidden="true"></span>
    <strong>24-h Notdienst aktiv</strong>
    ${phone ? `<span>· Wasserschaden, Sturm, Schimmel: <a href="tel:${phone.replace(/\s/g, '')}">${phone}</a></span>` : ''}
  </div>
</div>

<header class="nav">
  <div class="nav-inner">
    <a class="brand-mark" href="#">${businessName.split(' ').map((w, i) => i === 0 ? `<span>${w}</span>` : w).join(' ')}</a>
    <input type="checkbox" id="nav-toggle" class="nav-toggle" aria-label="Menü öffnen" />
    <label for="nav-toggle" class="nav-burger" aria-hidden="true"><span></span></label>
    <nav class="main-nav">
      <a href="#leistungen">Leistungen</a>
      <a href="#projekte">Projekte</a>
      <a href="#ablauf">Ablauf</a>
      <a href="#kontakt">Kontakt</a>
    </nav>
    <a href="#kontakt" class="nav-cta">${ctaText}</a>
  </div>
</header>

<section class="hero">
  <div class="hero-text">
    <span class="hero-eyebrow">${escapeHtml(tagline.slice(0, 60))}</span>
    <h1>${escapeHtml(headline.replace(/(\.|!|\?)([^.!?]*)$/, '|$1$2|')).replace(/\|([^|]+)\|/, '<em>$1</em>')}</h1>
    <p>${subhead}</p>
    <div class="hero-trust">
      <span class="hero-trust-item">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        Festpreis garantiert
      </span>
      <span class="hero-trust-item">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        5 Jahre Gewährleistung
      </span>
      <span class="hero-trust-item">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        Meisterbetrieb
      </span>
    </div>
    <div class="hero-cta-row">
      <a href="#kontakt" class="btn-primary">${ctaText} →</a>
      <a href="#projekte" class="btn-line">Referenzen</a>
    </div>
  </div>
  <div class="hero-image" aria-hidden="true"></div>
</section>

<section class="promise">
  <div class="promise-inner">
    <div class="promise-item">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      <span><strong>Festpreis</strong><br><span style="opacity:0.78;">Schriftlich, transparent</span></span>
    </div>
    <div class="promise-item">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      <span><strong>Pünktlich</strong><br><span style="opacity:0.78;">Zugesagter Termin gilt</span></span>
    </div>
    <div class="promise-item">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/></svg>
      <span><strong>Sauber</strong><br><span style="opacity:0.78;">Wir hinterlassen keine Spuren</span></span>
    </div>
    <div class="promise-item">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
      <span><strong>Erreichbar</strong><br><span style="opacity:0.78;">Auch nach dem Auftrag</span></span>
    </div>
  </div>
</section>

<section id="leistungen" class="section">
  <div class="container">
    <div class="section-head center reveal">
      <span class="section-eyebrow">Leistungen</span>
      <h2 class="section-title">Was wir <em>können</em>.</h2>
      <p class="section-lead">Sechs Schwerpunkte aus 35 Jahren Praxis. Was Sie hier nicht finden — fragen Sie uns. Oft kennen wir den richtigen Partner.</p>
    </div>
    <div class="services-grid">
      ${services.map((s, i) => `
        <article class="service-card reveal">
          <div class="service-num">${String(i + 1).padStart(2, '0')} / ${String(services.length).padStart(2, '0')}</div>
          <h3>${escapeHtml(s.name)}</h3>
          <p>${escapeHtml(s.description)}</p>
        </article>
      `).join('')}
    </div>
  </div>
</section>

<section id="projekte" class="section ba-section">
  <div class="container">
    <div class="section-head center reveal">
      <span class="section-eyebrow">Vorher / Nachher</span>
      <h2 class="section-title">Drei <em>Projekte</em>.<br>Drei Mal gemacht.</h2>
      <p class="section-lead">Eindrücke aus Aufträgen der letzten Monate — von der Sanierung über den kompletten Innenausbau bis zur Notdienst-Reparatur.</p>
    </div>
    <div class="ba-grid">
      <div class="ba-pair reveal" style="background-image: url('${projectPhoto(slug, 11)}');">
        <span class="ba-tag">Wohnung Salzburg</span>
      </div>
      <div class="ba-pair reveal" style="background-image: url('${projectPhoto(slug, 12)}');">
        <span class="ba-tag">Geschäft Linz</span>
      </div>
      <div class="ba-pair reveal" style="background-image: url('${projectPhoto(slug, 13)}');">
        <span class="ba-tag">Sanierung Mondsee</span>
      </div>
      <div class="ba-pair reveal" style="background-image: url('${projectPhoto(slug, 14)}');">
        <span class="ba-tag">Vollwärmeschutz</span>
      </div>
      <div class="ba-pair reveal" style="background-image: url('${projectPhoto(slug, 15)}');">
        <span class="ba-tag">Bodenverlegung</span>
      </div>
      <div class="ba-pair reveal" style="background-image: url('${projectPhoto(slug, 16)}');">
        <span class="ba-tag">Notdienst Wasser</span>
      </div>
    </div>
  </div>
</section>

<section id="ablauf" class="section">
  <div class="container">
    <div class="section-head center reveal">
      <span class="section-eyebrow">Ablauf</span>
      <h2 class="section-title">So läuft <em>Ihr Auftrag</em> ab.</h2>
      <p class="section-lead">Vier Schritte. Keine Überraschungen. Keine versteckten Kosten.</p>
    </div>
    <div class="process-grid">
      <article class="process-step reveal"><div class="num">01</div><h4>Vor-Ort-Termin</h4><p>Wir kommen kostenlos zu Ihnen, schauen uns die Lage an, beraten ehrlich.</p></article>
      <article class="process-step reveal"><div class="num">02</div><h4>Festpreis</h4><p>Schriftliches Angebot — Sie wissen vorher, was es kostet. Auf den Cent.</p></article>
      <article class="process-step reveal"><div class="num">03</div><h4>Saubere Arbeit</h4><p>Pünktlich, mit Respekt vor Ihren Räumen. Wir hinterlassen es so, wie es war — nur schöner.</p></article>
      <article class="process-step reveal"><div class="num">04</div><h4>Garantie</h4><p>5 Jahre Gewährleistung. Ein Anruf — wir sind wieder da. Auch in 4 Jahren.</p></article>
    </div>
  </div>
</section>

<section id="kontakt" class="cta-section">
  <span class="section-eyebrow" style="color: var(--primary); display: block; margin-bottom: 1.25rem;">Festpreis-Angebot</span>
  <h2>Schicken Sie uns Ihren <em>Auftrag</em>.</h2>
  <p>Anruf, Mail oder kurz vorbeischauen — innerhalb von 24 Stunden bekommen Sie eine Rückmeldung mit Termin für den Vor-Ort-Termin.</p>
  ${email ? `<a href="mailto:${email}?subject=${encodeURIComponent('Festpreis-Anfrage')}" class="btn-orange">${ctaText}</a>` : ''}
  <div class="cta-info">
    ${phone ? `<a href="tel:${phone.replace(/\s/g, '')}">${phone}</a>` : ''}
    ${email ? `<a href="mailto:${email}">${email}</a>` : ''}
    ${address ? `<span>${address}</span>` : ''}
  </div>
</section>

<footer>
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
