/**
 * Galerie / Kreativ template — full-bleed photo-led, dark canvas.
 * For photographers, videographers, tattoo studios, designers.
 * Visual is the product: massive imagery, minimal chrome, type as accent.
 */

import type { SiteSpec } from '../types.js';

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function workPhoto(slug: string, idx: number, w = 800, h = 1000): string {
  return `https://picsum.photos/seed/${encodeURIComponent(slug)}-work-${idx}/${w}/${h}`;
}

export function renderGaleriePage(spec: SiteSpec, slug: string): string {
  const businessName = escapeHtml(spec.business_name);
  const tagline = spec.tagline; // pre-escaped at use sites
  const headline = escapeHtml(spec.hero.headline);
  const subhead = escapeHtml(spec.hero.subheadline);
  const ctaText = escapeHtml(spec.hero.cta_text || 'Anfrage senden');

  const services = spec.services && spec.services.length >= 3 ? spec.services : [
    { name: 'Hochzeit', description: 'Reportage-Stil, ungestellt — wir fangen den Moment.' },
    { name: 'Portrait', description: 'Business, Bewerbung, Familie — im Studio oder bei Ihnen.' },
    { name: 'Produkt', description: 'Onlineshops, Kataloge, Werbekampagnen — mit oder ohne Models.' },
    { name: 'Event', description: 'Firmenfeiern, Vereinsfeste, Konferenzen — diskret, durchgehend.' },
    { name: 'Video', description: 'Imagefilme, Reels, Hochzeitsvideos — von der Idee bis zum Schnitt.' },
    { name: 'Workshop', description: 'Theorie + Praxis in kleinen Gruppen — alle Levels willkommen.' },
  ];

  const phone = spec.contact.phone ? escapeHtml(spec.contact.phone) : '';
  const email = spec.contact.email ? escapeHtml(spec.contact.email) : '';

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
  <meta name="theme-color" content="#0a0a0a" />
  <link rel="preconnect" href="https://fonts.bunny.net" crossorigin>
  <link href="https://fonts.bunny.net/css?family=fraunces:400,500,600,700,800,900|inter:400,500,600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0a0a0a;
      --surface: #141414;
      --ink: #f5f5f4;
      --ink-2: rgba(245,245,244,0.65);
      --ink-3: rgba(245,245,244,0.4);
      --rule: rgba(255,255,255,0.10);
      --accent: #e8c97a;       /* warm gold accent */
      --display: 'Fraunces', 'Georgia', serif;
      --sans: 'Inter', system-ui, sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body { background: var(--bg); color: var(--ink); font-family: var(--sans); line-height: 1.6; -webkit-font-smoothing: antialiased; overflow-x: hidden; }
    img { display: block; max-width: 100%; }
    a { color: inherit; text-decoration: none; }

    .demo-banner { background: #1e0a25; color:#fff; padding:0.55rem 1rem; font-size:0.82rem; position: relative; z-index: 200; border-bottom: 1px solid rgba(236,101,186,0.35); }
    .demo-banner-inner { max-width: 1280px; margin: 0 auto; display: flex; align-items: center; gap: 0.85rem; flex-wrap: wrap; justify-content: center; }
    .demo-banner-tag { font-size: 0.7rem; letter-spacing: 0.16em; text-transform: uppercase; padding: 0.18rem 0.55rem; border-radius: 999px; background: rgba(236,101,186,0.22); border: 1px solid rgba(236,101,186,0.5); color: #ffd6ee; font-weight: 700; white-space: nowrap; }
    .demo-banner a { color: #ffb3df; font-weight: 700; border-bottom: 1px solid rgba(255,179,223,0.45); }

    /* ─── Header (overlays hero) ─────────────────────────── */
    .site-header {
      position: absolute; top: 33px; left: 0; right: 0; z-index: 30;
      padding: 1.5rem 2rem;
    }
    .header-inner {
      display: flex; align-items: center; justify-content: space-between; gap: 2rem;
      max-width: 1400px; margin: 0 auto;
    }
    .brand-mark {
      font-family: var(--display); font-weight: 600;
      font-size: 1.4rem; letter-spacing: -0.01em; color: var(--ink);
    }
    .main-nav { display: none; gap: 2.5rem; font-size: 0.85rem; font-weight: 500; letter-spacing: 0.04em; }
    .main-nav a { color: var(--ink); opacity: 0.85; transition: opacity .2s; text-transform: uppercase; }
    .main-nav a:hover { opacity: 1; }
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
        background: var(--bg, #fff);
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

    /* ─── Hero — full-bleed photo + overlaid type ────────── */
    .hero {
      position: relative; min-height: 100vh; min-height: 100svh;
      display: grid; grid-template-rows: 1fr auto;
      isolation: isolate;
    }
    .hero-img { position: absolute; inset: 0; z-index: -2; background-size: cover; background-position: center; }
    .hero::after { content: ''; position: absolute; inset: 0; z-index: -1; background: linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.7) 100%); }
    .hero-text {
      align-self: end; padding: 0 2rem 6rem; max-width: 1400px; margin: 0 auto; width: 100%;
    }
    .hero-eyebrow {
      font-size: 0.78rem; letter-spacing: 0.24em; text-transform: uppercase;
      color: var(--accent); font-weight: 600;
      margin-bottom: 1.5rem;
    }
    .hero-text h1 {
      font-family: var(--display); font-weight: 500;
      font-size: clamp(2.75rem, 8vw, 7rem); line-height: 0.95; letter-spacing: -0.04em;
      max-width: 14ch;
    }
    .hero-text h1 em { font-style: italic; font-weight: 400; }
    .hero-text p { color: var(--ink-2); font-size: clamp(1rem, 1.3vw, 1.2rem); max-width: 540px; margin-top: 1.75rem; line-height: 1.65; }
    .hero-text .ctas { margin-top: 2.5rem; display: flex; gap: 1.25rem; flex-wrap: wrap; }
    .btn-primary {
      background: var(--ink); color: var(--bg);
      padding: 1rem 1.85rem; font-weight: 600; font-size: 0.9rem; letter-spacing: 0.04em;
      transition: transform .25s;
    }
    .btn-primary:hover { transform: translate(2px, -2px); }
    .btn-ghost {
      background: transparent; color: var(--ink); border: 1px solid rgba(255,255,255,0.4);
      padding: 1rem 1.85rem; font-weight: 500; font-size: 0.9rem; letter-spacing: 0.04em;
      transition: background .2s, border-color .2s;
    }
    .btn-ghost:hover { background: rgba(255,255,255,0.1); border-color: var(--ink); }
    .scroll-hint {
      grid-row: 2; align-self: end; justify-self: center;
      padding-bottom: 2rem;
      font-size: 0.7rem; letter-spacing: 0.3em; text-transform: uppercase; color: var(--ink-3);
      animation: bob 2.5s ease-in-out infinite;
    }
    @keyframes bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(8px); } }

    /* ─── Featured work grid ─────────────────────────────── */
    .work-section { padding: clamp(5rem, 9vw, 9rem) 0 4rem; }
    .work-head {
      max-width: 1400px; margin: 0 auto 5rem; padding: 0 2rem;
      display: grid; gap: 1rem;
    }
    @media (min-width: 700px) { .work-head { grid-template-columns: 1fr 1fr; align-items: end; } }
    .work-eyebrow { font-size: 0.78rem; letter-spacing: 0.22em; text-transform: uppercase; color: var(--accent); font-weight: 600; }
    .work-title {
      font-family: var(--display); font-weight: 400;
      font-size: clamp(2.5rem, 5vw, 4.5rem); line-height: 1; letter-spacing: -0.025em;
      margin-top: 1rem;
    }
    .work-title em { font-style: italic; }
    .work-lead { color: var(--ink-2); font-size: 1.05rem; max-width: 520px; line-height: 1.7; }

    /* Asymmetric tile layout — rows of mixed sizes */
    .work-grid { padding: 0 2rem; max-width: 1400px; margin: 0 auto; }
    .work-row {
      display: grid; gap: 1.25rem; margin-bottom: 1.25rem;
    }
    .work-row.r1 { grid-template-columns: 2fr 1fr; }
    .work-row.r2 { grid-template-columns: 1fr 1fr 1fr; }
    .work-row.r3 { grid-template-columns: 1fr 2fr; }
    @media (max-width: 700px) {
      .work-row.r1, .work-row.r2, .work-row.r3 { grid-template-columns: 1fr 1fr; }
    }
    .tile {
      position: relative; overflow: hidden;
      transition: transform .5s var(--easing, ease);
    }
    .tile-img { width: 100%; height: 100%; object-fit: cover; transition: transform 1s ease, filter 0.6s ease; aspect-ratio: 4/5; filter: brightness(0.95); }
    .tile:hover .tile-img { transform: scale(1.04); filter: brightness(1.05); }
    .tile.tall .tile-img { aspect-ratio: 4/6; }
    .tile.wide .tile-img { aspect-ratio: 16/10; }
    .tile-caption {
      position: absolute; left: 1.25rem; bottom: 1.25rem; right: 1.25rem;
      color: #fff; opacity: 0; transform: translateY(8px); transition: opacity .4s, transform .4s;
    }
    .tile:hover .tile-caption { opacity: 1; transform: translateY(0); }
    .tile-caption .cat { font-size: 0.72rem; letter-spacing: 0.22em; text-transform: uppercase; opacity: 0.85; }
    .tile-caption .ttl { font-family: var(--display); font-size: 1.5rem; font-weight: 500; margin-top: 0.25rem; }

    /* ─── Services — minimal list ────────────────────────── */
    .services-section { padding: clamp(6rem, 10vw, 10rem) 2rem; background: var(--surface); border-top: 1px solid var(--rule); border-bottom: 1px solid var(--rule); }
    .services-inner { max-width: 1100px; margin: 0 auto; display: grid; gap: 4rem; }
    @media (min-width: 880px) { .services-inner { grid-template-columns: 1fr 1.6fr; gap: 6rem; } }
    .services-list .row { padding: 1.6rem 0; border-bottom: 1px solid var(--rule); display: grid; grid-template-columns: 1fr 2fr; gap: 2rem; align-items: baseline; }
    .services-list .row:first-child { border-top: 1px solid var(--rule); }
    .services-list .name { font-family: var(--display); font-weight: 500; font-size: 1.4rem; line-height: 1.2; }
    .services-list .desc { color: var(--ink-2); font-size: 0.95rem; line-height: 1.65; }
    .services-headline {
      font-family: var(--display); font-weight: 400;
      font-size: clamp(2rem, 4vw, 3rem); line-height: 1.1; letter-spacing: -0.02em;
    }
    .services-headline em { font-style: italic; color: var(--accent); }
    .services-lead { color: var(--ink-2); margin-top: 1.5rem; line-height: 1.75; max-width: 360px; }

    /* ─── About / quote ─────────────────────────────────── */
    .about-section { padding: clamp(6rem, 10vw, 10rem) 2rem; }
    .about-inner { max-width: 760px; margin: 0 auto; text-align: center; }
    .about-eyebrow { font-size: 0.78rem; letter-spacing: 0.24em; text-transform: uppercase; color: var(--accent); font-weight: 600; margin-bottom: 1.5rem; }
    .about-quote {
      font-family: var(--display); font-weight: 400; font-style: italic;
      font-size: clamp(1.75rem, 3vw, 2.5rem); line-height: 1.4;
    }
    .about-body { color: var(--ink-2); margin-top: 2.5rem; font-size: 1rem; line-height: 1.8; max-width: 600px; margin-inline: auto; }

    /* ─── Contact ───────────────────────────────────────── */
    .contact-section {
      padding: clamp(6rem, 10vw, 10rem) 2rem;
      background-image: linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.85)), url('${workPhoto(slug, 99, 1800, 1200)}');
      background-size: cover; background-position: center;
      text-align: center;
    }
    .contact-section h2 {
      font-family: var(--display); font-weight: 400;
      font-size: clamp(2.5rem, 5vw, 4rem); line-height: 1.1; letter-spacing: -0.02em;
      max-width: 16ch; margin: 0 auto 2rem;
    }
    .contact-section h2 em { font-style: italic; color: var(--accent); }
    .contact-section p { color: var(--ink-2); max-width: 520px; margin: 0 auto 2.5rem; line-height: 1.7; font-size: 1.05rem; }
    .contact-info { display: flex; gap: 2.5rem; justify-content: center; flex-wrap: wrap; margin-bottom: 2.5rem; font-size: 0.95rem; }
    .contact-info a { color: var(--ink); opacity: 0.85; transition: opacity .2s, color .2s; }
    .contact-info a:hover { opacity: 1; color: var(--accent); }

    /* ─── Footer ────────────────────────────────────────── */
    footer { background: #050505; color: var(--ink-3); padding: 3rem 2rem; text-align: center; font-size: 0.82rem; }
    footer .brand { font-family: var(--display); font-size: 1.25rem; color: var(--ink); margin-bottom: 0.4rem; }
    footer .legal { display: flex; gap: 1.5rem; justify-content: center; margin-top: 1rem; flex-wrap: wrap; }
    footer .legal a:hover { color: var(--accent); }

    .reveal { opacity: 0; transform: translateY(24px); transition: opacity 1s ease, transform 1s ease; }
    .reveal.is-visible { opacity: 1; transform: translateY(0); }
    @media (prefers-reduced-motion: reduce) { .reveal { opacity: 1 !important; transform: none !important; } .scroll-hint { animation: none; } }
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
    <a class="brand-mark" href="#">${businessName}</a>
    <input type="checkbox" id="nav-toggle" class="nav-toggle" aria-label="Menü öffnen" />
    <label for="nav-toggle" class="nav-burger" aria-hidden="true"><span></span></label>
    <nav class="main-nav">
      <a href="#work">Arbeiten</a>
      <a href="#services">Leistungen</a>
      <a href="#about">Über</a>
      <a href="#kontakt">Kontakt</a>
    </nav>
  </div>
</header>

<section class="hero">
  <div class="hero-img" style="background-image: url('${workPhoto(slug, 0, 1800, 1200)}');"></div>
  <div class="hero-text">
    <div class="hero-eyebrow">${escapeHtml(tagline.slice(0, 80))}</div>
    <h1>${headline.replace(/(\.|\?|!)([^.?!]*)$/, '<em>$1$2</em>')}</h1>
    <p>${subhead}</p>
    <div class="ctas">
      <a href="#kontakt" class="btn-primary">${ctaText}</a>
      <a href="#work" class="btn-ghost">Arbeiten ansehen</a>
    </div>
  </div>
  <div class="scroll-hint">Scrollen</div>
</section>

<section id="work" class="work-section">
  <div class="work-head reveal">
    <div>
      <div class="work-eyebrow">Ausgewählte Arbeiten</div>
      <h2 class="work-title">Ausschnitte aus dem <em>Portfolio</em>.</h2>
    </div>
    <p class="work-lead">Eine Auswahl aktueller Projekte. Ob Hochzeit, Portrait oder Markenfilm — der Ansatz ist immer derselbe: zuhören, beobachten, das Wesentliche festhalten.</p>
  </div>

  <div class="work-grid">
    <div class="work-row r1">
      <a href="#kontakt" class="tile wide reveal"><img class="tile-img" src="${workPhoto(slug, 1, 1200, 750)}" alt="" loading="lazy">
        <div class="tile-caption"><div class="cat">Hochzeit</div><div class="ttl">Sophie & Daniel</div></div>
      </a>
      <a href="#kontakt" class="tile reveal"><img class="tile-img" src="${workPhoto(slug, 2)}" alt="" loading="lazy">
        <div class="tile-caption"><div class="cat">Portrait</div><div class="ttl">Editorial</div></div>
      </a>
    </div>
    <div class="work-row r2">
      <a href="#kontakt" class="tile reveal"><img class="tile-img" src="${workPhoto(slug, 3)}" alt="" loading="lazy">
        <div class="tile-caption"><div class="cat">Produkt</div><div class="ttl">Kollektion 24</div></div>
      </a>
      <a href="#kontakt" class="tile tall reveal"><img class="tile-img" src="${workPhoto(slug, 4)}" alt="" loading="lazy">
        <div class="tile-caption"><div class="cat">Event</div><div class="ttl">Im Hintergrund</div></div>
      </a>
      <a href="#kontakt" class="tile reveal"><img class="tile-img" src="${workPhoto(slug, 5)}" alt="" loading="lazy">
        <div class="tile-caption"><div class="cat">Architektur</div><div class="ttl">Lichtspiele</div></div>
      </a>
    </div>
    <div class="work-row r3">
      <a href="#kontakt" class="tile reveal"><img class="tile-img" src="${workPhoto(slug, 6)}" alt="" loading="lazy">
        <div class="tile-caption"><div class="cat">Portrait</div><div class="ttl">Studio</div></div>
      </a>
      <a href="#kontakt" class="tile wide reveal"><img class="tile-img" src="${workPhoto(slug, 7, 1200, 750)}" alt="" loading="lazy">
        <div class="tile-caption"><div class="cat">Marke</div><div class="ttl">Imagefilm</div></div>
      </a>
    </div>
  </div>
</section>

<section id="services" class="services-section">
  <div class="services-inner">
    <div class="reveal">
      <div class="work-eyebrow">Leistungen</div>
      <h2 class="services-headline">Sechs Disziplinen, <em>ein Blick</em>.</h2>
      <p class="services-lead">Von der spontanen Reportage bis zur durchchoreografierten Kampagne — der gleiche Anspruch an Präzision und Zeit.</p>
    </div>
    <div class="services-list">
      ${services.map(s => `
        <div class="row reveal">
          <div class="name">${escapeHtml(s.name)}</div>
          <div class="desc">${escapeHtml(s.description)}</div>
        </div>
      `).join('')}
    </div>
  </div>
</section>

<section id="about" class="about-section">
  <div class="about-inner reveal">
    <div class="about-eyebrow">Über uns</div>
    <p class="about-quote">„Ein gutes Bild lügt nicht — es zeigt, was war, und lässt Raum für das, was kommt."</p>
    <p class="about-body">${escapeHtml(spec.about.body)}</p>
  </div>
</section>

<section id="kontakt" class="contact-section">
  <div class="reveal">
    <div class="work-eyebrow">Kontakt</div>
    <h2>Lassen Sie uns über Ihr <em>Projekt</em> sprechen.</h2>
    <p>Hochzeit, Portrait, Marke oder Event — schreiben Sie uns, was Sie geplant haben. Wir antworten innerhalb eines Werktags.</p>
    <div class="contact-info">
      ${email ? `<a href="mailto:${email}?subject=${encodeURIComponent('Anfrage')}">${email}</a>` : ''}
      ${phone ? `<a href="tel:${phone.replace(/\s/g, '')}">${phone}</a>` : ''}
    </div>
    ${email ? `<a href="mailto:${email}?subject=${encodeURIComponent('Anfrage')}" class="btn-primary">Anfrage senden</a>` : ''}
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
  }, { threshold: 0.05, rootMargin: '0px 0px -40px' });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
</script>
</body>
</html>
`;
}
