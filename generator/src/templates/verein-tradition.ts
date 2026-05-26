/**
 * Tradition-Verein-Template — Trachten / Schützen / Feuerwehr / Heimat.
 *
 * Visually distinct from verein-musik (warm) and verein-sport (bold):
 * - Old-style serif (Cinzel) for headlines + Lora body
 * - Burgundy/oxblood + parchment + brushed gold accents
 * - Decorative flourishes on section headers
 * - Coat-of-arms placeholder for crest, formal nav
 *
 * No invented content: every section gates on real spec data.
 */

import type { SiteSpec } from '../types.js';
import { getGalleryImage, getHeroImage, hasHeroImage, hasGalleryImages, galleryCount, getLogo, getFavicon } from './_media.js';
import { renderSeoHead } from './_seo.js';
import {
  escapeHtml,
  extractFoundedYear,
  buildMarqueeItems,
  pickPullQuote,
  extractBoardMembers,
  extractEvents,
  renderMarquee,
  renderPullQuote,
  renderStoriesGrid,
  renderSocialStrip,
  renderRatingPill,
  renderBoardSection,
  renderEventsSection,
  renderHeritageStatement,
  EDITORIAL_CSS,
} from './_editorial.js';

export function renderVereinTraditionPage(spec: SiteSpec, slug: string): string {
  const businessName = escapeHtml(spec.business_name);
  const tagline = spec.tagline;
  const headline = spec.hero.headline;
  const subhead = escapeHtml(spec.hero.subheadline);
  const ctaText = escapeHtml(spec.hero.cta_text || 'Beitreten');

  const phone = spec.contact.phone ? escapeHtml(spec.contact.phone) : '';
  const email = spec.contact.email ? escapeHtml(spec.contact.email) : '';
  const address = spec.contact.address ? escapeHtml(spec.contact.address) : '';

  const events = (spec.events && spec.events.length > 0)
    ? spec.events.slice(0, 5)
    : extractEvents(spec);
  const services = spec.services && spec.services.length > 0 ? spec.services.slice(0, 6) : [];
  const testimonials = spec.testimonials && spec.testimonials.length > 0 ? spec.testimonials.slice(0, 3) : [];

  // Editorial helpers
  const foundedYear = extractFoundedYear(spec);
  const marqueeItems = buildMarqueeItems(spec, foundedYear);
  const pullQuote = pickPullQuote(spec);
  const board = extractBoardMembers(spec);

  const primary = spec.brand?.primary_color || '#7c2d12';
  const secondary = spec.brand?.secondary_color || primary;
  const accent = spec.brand?.accent_color || '#b89968';
  const headingFont = spec.brand?.heading_font_family
    ? `'${spec.brand.heading_font_family}', 'Cinzel', 'Times New Roman', serif`
    : "'Cinzel', 'Times New Roman', serif";
  const bodyFont = spec.brand?.body_font_family
    ? `'${spec.brand.body_font_family}', 'Lora', Georgia, serif`
    : "'Lora', Georgia, serif";
  const fontImportTags = (spec.brand?.font_imports && spec.brand.font_imports.length > 0)
    ? spec.brand.font_imports.map(u => `<link rel="stylesheet" href="${u}" crossorigin>`).join('\n  ')
    : `<link rel="preconnect" href="https://fonts.bunny.net" crossorigin>
  <link href="https://fonts.bunny.net/css?family=cinzel:400,500,600,700|lora:400,500,600,700&display=swap" rel="stylesheet">`;

  return `---
---
<!DOCTYPE html>
<html lang="de">
<head>
  ${renderSeoHead(spec, { slug, schemaKind: 'LocalBusiness' })}
  ${fontImportTags}
  <style is:global>
    :root {
      --primary: ${escapeHtml(primary)};
      --primary-deep: color-mix(in oklch, ${escapeHtml(primary)} 70%, black);
      --secondary: ${escapeHtml(secondary)};
      --gold: ${escapeHtml(accent)};
      --gold-deep: color-mix(in oklch, ${escapeHtml(accent)} 70%, black);
      --bg: #faf6ed;
      --bg-2: #f0e9d6;
      --surface: #ffffff;
      --ink: #1f1410;
      --ink-2: #4a3a2c;
      --ink-3: #8a7c68;
      --rule: rgba(31,20,16,0.12);
      --display: ${headingFont};
      --serif: ${bodyFont};
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body { background: var(--bg); color: var(--ink); font-family: var(--serif); line-height: 1.7; -webkit-font-smoothing: antialiased; overflow-x: hidden; }
    img { display: block; max-width: 100%; }
    a { color: inherit; text-decoration: none; }
    h1, h2, h3 { font-family: var(--display); font-weight: 600; line-height: 1.15; letter-spacing: 0.005em; }
    em { font-style: italic; color: var(--primary); }
    .container { max-width: 1200px; margin: 0 auto; padding: 0 1.5rem; }
    .section { padding: clamp(4.5rem, 9vw, 8rem) 0; }
    .section-eyebrow { display: inline-block; font-family: var(--display); font-size: 0.75rem; letter-spacing: 0.32em; text-transform: uppercase; color: var(--gold-deep); margin-bottom: 1.25rem; font-weight: 600; }
    .section-eyebrow::before, .section-eyebrow::after { content: '✦'; margin: 0 0.7rem; opacity: 0.6; }
    .section-title { font-size: clamp(2.2rem, 4.5vw, 3.4rem); color: var(--ink); margin-bottom: 1.5rem; }
    .section-lead { font-size: 1.05rem; color: var(--ink-2); max-width: 680px; }
    .section-head.center { text-align: center; }
    .section-head.center .section-lead { margin: 0 auto; }
    .section-head { margin-bottom: 4rem; }

    /* Demo banner */
    .demo-banner { background: #1a0a1f; color:#fff; padding:0.55rem 1rem; font-size:0.82rem; position: sticky; top: 0; z-index: 200; border-bottom: 1px solid rgba(236,101,186,0.35); }
    .demo-banner-inner { max-width: 1280px; margin: 0 auto; display: flex; align-items: center; gap: 0.85rem; flex-wrap: wrap; justify-content: center; }
    .demo-banner-tag { font-size: 0.7rem; letter-spacing: 0.16em; text-transform: uppercase; padding: 0.18rem 0.55rem; border-radius: 999px; background: rgba(236,101,186,0.22); border: 1px solid rgba(236,101,186,0.5); color: #ffd6ee; font-weight: 700; white-space: nowrap; }
    .demo-banner a { color: #ffb3df; font-weight: 700; border-bottom: 1px solid rgba(255,179,223,0.45); }

    /* Nav */
    .nav { background: var(--bg); border-bottom: 1px solid var(--rule); padding: 1.4rem 1.5rem; position: relative; }
    .nav-inner { max-width: 1200px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 2rem; }
    .brand-mark { display: inline-flex; align-items: center; gap: 0.85rem; }
    .brand-logo { width: 50px; height: 50px; object-fit: contain; }
    .brand-crest { width: 50px; height: 50px; border-radius: 50%; background: var(--primary); display: inline-flex; align-items: center; justify-content: center; color: var(--gold); font-family: var(--display); font-weight: 700; font-size: 1.05rem; border: 2px solid var(--gold); }
    .brand-name { font-family: var(--display); font-weight: 600; font-size: 1.15rem; letter-spacing: 0.04em; color: var(--ink); }
    .main-nav { display: none; gap: 2.25rem; font-family: var(--display); font-size: 0.78rem; letter-spacing: 0.16em; text-transform: uppercase; }
    .main-nav a { color: var(--ink-2); transition: color .25s; font-weight: 500; }
    .main-nav a:hover { color: var(--primary); }
    @media (min-width: 880px) { .main-nav { display: flex; } }
    /* Mobile burger */
    .nav-toggle { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
    .nav-toggle:focus-visible ~ .nav-burger { outline: 2px solid currentColor; outline-offset: 3px; }
    .nav-burger { display: none; cursor: pointer; width: 44px; height: 44px; align-items: center; justify-content: center; border-radius: 4px; background: transparent; border: 1px solid var(--rule); flex-shrink: 0; color: var(--ink); }
    .nav-burger span { display: block; width: 18px; height: 2px; background: currentColor; border-radius: 2px; position: relative; transition: transform .25s, background .2s; }
    .nav-burger span::before, .nav-burger span::after { content: ""; position: absolute; left: 0; width: 18px; height: 2px; background: currentColor; border-radius: 2px; transition: transform .25s, top .25s; }
    .nav-burger span::before { top: -6px; }
    .nav-burger span::after  { top:  6px; }
    .nav-toggle:checked ~ .nav-burger span { background: transparent; }
    .nav-toggle:checked ~ .nav-burger span::before { top: 0; transform: rotate(45deg); }
    .nav-toggle:checked ~ .nav-burger span::after  { top: 0; transform: rotate(-45deg); }
    @media (max-width: 879px) {
      .nav-burger { display: inline-flex; }
      .main-nav {
        position: absolute; top: 100%; left: 0; right: 0;
        display: flex; flex-direction: column; gap: 0; align-items: stretch;
        background: var(--bg); border-bottom: 1px solid var(--rule);
        box-shadow: 0 14px 30px -16px rgba(0,0,0,0.18);
        padding: 0.25rem 1.5rem 1rem;
        transform: translateY(-12px); opacity: 0; pointer-events: none;
        transition: transform .25s, opacity .25s;
        font-size: 0.95rem; letter-spacing: 0.16em;
      }
      .main-nav a { padding: 0.95rem 0; border-bottom: 1px solid var(--rule); min-height: 44px; display: flex; align-items: center; }
      .main-nav a:last-child { border-bottom: none; }
      .nav-toggle:checked ~ .main-nav { transform: translateY(0); opacity: 1; pointer-events: auto; }
    }

    /* Hero */
    .hero {
      position: relative; min-height: clamp(620px, 86vh, 800px);
      ${hasHeroImage(spec)
        ? `background:
        linear-gradient(135deg, rgba(31,20,16,0.5) 0%, rgba(31,20,16,0.85) 100%),
        url('${getHeroImage(spec, slug)}') center/cover;`
        : `background:
        radial-gradient(ellipse at 80% 20%, rgba(184,153,104,0.16) 0%, transparent 50%),
        linear-gradient(135deg, #1f1410 0%, #4a2a1a 50%, #1a0e08 100%);`
      }
      display: flex; align-items: center; padding: 5rem 1.5rem; color: #fff;
    }
    .hero::before { content: ''; position: absolute; top: 24px; left: 24px; right: 24px; bottom: 24px; border: 1px solid rgba(184,153,104,0.4); pointer-events: none; }
    .hero-inner { max-width: 1200px; margin: 0 auto; width: 100%; position: relative; }
    .hero-eyebrow { font-family: var(--display); font-size: 0.78rem; letter-spacing: 0.32em; text-transform: uppercase; color: var(--gold); font-weight: 600; margin-bottom: 1.75rem; display: inline-flex; align-items: center; gap: 0.7rem; }
    .hero-eyebrow::before, .hero-eyebrow::after { content: '—'; opacity: 0.6; }
    .hero h1 { font-size: clamp(2.8rem, 6vw, 4.6rem); font-weight: 600; line-height: 1.1; max-width: 18ch; margin-bottom: 1.5rem; }
    .hero-sub { font-size: 1.1rem; max-width: 56ch; color: rgba(255,255,255,0.92); margin-bottom: 2.25rem; font-weight: 400; }
    .hero-actions { display: flex; gap: 1rem; flex-wrap: wrap; }
    .btn-primary, .btn-ghost { display: inline-flex; align-items: center; gap: 0.6rem; padding: 1rem 2.25rem; font-family: var(--display); font-weight: 500; font-size: 0.92rem; letter-spacing: 0.1em; text-transform: uppercase; border: 1px solid; transition: all .2s; }
    .btn-primary { background: var(--gold); color: var(--ink); border-color: var(--gold); }
    .btn-primary:hover { background: var(--gold-deep); color: #fff; border-color: var(--gold-deep); }
    .btn-ghost { background: transparent; color: #fff; border-color: rgba(255,255,255,0.6); }
    .btn-ghost:hover { background: rgba(255,255,255,0.1); border-color: #fff; }

    /* About */
    .about { background: var(--bg); }
    .about-grid { display: grid; gap: 4rem; align-items: center; }
    @media (min-width: 920px) { .about-grid { grid-template-columns: 1fr 1.1fr; gap: 5rem; } }
    .about-image { position: relative; aspect-ratio: 4/5; overflow: hidden; }
    .about-image img { width: 100%; height: 100%; object-fit: cover; }
    .about-image::after { content: ''; position: absolute; inset: 0; border: 1px solid var(--gold); margin: 12px; pointer-events: none; }
    .about-text h2 { font-size: clamp(2.2rem, 4.5vw, 3.4rem); margin-bottom: 1.75rem; }
    .about-text p { color: var(--ink-2); margin-bottom: 1.25rem; max-width: 60ch; font-size: 1.05rem; }

    /* Services */
    .services { background: var(--bg-2); position: relative; }
    .services-grid { display: grid; gap: 1.5rem; grid-template-columns: 1fr; }
    @media (min-width: 720px) { .services-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (min-width: 1080px) { .services-grid { grid-template-columns: repeat(3, 1fr); } }
    .svc-card { background: var(--surface); padding: 2.25rem 2rem; border: 1px solid var(--rule); transition: border-color .25s; }
    .svc-card:hover { border-color: var(--gold); }
    .svc-num { font-family: var(--display); font-size: 1.4rem; color: var(--gold-deep); font-weight: 600; margin-bottom: 1rem; letter-spacing: 0.04em; }
    .svc-name { font-family: var(--display); font-size: 1.35rem; margin-bottom: 0.75rem; color: var(--ink); }
    .svc-desc { font-size: 0.97rem; color: var(--ink-2); }

    /* Events */
    .events { background: var(--ink); color: var(--bg); }
    .events-list { max-width: 920px; margin: 0 auto; }
    .event-row { display: grid; grid-template-columns: 130px 1fr; gap: 2.5rem; padding: 2rem 0; border-bottom: 1px solid rgba(255,255,255,0.1); align-items: start; }
    .event-row:last-child { border-bottom: none; }
    .event-date { font-family: var(--display); font-size: 0.95rem; color: var(--gold); letter-spacing: 0.16em; text-transform: uppercase; padding-top: 0.4rem; }
    .event-info h3 { font-family: var(--display); font-size: 1.4rem; color: #fff; margin-bottom: 0.5rem; font-weight: 500; }
    .event-info p { color: rgba(255,255,255,0.72); font-size: 0.97rem; }

    /* Gallery */
    .gallery { background: var(--bg); }
    .gallery-grid { display: grid; gap: 0.5rem; grid-template-columns: 1fr; }
    @media (min-width: 720px) { .gallery-grid { grid-template-columns: repeat(3, 1fr); } }
    .gallery-tile { aspect-ratio: 4/3; overflow: hidden; }
    .gallery-tile img { width: 100%; height: 100%; object-fit: cover; transition: transform 1s ease; filter: sepia(8%) saturate(0.95); }
    .gallery-tile:hover img { transform: scale(1.04); filter: sepia(0%) saturate(1); }

    /* Testimonials */
    .testimonials-section { background: var(--bg-2); }
    .test-grid { display: grid; gap: 2rem; grid-template-columns: 1fr; max-width: 1080px; margin: 0 auto; }
    @media (min-width: 880px) { .test-grid { grid-template-columns: repeat(3, 1fr); } }
    .test-card { padding: 2.5rem 2rem; background: var(--surface); border-top: 2px solid var(--gold); }
    .test-quote { font-family: var(--display); font-size: 1.18rem; font-style: italic; color: var(--ink); line-height: 1.5; margin-bottom: 1.5rem; }
    .test-author { font-size: 0.85rem; color: var(--ink-3); letter-spacing: 0.06em; }

    /* Contact */
    .contact { background: var(--ink); color: var(--bg); padding: clamp(4.5rem, 9vw, 7rem) 1.5rem; }
    .contact-grid { display: grid; gap: 3rem; max-width: 1080px; margin: 0 auto; }
    @media (min-width: 720px) { .contact-grid { grid-template-columns: 1fr 1fr; gap: 4rem; } }
    .contact-block h3 { font-family: var(--display); font-size: 0.85rem; letter-spacing: 0.22em; text-transform: uppercase; color: var(--gold); margin-bottom: 1.25rem; font-weight: 500; }
    .contact-block p { color: rgba(255,255,255,0.85); font-size: 1.05rem; line-height: 1.6; }
    .contact-block a { color: var(--gold); }
    .contact-block a:hover { color: #fff; }
    .contact-cta { display: inline-flex; padding: 1rem 2.25rem; background: var(--gold); color: var(--ink); font-family: var(--display); font-weight: 500; font-size: 0.92rem; letter-spacing: 0.1em; text-transform: uppercase; margin-top: 1.5rem; transition: all .2s; }
    .contact-cta:hover { background: #fff; }

    /* Footer */
    .footer { background: #0f0907; color: rgba(255,255,255,0.55); padding: 2.5rem 1.5rem; font-size: 0.85rem; border-top: 1px solid rgba(184,153,104,0.2); }
    .footer-inner { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 1.5rem; }
    .footer a { color: var(--gold); }

    /* Reveal */
    .reveal { opacity: 1; transform: none; }
    /* removed: see .reveal */
    @media (prefers-reduced-motion: reduce) { .reveal { opacity: 1; transform: none; transition: none; } .gallery-tile img { transition: none; } }

    /* Token mapping: editorial CSS expects --primary-deep + --ink-2,
       tradition declares only --ink (single colour) — alias here. */
    :root {
      --primary-deep: color-mix(in oklch, var(--primary) 70%, black);
      --ink-2: var(--ink-2, var(--ink));
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

  <nav class="nav">
    <div class="nav-inner">
      <a class="brand-mark" href="#">
        ${getLogo(spec)
          ? `<img class="brand-logo" src="${escapeHtml(getLogo(spec)!)}" alt="${businessName} Logo" width="50" height="50" />`
          : `<span class="brand-crest">${escapeHtml(spec.business_name.split(/\s+/).map(w => w[0] || '').slice(0, 2).join('').toUpperCase() || 'V')}</span>`
        }
        <span class="brand-name">${businessName}</span>
      </a>
      <input type="checkbox" id="nav-toggle" class="nav-toggle" aria-hidden="true" tabindex="-1">
      <label for="nav-toggle" class="nav-burger" aria-label="Menü öffnen"><span></span></label>
      <div class="main-nav">
        ${services.length > 0 ? '<a href="#angebot">Angebot</a>' : ''}
        ${events.length > 0 ? '<a href="#termine">Termine</a>' : ''}
        <a href="#kontakt">Kontakt</a>
      </div>
    </div>
  </nav>

  <section class="hero">
    <div class="hero-inner">
      <span class="hero-eyebrow">${escapeHtml(tagline)}</span>
      <h1>${escapeHtml(headline)}</h1>
      <p class="hero-sub">${subhead}</p>
      ${renderRatingPill(spec)}
      <div class="hero-actions">
        <a href="#kontakt" class="btn-primary">${ctaText}</a>
        ${events.length > 0 ? '<a href="#termine" class="btn-ghost">Termine ansehen</a>' : ''}
      </div>
    </div>
  </section>

  ${renderMarquee(marqueeItems)}

  ${renderHeritageStatement(spec, foundedYear)}

  ${spec.about?.body ? `
  <section class="section about">
    <div class="container">
      <div class="about-grid">
        <div class="about-image reveal">
          <img src="${getGalleryImage(spec, slug, 0, 900, 1200)}" alt="" loading="lazy">
        </div>
        <div class="about-text reveal">
          <span class="section-eyebrow">Über uns</span>
          <h2>${businessName}.</h2>
          <p>${escapeHtml(spec.about.body)}</p>
        </div>
      </div>
    </div>
  </section>
  ` : ''}

  ${renderPullQuote(pullQuote, businessName)}

  ${renderBoardSection(board)}

  ${renderStoriesGrid(spec.redesigned_sections)}

  ${services.length > 0 ? `
  <section id="angebot" class="section services">
    <div class="container">
      <div class="section-head center reveal">
        <span class="section-eyebrow">Was wir pflegen</span>
        <h2 class="section-title">Tradition <em>im Detail</em>.</h2>
      </div>
      <div class="services-grid">
        ${services.map((s, i) => `
          <article class="svc-card reveal">
            <div class="svc-num">${String(i + 1).padStart(2, '0')}</div>
            <h3 class="svc-name">${escapeHtml(s.name)}</h3>
            ${s.description ? `<p class="svc-desc">${escapeHtml(s.description)}</p>` : ''}
          </article>
        `).join('')}
      </div>
    </div>
  </section>
  ` : ''}

  ${events.length > 0 ? `
  <section id="termine" class="section events">
    <div class="container">
      <div class="section-head center reveal">
        <span class="section-eyebrow" style="color: var(--gold);">Termine</span>
        <h2 class="section-title" style="color: #fff;">Was uns <em style="color: var(--gold);">bewegt</em>.</h2>
      </div>
      <div class="events-list">
        ${events.map(ev => `
          <div class="event-row reveal">
            <div class="event-date">${escapeHtml((ev as any).date || '')}</div>
            <div class="event-info">
              <h3>${escapeHtml((ev as any).title || (ev as any).name || 'Termin')}</h3>
              ${(ev as any).description ? `<p>${escapeHtml((ev as any).description)}</p>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  </section>
  ` : ''}

  ${(spec.media?.gallery && spec.media.gallery.length >= 3) ? `
  <section class="section gallery">
    <div class="container">
      <div class="section-head center reveal">
        <span class="section-eyebrow">Eindrücke</span>
        <h2 class="section-title">Brauchtum in <em>Bildern</em>.</h2>
      </div>
      <div class="gallery-grid">
        ${spec.media!.gallery!.map((_, i) => `
          <div class="gallery-tile reveal"><img src="${getGalleryImage(spec, slug, i + 100, 800, 600)}" alt="" loading="lazy"></div>
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
        <h2 class="section-title">Was uns <em>auszeichnet</em>.</h2>
      </div>
      <div class="test-grid">
        ${testimonials.map(t => `
          <article class="test-card reveal">
            <p class="test-quote">${escapeHtml(t.quote)}</p>
            <div class="test-author">— ${escapeHtml(t.author)}</div>
          </article>
        `).join('')}
      </div>
    </div>
  </section>
  ` : ''}

  <section id="kontakt" class="contact">
    <div class="container">
      <div class="section-head center reveal" style="margin-bottom: 3rem;">
        <span class="section-eyebrow" style="color: var(--gold);">Kontakt</span>
        <h2 class="section-title" style="color: #fff;">Für eine <em style="color: var(--gold);">lebendige Tradition</em>.</h2>
      </div>
      <div class="contact-grid">
        <div class="contact-block reveal">
          <h3>Anschrift</h3>
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

  <footer class="footer">
    <div class="footer-inner" style="flex-direction: column; align-items: flex-start;">
      <div class="vf-wordmark" aria-hidden="true">${businessName}<span class="accent">.</span></div>
      ${renderSocialStrip(spec.socials)}
      <div style="display: flex; justify-content: space-between; width: 100%; flex-wrap: wrap; gap: 1rem; padding-top: 1.5rem; border-top: 1px solid rgba(255,255,255,0.08); margin-top: 1rem;">
        <div>© ${new Date().getFullYear()} ${businessName} · Alle Rechte vorbehalten</div>
        <div>Demo erstellt von <a href="https://webhoch.com" target="_blank" rel="noopener">Webagentur Hochmeir e.U.</a></div>
      </div>
    </div>
  </footer>

  <script>
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); } });
      }, { threshold: 0.12, rootMargin: '0px 0px -10% 0px' });
      document.querySelectorAll('.reveal').forEach(el => io.observe(el));
    } else {
      document.querySelectorAll('.reveal').forEach(el => el.classList.add('is-visible'));
    }
  </script>
</body>
</html>`;
}
