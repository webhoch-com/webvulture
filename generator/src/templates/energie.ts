/**
 * Energie / PV / Wärmepumpe template — sustainable, modern eco-tech.
 * Soft sage + earth palette, big number visualisations, savings-calculator feel,
 * project gallery, certification badges, funding info prominent.
 */

import type { SiteSpec } from '../types.js';

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function projectPhoto(slug: string, idx: number, w = 800, h = 600): string {
  return `https://picsum.photos/seed/${encodeURIComponent(slug)}-pv-${idx}/${w}/${h}`;
}

export function renderEnergiePage(spec: SiteSpec, slug: string): string {
  const businessName = escapeHtml(spec.business_name);
  const tagline = spec.tagline;
  const headline = spec.hero.headline;
  const subhead = escapeHtml(spec.hero.subheadline);
  const ctaText = escapeHtml(spec.hero.cta_text || 'Beratungstermin anfragen');

  const services = spec.services && spec.services.length >= 3 ? spec.services : [
    { name: 'Photovoltaik', description: 'Komplettpaket Hausdach, Carport oder Freifläche — inkl. Förderabwicklung.' },
    { name: 'Wärmepumpe', description: 'Luft/Wasser, Sole/Wasser — passend dimensioniert.' },
    { name: 'Stromspeicher', description: 'Damit Ihr Sonnenstrom auch nachts arbeitet — 5–20 kWh-Systeme.' },
    { name: 'E-Mobilität', description: 'Wallbox-Installation, optional gekoppelt mit PV-Anlage.' },
    { name: 'Förderberatung', description: 'Bund, Land, Gemeinde — wir wickeln alles ab.' },
    { name: 'Wartung & Monitoring', description: 'Jährliche Wartung, 24/7-Online-Monitoring.' },
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
  <meta name="theme-color" content="#3a5a40" />
  <link rel="preconnect" href="https://fonts.bunny.net" crossorigin>
  <link href="https://fonts.bunny.net/css?family=fraunces:400,500,600,700|inter:400,500,600,700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #f7f5f0;          /* warm off-white */
      --bg-2: #eae6db;
      --surface: #ffffff;
      --primary: #3a5a40;     /* deep moss green */
      --primary-soft: #d8e2d2;
      --primary-light: #a3b18a;
      --accent: #d4a017;      /* sun gold */
      --ink: #1a2820;         /* deep forest */
      --ink-2: #4a5a52;
      --ink-3: #8a9a90;
      --rule: rgba(26,40,32,0.10);
      --display: 'Fraunces', Georgia, serif;
      --sans: 'Inter', system-ui, sans-serif;
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

    /* ─── Header ────────────────────────────────────────── */
    .nav { background: var(--bg); border-bottom: 1px solid var(--rule); position: sticky; top: 0; z-index: 50; }
    .nav-inner { max-width: 1300px; margin: 0 auto; padding: 1.1rem 1.5rem; display: flex; align-items: center; justify-content: space-between; gap: 1.5rem; }
    .brand-mark { font-family: var(--display); font-weight: 600; font-size: 1.5rem; line-height: 1; letter-spacing: -0.005em; }
    .brand-mark .leaf { color: var(--primary); margin-right: 0.4rem; }
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
    .nav-cta { background: var(--primary); color: #fff; padding: 0.85rem 1.5rem; border-radius: 999px; font-weight: 600; font-size: 0.88rem; transition: background .2s, transform .2s; }
    .nav-cta:hover { background: var(--ink); transform: translateY(-1px); }

    /* ─── Hero — split with savings card ─────────────────── */
    .hero { padding: clamp(3.5rem, 7vw, 6rem) 1.5rem; }
    .hero-inner { max-width: 1300px; margin: 0 auto; display: grid; gap: 4rem; align-items: center; }
    @media (min-width: 880px) { .hero-inner { grid-template-columns: 1.05fr 1fr; gap: 5rem; } }
    .hero-eyebrow {
      display: inline-flex; align-items: center; gap: 0.55rem;
      background: var(--primary-soft); color: var(--primary);
      padding: 0.45rem 1rem; border-radius: 999px;
      font-size: 0.78rem; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 600;
      margin-bottom: 1.5rem;
    }
    .hero h1 {
      font-family: var(--display); font-weight: 500;
      font-size: clamp(2.5rem, 5.5vw, 4.5rem); line-height: 1.05; letter-spacing: -0.025em;
    }
    .hero h1 em { font-style: italic; color: var(--primary); font-weight: 400; }
    .hero p { color: var(--ink-2); font-size: 1.1rem; margin-top: 1.5rem; max-width: 480px; line-height: 1.7; }
    .hero-cta-row { display: flex; gap: 1rem; margin-top: 2rem; flex-wrap: wrap; }
    .btn-primary { background: var(--primary); color: #fff; padding: 1rem 1.85rem; border-radius: 12px; font-weight: 600; font-size: 0.95rem; transition: background .2s, transform .2s, box-shadow .2s; box-shadow: 0 8px 24px -10px var(--primary); }
    .btn-primary:hover { background: var(--ink); transform: translateY(-2px); }
    .btn-secondary { background: var(--surface); color: var(--ink); border: 1.5px solid var(--rule); padding: 1rem 1.85rem; border-radius: 12px; font-weight: 600; font-size: 0.95rem; transition: border-color .2s, color .2s; }
    .btn-secondary:hover { border-color: var(--primary); color: var(--primary); }

    /* ─── Savings card on right ──────────────────────────── */
    .savings {
      background: var(--surface); border-radius: 24px;
      padding: 2.5rem 2rem; box-shadow: 0 24px 60px -28px rgba(58, 90, 64, 0.3);
      border: 1px solid var(--rule);
    }
    .savings h3 { font-family: var(--display); font-size: 1.25rem; font-weight: 500; margin-bottom: 1.5rem; color: var(--ink); }
    .savings-row { display: flex; justify-content: space-between; align-items: baseline; padding: 1rem 0; border-bottom: 1px solid var(--rule); }
    .savings-row:last-child { border-bottom: none; }
    .savings-row .lbl { color: var(--ink-2); font-size: 0.92rem; }
    .savings-row .val { font-family: var(--display); font-size: 1.4rem; font-weight: 600; color: var(--primary); }
    .savings-total { background: var(--primary); color: #fff; padding: 1.25rem; border-radius: 14px; margin-top: 1.5rem; display: flex; justify-content: space-between; align-items: center; }
    .savings-total span { font-family: var(--display); font-size: 1rem; font-weight: 500; }
    .savings-total strong { font-family: var(--display); font-size: 1.85rem; color: var(--accent); }
    .savings small { display: block; font-size: 0.82rem; color: var(--ink-3); margin-top: 1rem; line-height: 1.5; }

    /* ─── Trust strip ────────────────────────────────────── */
    .trust-strip { background: var(--primary); color: #fff; padding: 2.5rem 1.5rem; }
    .trust-inner { max-width: 1100px; margin: 0 auto; display: grid; gap: 1.5rem; grid-template-columns: repeat(auto-fit, minmax(min(180px, 100%), 1fr)); text-align: center; }
    .trust-num { font-family: var(--display); font-weight: 600; font-size: 2.25rem; line-height: 1; color: var(--accent); margin-bottom: 0.3rem; }
    .trust-lbl { font-size: 0.82rem; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(255,255,255,0.78); font-weight: 500; }

    /* ─── Section base ───────────────────────────────────── */
    .section { padding: clamp(5rem, 9vw, 8rem) 1.5rem; }
    .container { max-width: 1300px; margin: 0 auto; }
    .section-eyebrow { display: inline-block; padding: 0.4rem 0.95rem; background: var(--primary-soft); color: var(--primary); font-size: 0.78rem; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 600; border-radius: 999px; margin-bottom: 1.25rem; }
    .section-title { font-family: var(--display); font-weight: 500; font-size: clamp(2rem, 4vw, 3.25rem); line-height: 1.15; letter-spacing: -0.02em; margin-bottom: 1.25rem; }
    .section-title em { font-style: italic; color: var(--primary); font-weight: 400; }
    .section-lead { color: var(--ink-2); font-size: 1.05rem; line-height: 1.75; max-width: 600px; }
    .section-head.center { text-align: center; }
    .section-head.center .section-lead { margin-inline: auto; }

    /* ─── Solutions grid ─────────────────────────────────── */
    .solutions {
      display: grid; gap: 1.25rem;
      grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr));
      margin-top: 4rem;
    }
    @media (min-width: 880px) { .solutions { grid-template-columns: repeat(3, 1fr); } }
    .solution {
      background: var(--surface); border: 1px solid var(--rule);
      border-radius: 18px; padding: 2.25rem 1.85rem;
      transition: transform .3s ease, box-shadow .3s ease;
    }
    .solution:hover { transform: translateY(-4px); box-shadow: 0 20px 40px -16px rgba(58,90,64,0.18); }
    .solution-icon {
      width: 52px; height: 52px; border-radius: 14px;
      background: var(--primary-soft); color: var(--primary);
      display: grid; place-items: center; margin-bottom: 1.25rem;
    }
    .solution h3 { font-family: var(--display); font-weight: 500; font-size: 1.4rem; line-height: 1.25; margin-bottom: 0.85rem; }
    .solution p { color: var(--ink-2); font-size: 0.95rem; line-height: 1.65; }

    /* ─── Process / how it works ─────────────────────────── */
    .process { background: var(--bg-2); }
    .process-list {
      max-width: 900px; margin: 4rem auto 0;
      display: grid; gap: 1rem;
    }
    .process-step {
      background: var(--surface); border-radius: 16px;
      padding: 2rem; display: grid; gap: 1.5rem;
      grid-template-columns: 1fr;
    }
    @media (min-width: 700px) { .process-step { grid-template-columns: auto 1fr auto; align-items: center; } }
    .process-step .num {
      font-family: var(--display); font-weight: 600; font-size: 2.5rem; line-height: 1;
      color: var(--primary); min-width: 3ch;
    }
    .process-step h4 { font-family: var(--display); font-weight: 600; font-size: 1.25rem; margin-bottom: 0.5rem; line-height: 1.3; }
    .process-step p { color: var(--ink-2); font-size: 0.95rem; line-height: 1.6; }
    .process-step .duration { color: var(--primary); font-size: 0.85rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; white-space: nowrap; }

    /* ─── Funding banner ─────────────────────────────────── */
    .funding {
      background: linear-gradient(135deg, var(--primary), var(--ink));
      color: #fff; padding: clamp(4rem, 7vw, 6rem) 1.5rem; border-radius: 0;
    }
    .funding-inner { max-width: 1000px; margin: 0 auto; display: grid; gap: 3rem; align-items: center; }
    @media (min-width: 720px) { .funding-inner { grid-template-columns: 1.4fr 1fr; gap: 4rem; } }
    .funding h2 { font-family: var(--display); font-weight: 500; font-size: clamp(1.85rem, 4vw, 2.85rem); line-height: 1.15; color: #fff; margin-bottom: 1rem; }
    .funding h2 em { font-style: italic; color: var(--accent); }
    .funding p { color: rgba(255,255,255,0.85); margin-bottom: 1.5rem; line-height: 1.7; }
    .funding-amount {
      background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12);
      border-radius: 18px; padding: 2rem; text-align: center;
    }
    .funding-amount strong { display: block; font-family: var(--display); font-size: 3rem; line-height: 1; font-weight: 600; color: var(--accent); margin-bottom: 0.5rem; }
    .funding-amount span { color: rgba(255,255,255,0.78); font-size: 0.9rem; letter-spacing: 0.06em; }

    /* ─── Project showcase ───────────────────────────────── */
    .projects {
      display: grid; gap: 0.75rem;
      grid-template-columns: repeat(auto-fit, minmax(min(240px, 100%), 1fr));
      margin-top: 4rem;
    }
    @media (min-width: 880px) { .projects { grid-template-columns: repeat(3, 1fr); } }
    .project { position: relative; aspect-ratio: 4/3; overflow: hidden; border-radius: 14px; }
    .project img { width: 100%; height: 100%; object-fit: cover; transition: transform 1s ease; }
    .project:hover img { transform: scale(1.05); }
    .project-overlay {
      position: absolute; inset: auto 0 0 0;
      background: linear-gradient(0deg, rgba(0,0,0,0.7) 0%, transparent 100%);
      padding: 2rem 1.5rem 1.5rem; color: #fff;
    }
    .project-overlay .meta { font-size: 0.78rem; letter-spacing: 0.16em; text-transform: uppercase; color: var(--accent); font-weight: 600; }
    .project-overlay .name { font-family: var(--display); font-size: 1.25rem; font-weight: 500; margin-top: 0.4rem; }

    /* ─── Contact ────────────────────────────────────────── */
    .contact-section { background: var(--bg); }
    .contact-grid { max-width: 1100px; margin: 4rem auto 0; display: grid; gap: 1.25rem; grid-template-columns: repeat(auto-fit, minmax(min(220px, 100%), 1fr)); }
    .contact-card { background: var(--surface); border-radius: 16px; padding: 2rem 1.5rem; text-align: center; border: 1px solid var(--rule); }
    .contact-card .ic { width: 48px; height: 48px; margin: 0 auto 1rem; background: var(--primary-soft); color: var(--primary); border-radius: 12px; display: grid; place-items: center; }
    .contact-card .lbl { font-size: 0.78rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-3); font-weight: 600; margin-bottom: 0.5rem; }
    .contact-card .val { font-family: var(--display); font-size: 1.2rem; line-height: 1.4; }
    .contact-card a:hover { color: var(--primary); }

    footer { background: var(--ink); color: rgba(255,255,255,0.65); padding: 3rem 1.5rem; text-align: center; font-size: 0.85rem; }
    footer .brand { font-family: var(--display); font-size: 1.4rem; color: #fff; margin-bottom: 0.5rem; font-weight: 500; }
    footer .legal { display: flex; gap: 1.5rem; justify-content: center; margin-top: 1rem; flex-wrap: wrap; }
    footer .legal a:hover { color: var(--primary-light); }

    .reveal { opacity: 0; transform: translateY(20px); transition: opacity .8s ease, transform .8s ease; }
    .reveal.is-visible { opacity: 1; transform: translateY(0); }
    @media (prefers-reduced-motion: reduce) { .reveal { opacity: 1 !important; transform: none !important; } }
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
    <a class="brand-mark" href="#"><span class="leaf">◆</span>${businessName}</a>
    <input type="checkbox" id="nav-toggle" class="nav-toggle" aria-label="Menü öffnen" />
    <label for="nav-toggle" class="nav-burger" aria-hidden="true"><span></span></label>
    <nav class="main-nav">
      <a href="#leistungen">Leistungen</a>
      <a href="#ablauf">Ablauf</a>
      <a href="#projekte">Projekte</a>
      <a href="#kontakt">Kontakt</a>
    </nav>
    <a href="#kontakt" class="nav-cta">${ctaText}</a>
  </div>
</header>

<section class="hero">
  <div class="hero-inner">
    <div class="reveal">
      <span class="hero-eyebrow">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L4 7v10l8 5 8-5V7l-8-5zm0 2.5l5.5 3.5L12 11.5 6.5 8 12 4.5z"/></svg>
        ${escapeHtml(tagline.slice(0, 60))}
      </span>
      <h1>${escapeHtml(headline.replace(/(\.|!|\?)([^.!?]*)$/, '|$1$2|')).replace(/\|([^|]+)\|/, '<em>$1</em>')}</h1>
      <p>${subhead}</p>
      <div class="hero-cta-row">
        <a href="#kontakt" class="btn-primary">${ctaText} →</a>
        <a href="#leistungen" class="btn-secondary">Leistungen ansehen</a>
      </div>
    </div>

    <aside class="savings reveal" aria-label="Beispielrechnung">
      <h3>Beispielrechnung — Größenordnung</h3>
      <div class="savings-row"><span class="lbl">PV-Komplettanlage</span><span class="val">je nach Dachgröße</span></div>
      <div class="savings-row"><span class="lbl">Bundes-Förderung</span><span class="val">−Förderbetrag</span></div>
      <div class="savings-row"><span class="lbl">Land-Förderung</span><span class="val">−Förderbetrag</span></div>
      <div class="savings-total">
        <span>Ihr Anteil</span>
        <strong>persönliches Angebot</strong>
      </div>
      <small>Konkrete Beträge nach Vor-Ort-Termin. Amortisation typischerweise 8–10 Jahre. Förderhöhen variieren je nach Standort, Bonität und Förderperiode.</small>
    </aside>
  </div>
</section>

<section class="trust-strip">
  <div class="trust-inner">
    <div><div class="trust-num">500+</div><div class="trust-lbl">Anlagen installiert</div></div>
    <div><div class="trust-num">25 Jahre</div><div class="trust-lbl">Modul-Garantie</div></div>
    <div><div class="trust-num">12 Mt.</div><div class="trust-lbl">Auf Arbeit</div></div>
    <div><div class="trust-num">100%</div><div class="trust-lbl">EU-Komponenten</div></div>
  </div>
</section>

<section id="leistungen" class="section">
  <div class="container">
    <div class="section-head center reveal">
      <span class="section-eyebrow">Leistungen</span>
      <h2 class="section-title">Sechs Wege zur <em>Unabhängigkeit</em>.</h2>
      <p class="section-lead">Vom ersten Modul bis zur Wallbox — wir planen, beantragen, montieren und warten. Sie haben einen Ansprechpartner, nicht fünf.</p>
    </div>
    <div class="solutions">
      ${services.map(s => `
        <article class="solution reveal">
          <div class="solution-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
          </div>
          <h3>${escapeHtml(s.name)}</h3>
          <p>${escapeHtml(s.description)}</p>
        </article>
      `).join('')}
    </div>
  </div>
</section>

<section id="ablauf" class="section process">
  <div class="container">
    <div class="section-head center reveal">
      <span class="section-eyebrow">Ablauf</span>
      <h2 class="section-title">Von der Idee zur <em>fertigen Anlage</em>.</h2>
      <p class="section-lead">Vier Schritte, klar getaktet. Wir begleiten Sie durch jede Phase.</p>
    </div>
    <div class="process-list">
      <article class="process-step reveal">
        <div class="num">01</div>
        <div><h4>Vor-Ort-Beratung</h4><p>Wir nehmen Maß, prüfen Statik, Verschattung, Verbrauch — und beraten ehrlich.</p></div>
        <div class="duration">Tag 1</div>
      </article>
      <article class="process-step reveal">
        <div class="num">02</div>
        <div><h4>Förderantrag</h4><p>Wir wickeln Bund, Land und Gemeinde ab — Sie unterschreiben einmal.</p></div>
        <div class="duration">Tag 7–14</div>
      </article>
      <article class="process-step reveal">
        <div class="num">03</div>
        <div><h4>Montage</h4><p>Eigene Monteure, kein Subunternehmer. 1–3 Tage Bauzeit.</p></div>
        <div class="duration">Woche 6–8</div>
      </article>
      <article class="process-step reveal">
        <div class="num">04</div>
        <div><h4>Inbetriebnahme</h4><p>Anschluss durch Netzbetreiber, Einweisung, Monitoring eingerichtet.</p></div>
        <div class="duration">+ 1 Tag</div>
      </article>
    </div>
  </div>
</section>

<section class="funding">
  <div class="funding-inner">
    <div class="reveal">
      <h2>Bis zu <em>50% Förderung</em>.<br>Wir wickeln alles ab.</h2>
      <p>Bundes-Energieagentur, Land OÖ, Gemeinde-Boni — wir kennen die Fristen, Quoten und Formulare. Sie zahlen am Ende den geförderten Endpreis.</p>
      <a href="#kontakt" class="btn-primary" style="background: var(--accent); color: var(--ink);">Förderchancen prüfen →</a>
    </div>
    <div class="funding-amount reveal">
      <strong>bis 50%</strong>
      <span>Mögliche Gesamt-Förderquote — abhängig von Standort und Anlagengröße</span>
    </div>
  </div>
</section>

<section id="projekte" class="section">
  <div class="container">
    <div class="section-head center reveal">
      <span class="section-eyebrow">Referenzprojekte</span>
      <h2 class="section-title">Anlagen aus der <em>Region</em>.</h2>
      <p class="section-lead">Auszug aus jüngeren Installationen. Auf Wunsch organisieren wir Referenzbesuche bei Bestandskund:innen.</p>
    </div>
    <div class="projects">
      <div class="project reveal"><img src="${projectPhoto(slug, 1)}" alt="" loading="lazy"><div class="project-overlay"><div class="meta">10 kWp · Einfamilienhaus</div><div class="name">Region X</div></div></div>
      <div class="project reveal"><img src="${projectPhoto(slug, 2)}" alt="" loading="lazy"><div class="project-overlay"><div class="meta">22 kWp · Landwirtschaft</div><div class="name">Region Y</div></div></div>
      <div class="project reveal"><img src="${projectPhoto(slug, 3)}" alt="" loading="lazy"><div class="project-overlay"><div class="meta">8 kWp + Speicher</div><div class="name">Region Z</div></div></div>
      <div class="project reveal"><img src="${projectPhoto(slug, 4)}" alt="" loading="lazy"><div class="project-overlay"><div class="meta">Wärmepumpe Sole</div><div class="name">Sanierung — Region X</div></div></div>
      <div class="project reveal"><img src="${projectPhoto(slug, 5)}" alt="" loading="lazy"><div class="project-overlay"><div class="meta">Carport-PV</div><div class="name">Gewerbeobjekt — Region Y</div></div></div>
      <div class="project reveal"><img src="${projectPhoto(slug, 6)}" alt="" loading="lazy"><div class="project-overlay"><div class="meta">Wallbox + 11 kWp</div><div class="name">Einfamilienhaus — Region Z</div></div></div>
    </div>
  </div>
</section>

<section id="kontakt" class="section contact-section">
  <div class="container">
    <div class="section-head center reveal">
      <span class="section-eyebrow">Kontakt</span>
      <h2 class="section-title">Beratung — <em>kostenfrei</em> und unverbindlich.</h2>
      <p class="section-lead">In 30 Minuten Vor-Ort wissen Sie, ob sich eine Anlage rechnet — und wie viel.</p>
    </div>
    <div class="contact-grid">
      ${address ? `<div class="contact-card reveal">
        <div class="ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></div>
        <div class="lbl">Anschrift</div>
        <div class="val">${address}</div>
      </div>` : ''}
      ${phone ? `<div class="contact-card reveal">
        <div class="ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg></div>
        <div class="lbl">Telefon</div>
        <div class="val"><a href="tel:${phone.replace(/\s/g, '')}">${phone}</a></div>
      </div>` : ''}
      ${email ? `<div class="contact-card reveal">
        <div class="ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></div>
        <div class="lbl">E-Mail</div>
        <div class="val"><a href="mailto:${email}?subject=${encodeURIComponent('Beratungsanfrage')}">${email}</a></div>
      </div>` : ''}
    </div>
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
