/**
 * Standard fallback template — clean modern professional default.
 * Works for any branch that doesn't have a dedicated template.
 * Light bg, indigo primary, generous whitespace, Inter sans
 * + Geist Mono accent, asymmetric hero, clear sections.
 */

import type { SiteSpec } from '../types.js';

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function workPhoto(slug: string, idx: number, w = 800, h = 600): string {
  return `https://picsum.photos/seed/${encodeURIComponent(slug)}-std-${idx}/${w}/${h}`;
}

export function renderStandardPage(spec: SiteSpec, slug: string): string {
  const businessName = escapeHtml(spec.business_name);
  const tagline = spec.tagline;
  const headline = spec.hero.headline;
  const subhead = escapeHtml(spec.hero.subheadline);
  const ctaText = escapeHtml(spec.hero.cta_text || 'Kontakt aufnehmen');

  const services = spec.services && spec.services.length >= 3 ? spec.services : [
    { name: 'Beratung', description: 'Wir hören zu — kostenlos und unverbindlich. 30 Minuten reichen oft, um Klarheit zu schaffen.' },
    { name: 'Konzeption', description: 'Klarer Plan auf einem Blatt: Was, wie, bis wann — ohne versteckte Schritte.' },
    { name: 'Umsetzung', description: 'Wir arbeiten zügig und transparent. Sie sehen Fortschritt, bevor wir abrechnen.' },
    { name: 'Begleitung', description: 'Auch nach Projektende sind wir Ansprechpartner. Schnelle Reaktion, ehrliche Beratung.' },
    { name: 'Schulung', description: 'Damit Sie selbst weiterarbeiten können — auf Wunsch in Ihrem Team.' },
    { name: 'Wartung', description: 'Regelmäßige Pflege, klar kalkuliert. Keine Überraschungen.' },
  ];

  const phone = spec.contact.phone ? escapeHtml(spec.contact.phone) : '';
  const email = spec.contact.email ? escapeHtml(spec.contact.email) : '';
  const address = spec.contact.address ? escapeHtml(spec.contact.address) : '';

  const processSteps = [
    { num: '01', title: 'Erstgespräch', body: 'Wir hören zu und verstehen, was Sie wirklich brauchen.', duration: 'Tag 1' },
    { num: '02', title: 'Angebot', body: 'Klare Kalkulation auf einem Blatt — keine versteckten Kosten.', duration: 'Tag 2–3' },
    { num: '03', title: 'Umsetzung', body: 'Wir arbeiten mit regelmäßigen Updates, Sie sehen jeden Schritt.', duration: 'Woche 2–6' },
    { num: '04', title: 'Übergabe', body: 'Vollständige Dokumentation, Schulung — und Begleitung danach.', duration: 'Woche 7' },
  ];

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
  <meta name="theme-color" content="#4f46e5" />
  <link rel="preconnect" href="https://fonts.bunny.net" crossorigin>
  <link href="https://fonts.bunny.net/css?family=inter:400,500,600,700,800|jetbrains-mono:400,500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #fbfbfd;            /* almost-white */
      --bg-2: #f3f4f8;
      --surface: #ffffff;
      --primary: #4f46e5;       /* indigo */
      --primary-soft: #e0e7ff;
      --primary-deep: #3730a3;
      --accent: #f59e0b;        /* amber for highlight */
      --ink: #0f172a;           /* slate-900 */
      --ink-2: #475569;         /* slate-600 */
      --ink-3: #94a3b8;         /* slate-400 */
      --rule: rgba(15,23,42,0.08);
      --sans: 'Inter', system-ui, sans-serif;
      --mono: 'JetBrains Mono', ui-monospace, monospace;
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
    .nav { background: rgba(251,251,253,0.85); backdrop-filter: saturate(180%) blur(14px); -webkit-backdrop-filter: saturate(180%) blur(14px); border-bottom: 1px solid var(--rule); position: sticky; top: 0; z-index: 50; }
    .nav-inner { max-width: 1300px; margin: 0 auto; padding: 1.05rem 1.5rem; display: flex; align-items: center; justify-content: space-between; gap: 1.5rem; }
    .brand-mark { font-weight: 700; font-size: 1.15rem; line-height: 1; letter-spacing: -0.015em; display: inline-flex; align-items: center; gap: 0.55rem; }
    .brand-dot { width: 10px; height: 10px; border-radius: 3px; background: var(--primary); transform: rotate(45deg); }
    .main-nav { display: none; gap: 2rem; font-size: 0.92rem; font-weight: 500; }
    .main-nav a { color: var(--ink-2); transition: color .2s; }
    .main-nav a:hover { color: var(--ink); }
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
        background: rgba(251,251,253,0.97); backdrop-filter: saturate(180%) blur(14px);
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
    .nav-cta { background: var(--ink); color: #fff; padding: 0.7rem 1.3rem; border-radius: 8px; font-weight: 600; font-size: 0.88rem; transition: background .2s, transform .2s; }
    .nav-cta:hover { background: var(--primary); transform: translateY(-1px); }

    /* ─── Hero — asymmetric grid ─────────────────────────── */
    .hero { padding: clamp(4rem, 8vw, 7rem) 1.5rem clamp(5rem, 9vw, 8rem); position: relative; overflow: hidden; }
    .hero::before {
      content: ""; position: absolute; top: -200px; right: -200px;
      width: 600px; height: 600px; border-radius: 50%;
      background: radial-gradient(circle, var(--primary-soft) 0%, transparent 65%);
      pointer-events: none; opacity: 0.6;
    }
    .hero-inner { max-width: 1300px; margin: 0 auto; position: relative; }
    .hero-tagline { font-family: var(--mono); font-size: 0.78rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--primary); margin-bottom: 1.5rem; display: inline-flex; align-items: center; gap: 0.65rem; padding: 0.5rem 1rem; background: var(--surface); border: 1px solid var(--rule); border-radius: 999px; box-shadow: 0 2px 8px -2px rgba(15,23,42,0.04); }
    .hero-tagline-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--primary); animation: pulse 2.4s ease-in-out infinite; }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.7); }
    }
    .hero h1 {
      font-weight: 800;
      font-size: clamp(2.6rem, 6.5vw, 5.4rem); line-height: 1.02;
      letter-spacing: -0.04em; max-width: 18ch;
    }
    .hero h1 em {
      font-style: normal; font-weight: 800;
      background: linear-gradient(120deg, var(--primary), var(--accent));
      -webkit-background-clip: text; background-clip: text; color: transparent;
    }
    .hero p { color: var(--ink-2); font-size: 1.2rem; margin-top: 1.75rem; max-width: 600px; line-height: 1.65; }
    .hero-cta-row { display: flex; gap: 1rem; margin-top: 2.5rem; flex-wrap: wrap; align-items: center; }
    .btn-primary { background: var(--ink); color: #fff; padding: 1.05rem 1.85rem; border-radius: 10px; font-weight: 600; font-size: 0.96rem; transition: background .2s, transform .2s, box-shadow .2s; box-shadow: 0 8px 24px -10px var(--ink); display: inline-flex; align-items: center; gap: 0.55rem; }
    .btn-primary:hover { background: var(--primary); transform: translateY(-2px); box-shadow: 0 12px 28px -10px var(--primary); }
    .btn-secondary { color: var(--ink); padding: 1rem 0; font-weight: 600; font-size: 0.96rem; transition: color .2s; display: inline-flex; align-items: center; gap: 0.55rem; border-bottom: 1.5px solid var(--rule); }
    .btn-secondary:hover { color: var(--primary); border-bottom-color: var(--primary); }

    .hero-meta {
      margin-top: 4rem; padding-top: 2.5rem;
      border-top: 1px solid var(--rule);
      display: grid; gap: 2rem;
      grid-template-columns: repeat(auto-fit, minmax(min(180px, 100%), 1fr));
    }
    .hero-meta-item .lbl { font-family: var(--mono); font-size: 0.75rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-3); margin-bottom: 0.4rem; }
    .hero-meta-item .val { font-weight: 700; font-size: 1.85rem; line-height: 1; color: var(--ink); letter-spacing: -0.02em; }
    .hero-meta-item .val span { color: var(--primary); }

    /* ─── Section base ───────────────────────────────────── */
    .section { padding: clamp(5rem, 9vw, 8rem) 1.5rem; }
    .container { max-width: 1300px; margin: 0 auto; }
    .section-eyebrow { font-family: var(--mono); display: inline-block; padding: 0.4rem 0.85rem; background: var(--primary-soft); color: var(--primary-deep); font-size: 0.74rem; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 600; border-radius: 6px; margin-bottom: 1.25rem; }
    .section-title { font-weight: 700; font-size: clamp(2rem, 4.5vw, 3.5rem); line-height: 1.1; letter-spacing: -0.03em; margin-bottom: 1.25rem; color: var(--ink); }
    .section-title em { font-style: normal; color: var(--primary); }
    .section-lead { color: var(--ink-2); font-size: 1.1rem; line-height: 1.7; max-width: 620px; }
    .section-head.center { text-align: center; }
    .section-head.center .section-lead { margin-inline: auto; }

    /* ─── Services grid ──────────────────────────────────── */
    .services-grid {
      display: grid; gap: 1.25rem; margin-top: 4rem;
      grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr));
    }
    @media (min-width: 880px) { .services-grid { grid-template-columns: repeat(3, 1fr); } }
    .service-card {
      background: var(--surface); border-radius: 14px;
      padding: 2rem 1.85rem; border: 1px solid var(--rule);
      transition: transform .25s ease, box-shadow .25s ease, border-color .25s;
      position: relative;
    }
    .service-card:hover { transform: translateY(-4px); box-shadow: 0 20px 40px -16px rgba(79,70,229,0.18); border-color: var(--primary-soft); }
    .service-card-num {
      font-family: var(--mono); font-size: 0.78rem; color: var(--ink-3);
      letter-spacing: 0.05em; margin-bottom: 1rem; display: block;
    }
    .service-card h3 { font-weight: 700; font-size: 1.3rem; line-height: 1.3; margin-bottom: 0.85rem; letter-spacing: -0.015em; color: var(--ink); }
    .service-card p { color: var(--ink-2); font-size: 0.95rem; line-height: 1.65; }
    .service-card-arrow { margin-top: 1.5rem; color: var(--primary); font-weight: 600; font-size: 0.88rem; opacity: 0; transform: translateX(-4px); transition: opacity .25s, transform .25s; }
    .service-card:hover .service-card-arrow { opacity: 1; transform: translateX(0); }

    /* ─── Showcase image strip ───────────────────────────── */
    .showcase {
      background: var(--ink); color: #fff; padding: 0;
      overflow: hidden; position: relative;
    }
    .showcase-inner { max-width: 1300px; margin: 0 auto; padding: clamp(4rem, 7vw, 6rem) 1.5rem; display: grid; gap: 4rem; align-items: center; }
    @media (min-width: 880px) { .showcase-inner { grid-template-columns: 1fr 1fr; gap: 5rem; } }
    .showcase h2 { color: #fff; font-weight: 700; font-size: clamp(1.85rem, 4vw, 2.85rem); line-height: 1.15; letter-spacing: -0.025em; margin-bottom: 1.5rem; }
    .showcase h2 em { font-style: normal; color: var(--accent); }
    .showcase p { color: rgba(255,255,255,0.7); font-size: 1.05rem; line-height: 1.7; margin-bottom: 1.5rem; }
    .showcase ul { list-style: none; padding: 0; margin: 2rem 0 0; }
    .showcase ul li { padding: 0.7rem 0; color: rgba(255,255,255,0.85); display: flex; align-items: flex-start; gap: 0.85rem; border-bottom: 1px solid rgba(255,255,255,0.1); }
    .showcase ul li:last-child { border-bottom: none; }
    .showcase ul li::before {
      content: ""; flex-shrink: 0; width: 6px; height: 6px; border-radius: 50%;
      background: var(--accent); margin-top: 0.55rem;
    }
    .showcase-image {
      position: relative; aspect-ratio: 4/5; border-radius: 16px; overflow: hidden;
      box-shadow: 0 30px 80px -32px rgba(0,0,0,0.6);
    }
    .showcase-image img { width: 100%; height: 100%; object-fit: cover; }

    /* ─── Process timeline ───────────────────────────────── */
    .process-section { background: var(--bg-2); }
    .process-list {
      max-width: 900px; margin: 4rem auto 0;
      display: grid; gap: 1rem;
    }
    .process-step {
      background: var(--surface); border-radius: 14px;
      padding: 2rem; display: grid; gap: 1.5rem;
      grid-template-columns: 1fr;
      border: 1px solid var(--rule);
      transition: border-color .25s;
    }
    .process-step:hover { border-color: var(--primary-soft); }
    @media (min-width: 700px) { .process-step { grid-template-columns: auto 1fr auto; align-items: center; } }
    .process-step .num {
      font-family: var(--mono); font-weight: 500; font-size: 1rem;
      color: var(--primary); padding: 0.45rem 0.85rem;
      background: var(--primary-soft); border-radius: 6px;
      display: inline-block; min-width: 3.5ch; text-align: center;
    }
    .process-step h4 { font-weight: 700; font-size: 1.2rem; margin-bottom: 0.45rem; line-height: 1.3; letter-spacing: -0.01em; }
    .process-step p { color: var(--ink-2); font-size: 0.95rem; line-height: 1.6; }
    .process-step .duration { font-family: var(--mono); color: var(--ink-3); font-size: 0.82rem; letter-spacing: 0.04em; white-space: nowrap; }

    /* ─── Quote / testimonial banner ─────────────────────── */
    .quote-banner {
      max-width: 980px; margin: 0 auto;
      padding: clamp(4rem, 7vw, 5.5rem) 1.5rem;
      text-align: center;
    }
    .quote-banner blockquote {
      font-weight: 600; font-size: clamp(1.3rem, 2.6vw, 1.85rem); line-height: 1.4;
      letter-spacing: -0.015em; color: var(--ink); margin: 0;
      position: relative; padding-top: 2rem;
    }
    .quote-banner blockquote::before {
      content: """; position: absolute; top: -1rem; left: 50%; transform: translateX(-50%);
      font-size: 6rem; color: var(--primary-soft); font-family: Georgia, serif;
      line-height: 1; pointer-events: none;
    }
    .quote-banner .author { margin-top: 1.5rem; color: var(--ink-3); font-size: 0.95rem; }
    .quote-banner .author strong { color: var(--ink); font-weight: 600; }

    /* ─── Contact CTA card ───────────────────────────────── */
    .contact-section { padding: clamp(5rem, 9vw, 7rem) 1.5rem; }
    .contact-card {
      max-width: 1000px; margin: 0 auto;
      background: linear-gradient(135deg, var(--ink), #1e293b);
      color: #fff; border-radius: 24px;
      padding: clamp(3rem, 5vw, 4.5rem) clamp(2rem, 4vw, 3.5rem);
      display: grid; gap: 3rem;
      grid-template-columns: 1fr;
      position: relative; overflow: hidden;
    }
    .contact-card::before {
      content: ""; position: absolute; top: -200px; right: -200px;
      width: 500px; height: 500px; border-radius: 50%;
      background: radial-gradient(circle, var(--primary) 0%, transparent 60%);
      opacity: 0.4;
    }
    @media (min-width: 880px) { .contact-card { grid-template-columns: 1.2fr 1fr; gap: 4rem; align-items: center; } }
    .contact-card-text { position: relative; }
    .contact-card-text .eyebrow { font-family: var(--mono); font-size: 0.78rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--accent); margin-bottom: 1rem; display: block; }
    .contact-card-text h2 { color: #fff; font-weight: 700; font-size: clamp(1.85rem, 3.5vw, 2.5rem); line-height: 1.15; letter-spacing: -0.02em; margin-bottom: 1.25rem; }
    .contact-card-text p { color: rgba(255,255,255,0.75); font-size: 1.05rem; line-height: 1.65; }
    .contact-info { position: relative; display: grid; gap: 1.25rem; }
    .contact-row { display: flex; align-items: flex-start; gap: 1rem; padding: 1.1rem 1.25rem; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; transition: background .25s, border-color .25s; }
    .contact-row:hover { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.2); }
    .contact-row .ic { width: 38px; height: 38px; border-radius: 10px; background: var(--primary); color: #fff; display: grid; place-items: center; flex-shrink: 0; }
    .contact-row .lbl { font-family: var(--mono); font-size: 0.72rem; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(255,255,255,0.55); margin-bottom: 0.2rem; }
    .contact-row .val { color: #fff; font-weight: 500; font-size: 1rem; line-height: 1.4; }

    footer { background: var(--bg); padding: 3rem 1.5rem; text-align: center; font-size: 0.88rem; color: var(--ink-3); border-top: 1px solid var(--rule); }
    footer .brand { font-weight: 700; font-size: 1.15rem; color: var(--ink); margin-bottom: 0.5rem; display: inline-flex; align-items: center; gap: 0.55rem; }
    footer .brand .dot { width: 8px; height: 8px; border-radius: 2px; background: var(--primary); transform: rotate(45deg); }
    footer .legal { display: flex; gap: 1.5rem; justify-content: center; margin-top: 1rem; flex-wrap: wrap; }
    footer .legal a:hover { color: var(--primary); }

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
    <a class="brand-mark" href="#"><span class="brand-dot"></span>${businessName}</a>
    <input type="checkbox" id="nav-toggle" class="nav-toggle" aria-label="Menü öffnen" />
    <label for="nav-toggle" class="nav-burger" aria-hidden="true"><span></span></label>
    <nav class="main-nav">
      <a href="#leistungen">Leistungen</a>
      <a href="#ablauf">Ablauf</a>
      <a href="#ueber">Über uns</a>
      <a href="#kontakt">Kontakt</a>
    </nav>
    <a href="#kontakt" class="nav-cta">${ctaText}</a>
  </div>
</header>

<section class="hero">
  <div class="hero-inner">
    <span class="hero-tagline reveal"><span class="hero-tagline-dot"></span>${escapeHtml(tagline.slice(0, 60))}</span>
    <h1 class="reveal">${escapeHtml(headline.replace(/(\.|!|\?)([^.!?]*)$/, '|$1$2|')).replace(/\|([^|]+)\|/, '<em>$1</em>')}</h1>
    <p class="reveal">${subhead}</p>
    <div class="hero-cta-row reveal">
      <a href="#kontakt" class="btn-primary">${ctaText} <span aria-hidden="true">→</span></a>
      <a href="#leistungen" class="btn-secondary">Leistungen ansehen <span aria-hidden="true">↓</span></a>
    </div>

    <div class="hero-meta reveal">
      <div class="hero-meta-item">
        <div class="lbl">Erfahrung</div>
        <div class="val">&lt;&lt;Jahre&gt;&gt;<span>+</span></div>
      </div>
      <div class="hero-meta-item">
        <div class="lbl">Projekte</div>
        <div class="val">&lt;&lt;Anzahl&gt;&gt;<span>+</span></div>
      </div>
      <div class="hero-meta-item">
        <div class="lbl">Region</div>
        <div class="val">&lt;&lt;Region&gt;&gt;<span>.</span></div>
      </div>
      <div class="hero-meta-item">
        <div class="lbl">Erstgespräch</div>
        <div class="val">Kostenfrei<span>.</span></div>
      </div>
    </div>
  </div>
</section>

<section id="leistungen" class="section">
  <div class="container">
    <div class="section-head center reveal">
      <span class="section-eyebrow">// Leistungen</span>
      <h2 class="section-title">Was wir <em>für Sie tun</em>.</h2>
      <p class="section-lead">Sechs klar abgegrenzte Leistungsbereiche — fair kalkuliert, transparent kommuniziert, sauber abgewickelt.</p>
    </div>
    <div class="services-grid">
      ${services.map((s, i) => `
        <article class="service-card reveal">
          <span class="service-card-num">0${i + 1} / ${services.length.toString().padStart(2, '0')}</span>
          <h3>${escapeHtml(s.name)}</h3>
          <p>${escapeHtml(s.description)}</p>
          <div class="service-card-arrow">Mehr erfahren →</div>
        </article>
      `).join('')}
    </div>
  </div>
</section>

<section id="ueber" class="showcase">
  <div class="showcase-inner">
    <div class="reveal">
      <h2>Persönlich, <em>ehrlich, präzise</em>.</h2>
      <p>${escapeHtml(spec.about?.body || 'Seit &lt;&lt;Jahren&gt;&gt; begleiten wir Unternehmen aus &lt;&lt;Region&gt;&gt; und Umgebung. Unser Anspruch: Lösungen, die wirken — keine Buzzwords, keine Hochglanz-Fassade.')}</p>
      <ul>
        <li>Festpreise und transparente Kalkulation</li>
        <li>Persönlicher Ansprechpartner während des gesamten Projekts</li>
        <li>Direkte Kommunikation — kein Account-Management-Layer</li>
        <li>Ehrliche Beratung, auch wenn das gegen unser Mandat spricht</li>
      </ul>
    </div>
    <div class="showcase-image reveal">
      <img src="${workPhoto(slug, 1, 800, 1000)}" alt="" loading="lazy">
    </div>
  </div>
</section>

<section id="ablauf" class="section process-section">
  <div class="container">
    <div class="section-head center reveal">
      <span class="section-eyebrow">// Ablauf</span>
      <h2 class="section-title">Vier Schritte, <em>klare Sache</em>.</h2>
      <p class="section-lead">Sie wissen jederzeit, wo wir stehen — und was als Nächstes kommt.</p>
    </div>
    <div class="process-list">
      ${processSteps.map(s => `
        <article class="process-step reveal">
          <div class="num">${s.num}</div>
          <div>
            <h4>${escapeHtml(s.title)}</h4>
            <p>${escapeHtml(s.body)}</p>
          </div>
          <div class="duration">${escapeHtml(s.duration)}</div>
        </article>
      `).join('')}
    </div>
  </div>
</section>

<section class="quote-banner reveal">
  <blockquote>
    Sie liefern, was Sie versprechen — und das in einem Tonfall, der Vertrauen schafft. Genau das suchten wir.
  </blockquote>
  <div class="author"><strong>&lt;&lt;Kundenname&gt;&gt;</strong> · &lt;&lt;Position&gt;&gt; · ${address ? address.split(',')[0] : '&lt;&lt;Ort&gt;&gt;'}</div>
</section>

<section id="kontakt" class="contact-section">
  <div class="contact-card reveal">
    <div class="contact-card-text">
      <span class="eyebrow">// Schreiben Sie uns</span>
      <h2>Lassen Sie uns reden — <em>unverbindlich</em>.</h2>
      <p>30 Minuten reichen oft, um Klarheit zu schaffen. Wir antworten persönlich, in der Regel binnen eines Werktags.</p>
    </div>
    <div class="contact-info">
      ${phone ? `<a href="tel:${phone.replace(/\s/g, '')}" class="contact-row">
        <div class="ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg></div>
        <div><div class="lbl">Telefon</div><div class="val">${phone}</div></div>
      </a>` : ''}
      ${email ? `<a href="mailto:${email}?subject=${encodeURIComponent('Anfrage')}" class="contact-row">
        <div class="ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></div>
        <div><div class="lbl">E-Mail</div><div class="val">${email}</div></div>
      </a>` : ''}
      ${address ? `<div class="contact-row">
        <div class="ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></div>
        <div><div class="lbl">Anschrift</div><div class="val">${address}</div></div>
      </div>` : ''}
    </div>
  </div>
</section>

<footer>
  <div class="brand"><span class="dot"></span>${businessName}</div>
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
