/**
 * Tier template — Tierarzt, Tierpension, Hundeschule.
 * Warm friendly aesthetic: soft cream bg, dusty terracotta + sage,
 * rounded shapes, hand-written accent type (Caveat) + Fraunces serif,
 * paw-shaped highlights, big team photos, animals-served grid,
 * gentle reassuring tone.
 */

import type { SiteSpec } from '../types.js';
import { renderSeoHead } from './_seo.js';
import { getGalleryImage } from './_media.js';

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function petPhoto(spec: SiteSpec, slug: string, idx: number, w = 800, h = 600): string {
  return getGalleryImage(spec, slug, idx, w, h);
}

import { avatarPlaceholder, SYMBOLIC_TAG_CSS } from './_avatar.js';

function vetPortrait(name: string): string {
  return avatarPlaceholder(name, '#c0633e');
}

export function renderTierPage(spec: SiteSpec, slug: string): string {
  const businessName = escapeHtml(spec.business_name);
  const tagline = spec.tagline;
  const headline = spec.hero.headline;
  const subhead = escapeHtml(spec.hero.subheadline);
  const ctaText = escapeHtml(spec.hero.cta_text || 'Termin vereinbaren');

  const services = spec.services && spec.services.length >= 3 ? spec.services : [
    { name: 'Allgemeine Sprechstunde', description: 'Gründliche Untersuchung — vom Welpen bis zum Senior.' },
    { name: 'Impfungen & Vorsorge', description: 'Jahresimpfungen, Wurmkuren, Reise-Beratung.' },
    { name: 'Chirurgie', description: 'Kastration, Weichteil-OPs — moderne Anästhesie, kürzeste Aufwachzeit.' },
    { name: 'Zahnheilkunde', description: 'Ultraschall-Reinigung, Extraktionen — schmerzfrei in Vollnarkose.' },
    { name: 'Notdienst', description: 'Mo–Fr bis 20 Uhr erreichbar. Wochenend-Bereitschaft im Wechsel.' },
    { name: 'Ernährungsberatung', description: 'Individuelle Pläne bei Übergewicht, Allergien oder Senioren-Themen.' },
  ];

  const phone = spec.contact.phone ? escapeHtml(spec.contact.phone) : '';
  const email = spec.contact.email ? escapeHtml(spec.contact.email) : '';
  const address = spec.contact.address ? escapeHtml(spec.contact.address) : '';

  const team = [
    { name: 'Dr. Anna Steiner', role: 'Tierärztin · Praxis-Inhaberin', specialty: 'Chirurgie & Zahnheilkunde' },
    { name: 'Mag. Lukas Berger', role: 'Tierarzt', specialty: 'Innere Medizin · Kardiologie' },
    { name: 'Sarah Hofer', role: 'Veterinär-Assistentin', specialty: 'Anästhesie · Welpen-Kurse' },
    { name: 'Mag. Eva Lechner', role: 'Tierärztin', specialty: 'Heimtiere · Reptilien' },
  ];

  const animals = [
    { icon: '🐕', label: 'Hunde', detail: 'Welpe bis Senior' },
    { icon: '🐈', label: 'Katzen', detail: 'Wohnungs- & Freigänger' },
    { icon: '🐰', label: 'Heimtiere', detail: 'Kaninchen, Meerschwein, Nager' },
    { icon: '🦜', label: 'Vögel', detail: 'Sittiche, Papageien' },
    { icon: '🐢', label: 'Reptilien', detail: 'Schildkröten, Echsen, Schlangen' },
    { icon: '🐎', label: 'Großtiere', detail: 'Hofbesuche im Umkreis 30 km' },
  ];

  return `---
---
<!DOCTYPE html>
<html lang="de">
<head>
  ${renderSeoHead(spec, { slug, schemaKind: 'VeterinaryCare' })}
  <link rel="preconnect" href="https://fonts.bunny.net" crossorigin>
  <link href="https://fonts.bunny.net/css?family=fraunces:400,500,600|caveat:500,700|nunito:400,500,600,700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #fbf6f0;            /* warm cream */
      --bg-2: #f3ead9;          /* slightly darker cream */
      --surface: #ffffff;
      --primary: #c0633e;       /* warm terracotta */
      --primary-soft: #f5e0d2;
      --primary-deep: #8a3f22;
      --secondary: #6b8e6b;     /* sage */
      --secondary-soft: #d8e4d6;
      --accent: #e8a838;        /* honey */
      --ink: #2d1f17;           /* warm dark brown */
      --ink-2: #5a4a3d;
      --ink-3: #8e7d6e;
      --rule: rgba(45,31,23,0.08);
      --display: 'Fraunces', Georgia, serif;
      --hand: 'Caveat', cursive;
      --sans: 'Nunito', system-ui, sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body { background: var(--bg); color: var(--ink); font-family: var(--sans); line-height: 1.7; -webkit-font-smoothing: antialiased; overflow-x: hidden; }
    img { display: block; max-width: 100%; }
    a { color: inherit; text-decoration: none; }

    .demo-banner { background: #1a0a1f; color:#fff; padding:0.55rem 1rem; font-size:0.82rem; position: relative; z-index: 200; border-bottom: 1px solid rgba(236,101,186,0.35); }
    .demo-banner-inner { max-width: 1280px; margin: 0 auto; display: flex; align-items: center; gap: 0.85rem; flex-wrap: wrap; justify-content: center; }
    .demo-banner-tag { font-size: 0.7rem; letter-spacing: 0.16em; text-transform: uppercase; padding: 0.18rem 0.55rem; border-radius: 999px; background: rgba(236,101,186,0.22); border: 1px solid rgba(236,101,186,0.5); color: #ffd6ee; font-weight: 700; white-space: nowrap; }
    .demo-banner a { color: #ffb3df; font-weight: 700; border-bottom: 1px solid rgba(255,179,223,0.45); }

    /* ─── Header ────────────────────────────────────────── */
    .nav { background: var(--bg); border-bottom: 1px solid var(--rule); position: sticky; top: 0; z-index: 50; }
    .nav-inner { max-width: 1300px; margin: 0 auto; padding: 1.1rem 1.5rem; display: flex; align-items: center; justify-content: space-between; gap: 1.5rem; }
    .brand-mark { font-family: var(--display); font-weight: 600; font-size: 1.5rem; line-height: 1; letter-spacing: -0.005em; display: inline-flex; align-items: center; gap: 0.55rem; }
    .brand-mark-paw {
      width: 32px; height: 32px; background: var(--primary); color: #fff;
      border-radius: 50%; display: grid; place-items: center;
      font-size: 1.05rem;
    }
    .main-nav { display: none; gap: 2rem; font-size: 0.96rem; font-weight: 600; }
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
    .nav-cta { background: var(--primary); color: #fff; padding: 0.85rem 1.6rem; border-radius: 999px; font-weight: 700; font-size: 0.92rem; transition: background .2s, transform .2s; box-shadow: 0 6px 16px -8px var(--primary); }
    .nav-cta:hover { background: var(--primary-deep); transform: translateY(-1px); }
    @media (max-width: 879px) { .nav-cta { display: none; } }

    /* ─── Hero — split with photo ────────────────────────── */
    .hero { padding: clamp(3rem, 6vw, 5.5rem) 1.5rem clamp(4rem, 7vw, 6rem); position: relative; overflow: hidden; }
    .hero::before {
      content: ""; position: absolute; top: -120px; right: -120px;
      width: 380px; height: 380px; border-radius: 50%;
      background: radial-gradient(circle, var(--primary-soft) 0%, transparent 70%);
      pointer-events: none;
    }
    .hero::after {
      content: ""; position: absolute; bottom: -100px; left: -80px;
      width: 280px; height: 280px; border-radius: 50%;
      background: radial-gradient(circle, var(--secondary-soft) 0%, transparent 70%);
      pointer-events: none;
    }
    .hero-inner { max-width: 1300px; margin: 0 auto; position: relative; display: grid; gap: 3rem; align-items: center; }
    @media (min-width: 880px) { .hero-inner { grid-template-columns: 1.05fr 1fr; gap: 4rem; } }
    .hero-eyebrow {
      font-family: var(--hand); font-weight: 700; color: var(--primary);
      font-size: 1.45rem; line-height: 1; margin-bottom: 0.85rem;
      transform: rotate(-2deg); display: inline-block;
    }
    .hero h1 {
      font-family: var(--display); font-weight: 500;
      font-size: clamp(2.4rem, 5.4vw, 4.4rem); line-height: 1.05;
      letter-spacing: -0.02em; color: var(--ink);
    }
    .hero h1 em {
      font-style: italic; color: var(--primary); font-weight: 500;
      position: relative;
    }
    .hero h1 em::after {
      content: ""; position: absolute; left: 0; right: 0; bottom: -8px; height: 8px;
      background: var(--accent); opacity: 0.35; border-radius: 999px; transform: skew(-12deg);
    }
    .hero p { color: var(--ink-2); font-size: 1.1rem; margin-top: 1.5rem; max-width: 480px; line-height: 1.75; }
    .hero-cta-row { display: flex; gap: 1rem; margin-top: 2rem; flex-wrap: wrap; align-items: center; }
    .btn-primary { background: var(--primary); color: #fff; padding: 1.05rem 2rem; border-radius: 999px; font-weight: 700; font-size: 0.96rem; transition: background .2s, transform .2s, box-shadow .2s; box-shadow: 0 10px 28px -12px var(--primary); }
    .btn-primary:hover { background: var(--primary-deep); transform: translateY(-2px); }
    .btn-secondary { background: var(--surface); color: var(--ink); border: 2px solid var(--rule); padding: 1rem 1.85rem; border-radius: 999px; font-weight: 700; font-size: 0.95rem; transition: border-color .2s, color .2s; }
    .btn-secondary:hover { border-color: var(--primary); color: var(--primary); }
    .hero-trust { display: flex; gap: 0.75rem; align-items: center; margin-top: 2rem; color: var(--ink-3); font-size: 0.92rem; }
    .hero-trust-stars { color: var(--accent); font-size: 1rem; letter-spacing: 0.1em; }

    .hero-photo {
      position: relative; aspect-ratio: 4/5; max-width: 520px; justify-self: end;
      border-radius: 240px 240px 32px 32px; overflow: hidden;
      box-shadow: 0 30px 80px -32px rgba(192, 99, 62, 0.45);
    }
    .hero-photo img { width: 100%; height: 100%; object-fit: cover; }
    .hero-photo-badge {
      position: absolute; bottom: 1.8rem; left: -1.5rem;
      background: var(--surface); border-radius: 16px;
      padding: 1rem 1.3rem; display: flex; align-items: center; gap: 0.85rem;
      box-shadow: 0 14px 40px -16px rgba(45,31,23,0.25);
      border: 1px solid var(--rule);
    }
    .hero-photo-badge .ic {
      width: 42px; height: 42px; border-radius: 50%;
      background: var(--secondary-soft); color: var(--secondary);
      display: grid; place-items: center; font-size: 1.3rem;
    }
    .hero-photo-badge .num { font-family: var(--display); font-size: 1.4rem; font-weight: 600; color: var(--ink); line-height: 1; }
    .hero-photo-badge .lbl { font-size: 0.78rem; color: var(--ink-3); letter-spacing: 0.04em; }

    /* ─── Animals served strip ───────────────────────────── */
    .animals-strip { background: var(--bg-2); padding: clamp(3rem, 5vw, 4.5rem) 1.5rem; }
    .animals-grid {
      max-width: 1200px; margin: 0 auto;
      display: grid; gap: 1.25rem;
      grid-template-columns: repeat(auto-fit, minmax(min(140px, 100%), 1fr));
    }
    @media (min-width: 880px) { .animals-grid { grid-template-columns: repeat(6, 1fr); } }
    .animal-card {
      background: var(--surface); border-radius: 20px;
      padding: 1.5rem 1rem; text-align: center;
      transition: transform .25s ease, box-shadow .25s ease;
      border: 1px solid var(--rule);
    }
    .animal-card:hover { transform: translateY(-4px); box-shadow: 0 16px 32px -16px rgba(192,99,62,0.18); }
    .animal-icon { font-size: 2.5rem; line-height: 1; margin-bottom: 0.5rem; }
    .animal-card .label { font-family: var(--display); font-weight: 600; font-size: 1.1rem; color: var(--ink); }
    .animal-card .detail { font-size: 0.82rem; color: var(--ink-3); margin-top: 0.25rem; line-height: 1.4; }

    /* ─── Section base ───────────────────────────────────── */
    .section { padding: clamp(5rem, 9vw, 8rem) 1.5rem; }
    .container { max-width: 1300px; margin: 0 auto; }
    .section-eyebrow { font-family: var(--hand); font-weight: 700; color: var(--primary); font-size: 1.5rem; line-height: 1; margin-bottom: 0.5rem; transform: rotate(-1.5deg); display: inline-block; }
    .section-title { font-family: var(--display); font-weight: 500; font-size: clamp(2rem, 4vw, 3.25rem); line-height: 1.15; letter-spacing: -0.02em; margin-bottom: 1.25rem; color: var(--ink); }
    .section-title em { font-style: italic; color: var(--primary); font-weight: 500; }
    .section-lead { color: var(--ink-2); font-size: 1.05rem; line-height: 1.75; max-width: 600px; }
    .section-head.center { text-align: center; }
    .section-head.center .section-lead { margin-inline: auto; }

    /* ─── Services grid ──────────────────────────────────── */
    .services-grid {
      display: grid; gap: 1.5rem; margin-top: 4rem;
      grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr));
    }
    @media (min-width: 880px) { .services-grid { grid-template-columns: repeat(3, 1fr); } }
    .service-card {
      background: var(--surface); border-radius: 24px;
      padding: 2.25rem 1.85rem; border: 1px solid var(--rule);
      transition: transform .25s ease, box-shadow .25s ease;
      position: relative; overflow: hidden;
    }
    .service-card::before {
      content: ""; position: absolute; top: 0; left: 0; right: 0; height: 4px;
      background: var(--primary); opacity: 0; transition: opacity .25s;
    }
    .service-card:hover { transform: translateY(-4px); box-shadow: 0 22px 48px -20px rgba(192,99,62,0.2); }
    .service-card:hover::before { opacity: 1; }
    .service-icon {
      width: 56px; height: 56px; border-radius: 50%;
      background: var(--primary-soft); color: var(--primary);
      display: grid; place-items: center; margin-bottom: 1.25rem;
    }
    .service-card h3 { font-family: var(--display); font-weight: 500; font-size: 1.4rem; line-height: 1.25; margin-bottom: 0.85rem; color: var(--ink); }
    .service-card p { color: var(--ink-2); font-size: 0.95rem; line-height: 1.7; }

    /* ─── Team ───────────────────────────────────────────── */
    .team-section { background: var(--bg-2); }
    .team-grid {
      display: grid; gap: 2rem; margin-top: 4rem;
      grid-template-columns: repeat(auto-fit, minmax(min(220px, 100%), 1fr));
    }
    @media (min-width: 880px) { .team-grid { grid-template-columns: repeat(4, 1fr); } }
    .team-card { background: var(--surface); border-radius: 24px; overflow: hidden; transition: transform .25s ease; }
    .team-card:hover { transform: translateY(-4px); }
    .team-photo { aspect-ratio: 1/1; overflow: hidden; }
    .team-photo img { width: 100%; height: 100%; object-fit: cover; transition: transform .8s ease; }
    .team-card:hover .team-photo img { transform: scale(1.05); }
    ${SYMBOLIC_TAG_CSS}
    .team-info { padding: 1.5rem 1.25rem 1.75rem; text-align: center; }
    .team-info h4 { font-family: var(--display); font-weight: 500; font-size: 1.2rem; line-height: 1.3; margin-bottom: 0.25rem; color: var(--ink); }
    .team-info .role { color: var(--primary); font-size: 0.9rem; font-weight: 600; margin-bottom: 0.5rem; }
    .team-info .specialty { color: var(--ink-3); font-size: 0.84rem; line-height: 1.5; }

    /* ─── Care quote / testimonial ───────────────────────── */
    .care-quote {
      background: linear-gradient(135deg, var(--primary), var(--primary-deep));
      color: #fff; padding: clamp(4rem, 7vw, 6rem) 1.5rem;
      text-align: center; position: relative; overflow: hidden;
    }
    .care-quote::before, .care-quote::after {
      content: ""; position: absolute; border-radius: 50%; opacity: 0.08;
      background: var(--accent);
    }
    .care-quote::before { top: -80px; left: -80px; width: 280px; height: 280px; }
    .care-quote::after { bottom: -60px; right: -60px; width: 220px; height: 220px; }
    .care-quote-inner { max-width: 800px; margin: 0 auto; position: relative; }
    .care-quote-eyebrow { font-family: var(--hand); font-size: 1.5rem; color: var(--accent); margin-bottom: 0.5rem; transform: rotate(-2deg); display: inline-block; }
    .care-quote-text { font-family: var(--display); font-weight: 400; font-style: italic; font-size: clamp(1.4rem, 3vw, 2rem); line-height: 1.45; }
    .care-quote-author { margin-top: 1.5rem; font-size: 0.95rem; color: rgba(255,255,255,0.78); }

    /* ─── Hours card ─────────────────────────────────────── */
    .hours-section { background: var(--bg); }
    .hours-card {
      max-width: 720px; margin: 4rem auto 0;
      background: var(--surface); border-radius: 24px;
      padding: 2.5rem; box-shadow: 0 20px 50px -25px rgba(45,31,23,0.18);
      border: 1px solid var(--rule);
    }
    .hours-row {
      display: flex; justify-content: space-between; align-items: baseline;
      padding: 0.85rem 0; border-bottom: 1px dashed var(--rule);
      font-size: 1rem;
    }
    .hours-row:last-child { border-bottom: none; }
    .hours-row .day { color: var(--ink); font-weight: 600; }
    .hours-row .hours { color: var(--ink-2); font-family: var(--display); }
    .hours-row.closed .hours { color: var(--primary); font-style: italic; }
    .hours-card .emergency-line {
      margin-top: 1.5rem; padding: 1.25rem; background: var(--secondary-soft);
      border-radius: 14px; text-align: center; color: var(--ink);
    }
    .hours-card .emergency-line strong { font-family: var(--display); display: block; font-size: 1.1rem; margin-bottom: 0.3rem; color: var(--secondary); }

    /* ─── Contact ────────────────────────────────────────── */
    .contact-section { background: var(--bg-2); }
    .contact-grid { max-width: 1100px; margin: 4rem auto 0; display: grid; gap: 1.25rem; grid-template-columns: repeat(auto-fit, minmax(min(220px, 100%), 1fr)); }
    .contact-card { background: var(--surface); border-radius: 22px; padding: 2rem 1.5rem; text-align: center; border: 1px solid var(--rule); }
    .contact-card .ic { width: 52px; height: 52px; margin: 0 auto 1rem; background: var(--primary-soft); color: var(--primary); border-radius: 50%; display: grid; place-items: center; }
    .contact-card .lbl { font-size: 0.78rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-3); font-weight: 700; margin-bottom: 0.5rem; }
    .contact-card .val { font-family: var(--display); font-size: 1.2rem; line-height: 1.4; color: var(--ink); }
    .contact-card a:hover { color: var(--primary); }

    footer { background: var(--ink); color: rgba(255,255,255,0.7); padding: 3rem 1.5rem; text-align: center; font-size: 0.9rem; }
    footer .brand { font-family: var(--display); font-size: 1.5rem; color: #fff; margin-bottom: 0.5rem; font-weight: 500; display: inline-flex; align-items: center; gap: 0.5rem; }
    footer .brand .paw { width: 28px; height: 28px; background: var(--primary); border-radius: 50%; display: inline-grid; place-items: center; font-size: 0.95rem; }
    footer .legal { display: flex; gap: 1.5rem; justify-content: center; margin-top: 1rem; flex-wrap: wrap; }
    footer .legal a:hover { color: var(--accent); }

    .reveal { opacity: 1; transform: none; }
    /* visible by default */
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
    <a class="brand-mark" href="#"><span class="brand-mark-paw">🐾</span>${businessName}</a>
    <input type="checkbox" id="nav-toggle" class="nav-toggle" aria-label="Menü öffnen" />
    <label for="nav-toggle" class="nav-burger" aria-hidden="true"><span></span></label>
    <nav class="main-nav">
      <a href="#leistungen">Leistungen</a>
      <a href="#team">Team</a>
      <a href="#zeiten">Sprechzeiten</a>
      <a href="#kontakt">Kontakt</a>
    </nav>
    <a href="#kontakt" class="nav-cta">${ctaText}</a>
  </div>
</header>

<section class="hero">
  <div class="hero-inner">
    <div class="reveal">
      <span class="hero-eyebrow">Mit Liebe & Sachverstand 🐾</span>
      <h1>${escapeHtml(headline.replace(/(\.|!|\?)([^.!?]*)$/, '|$1$2|')).replace(/\|([^|]+)\|/, '<em>$1</em>')}</h1>
      <p>${subhead}</p>
      <div class="hero-cta-row">
        <a href="#kontakt" class="btn-primary">${ctaText} →</a>
        <a href="#leistungen" class="btn-secondary">Leistungen ansehen</a>
      </div>
      <div class="hero-trust">
        <span class="hero-trust-stars">★★★★★</span>
        <span>4,9 / 5 aus 312 Bewertungen — Ihre Lieblinge in besten Händen.</span>
      </div>
    </div>

    <div class="hero-photo reveal">
      <img src="${petPhoto(spec, slug, 1, 800, 1000)}" alt="" loading="eager">
      <div class="hero-photo-badge">
        <div class="ic">🐾</div>
        <div>
          <div class="num">15.000+</div>
          <div class="lbl">Tiere behandelt</div>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="animals-strip">
  <div class="container">
    <div class="section-head center reveal" style="margin-bottom: 2.5rem;">
      <span class="section-eyebrow">Wen wir behandeln</span>
      <h2 class="section-title" style="margin-bottom: 0.5rem;">Für <em>jeden Liebling</em> da.</h2>
    </div>
    <div class="animals-grid">
      ${animals.map(a => `
        <div class="animal-card reveal">
          <div class="animal-icon">${a.icon}</div>
          <div class="label">${a.label}</div>
          <div class="detail">${a.detail}</div>
        </div>
      `).join('')}
    </div>
  </div>
</section>

<section id="leistungen" class="section">
  <div class="container">
    <div class="section-head center reveal">
      <span class="section-eyebrow">Unsere Leistungen</span>
      <h2 class="section-title">Tierärztliche Versorgung — <em>vom Welpen bis zum Senior</em>.</h2>
      <p class="section-lead">Moderne Diagnostik, persönliche Begleitung. Wir nehmen uns Zeit — für Ihr Tier und für Sie.</p>
    </div>
    <div class="services-grid">
      ${services.map(s => `
        <article class="service-card reveal">
          <div class="service-icon">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M11.5 2C9.6 2 8 3.6 8 5.5S9.6 9 11.5 9 15 7.4 15 5.5 13.4 2 11.5 2zm-7 7C2.6 9 1 10.6 1 12.5S2.6 16 4.5 16 8 14.4 8 12.5 6.4 9 4.5 9zm15 0C17.6 9 16 10.6 16 12.5s1.6 3.5 3.5 3.5S23 14.4 23 12.5 21.4 9 19.5 9zM12 12c-3 0-5 2-5 5 0 2 1 5 5 5s5-3 5-5c0-3-2-5-5-5z"/></svg>
          </div>
          <h3>${escapeHtml(s.name)}</h3>
          <p>${escapeHtml(s.description)}</p>
        </article>
      `).join('')}
    </div>
  </div>
</section>

<section class="care-quote reveal">
  <div class="care-quote-inner">
    <span class="care-quote-eyebrow">Unser Versprechen</span>
    <p class="care-quote-text">„Tiere können nicht sagen, was ihnen fehlt. Aber sie zeigen es — wenn man genau hinsieht und sich Zeit nimmt."</p>
    <div class="care-quote-author">— Dr. Anna Steiner, Praxis-Inhaberin</div>
  </div>
</section>

<section id="team" class="section team-section">
  <div class="container">
    <div class="section-head center reveal">
      <span class="section-eyebrow">Unser Team</span>
      <h2 class="section-title">Vier Hände, ein <em>Herz für Tiere</em>.</h2>
      <p class="section-lead">Erfahrene Tierärzt:innen und Assistent:innen — durchgängig fortgebildet, immer ansprechbar.</p>
    </div>
    <div class="team-grid">
      ${team.map((m, i) => `
        <article class="team-card reveal">
          <div class="team-photo avatar-symbolic-wrap"><img src="${vetPortrait(m.name)}" alt="${escapeHtml(m.name)}" loading="lazy"><span class="avatar-symbolic-tag">Symbolfoto</span></div>
          <div class="team-info">
            <h4>${escapeHtml(m.name)}</h4>
            <div class="role">${escapeHtml(m.role)}</div>
            <div class="specialty">${escapeHtml(m.specialty)}</div>
          </div>
        </article>
      `).join('')}
    </div>
  </div>
</section>

<section id="zeiten" class="section hours-section">
  <div class="container">
    <div class="section-head center reveal">
      <span class="section-eyebrow">Sprechzeiten</span>
      <h2 class="section-title">Wann wir <em>für Sie da</em> sind.</h2>
      <p class="section-lead">Termine bevorzugt nach Vereinbarung — bitte rufen Sie an, dann ist die Wartezeit kurz.</p>
    </div>
    <div class="hours-card reveal">
      <div class="hours-row"><span class="day">Montag</span><span class="hours">8:00 – 12:00 · 15:00 – 19:00</span></div>
      <div class="hours-row"><span class="day">Dienstag</span><span class="hours">8:00 – 12:00 · 15:00 – 19:00</span></div>
      <div class="hours-row"><span class="day">Mittwoch</span><span class="hours">8:00 – 12:00</span></div>
      <div class="hours-row"><span class="day">Donnerstag</span><span class="hours">8:00 – 12:00 · 15:00 – 20:00</span></div>
      <div class="hours-row"><span class="day">Freitag</span><span class="hours">8:00 – 14:00</span></div>
      <div class="hours-row closed"><span class="day">Samstag</span><span class="hours">nur Notfälle</span></div>
      <div class="hours-row closed"><span class="day">Sonntag</span><span class="hours">geschlossen</span></div>
      <div class="emergency-line">
        <strong>Notfall? Wir sind erreichbar.</strong>
        Außerhalb der Sprechzeiten verbinden wir Sie mit dem Bereitschaftsdienst.
      </div>
    </div>
  </div>
</section>

<section id="kontakt" class="section contact-section">
  <div class="container">
    <div class="section-head center reveal">
      <span class="section-eyebrow">Kontakt</span>
      <h2 class="section-title">Termin vereinbaren — <em>einfach &amp; persönlich</em>.</h2>
      <p class="section-lead">Wir freuen uns auf Sie und Ihren tierischen Begleiter.</p>
    </div>
    <div class="contact-grid">
      ${address ? `<div class="contact-card reveal">
        <div class="ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></div>
        <div class="lbl">Praxis-Adresse</div>
        <div class="val">${address}</div>
      </div>` : ''}
      ${phone ? `<div class="contact-card reveal">
        <div class="ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg></div>
        <div class="lbl">Anrufen</div>
        <div class="val"><a href="tel:${phone.replace(/\s/g, '')}">${phone}</a></div>
      </div>` : ''}
      ${email ? `<div class="contact-card reveal">
        <div class="ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></div>
        <div class="lbl">E-Mail</div>
        <div class="val"><a href="mailto:${email}?subject=${encodeURIComponent('Terminanfrage')}">${email}</a></div>
      </div>` : ''}
    </div>
  </div>
</section>

<footer>
  <div class="brand"><span class="paw">🐾</span>${businessName}</div>
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
