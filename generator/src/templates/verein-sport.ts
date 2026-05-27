/**
 * Sportverein-Template — bold, dynamic, mannschaftsgeist-orientiert.
 *
 * Visually distinct from verein-musik (which is warm/traditional):
 * - Bold sans (Bricolage Grotesque) for headlines
 * - Forest-green + accent yellow for trophy associations
 * - Stat tiles (gegründet, mannschaften, mitglieder, titel)
 * - Section emphasis: Mannschaften, Trainingszeiten, Spielergebnisse
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

export function renderVereinSportPage(spec: SiteSpec, slug: string): string {
  const businessName = escapeHtml(spec.business_name);
  const tagline = spec.tagline;
  const headline = spec.hero.headline;
  const subhead = escapeHtml(spec.hero.subheadline);
  const ctaText = escapeHtml(spec.hero.cta_text || 'Probetraining buchen');

  const phone = spec.contact.phone ? escapeHtml(spec.contact.phone) : '';
  const email = spec.contact.email ? escapeHtml(spec.contact.email) : '';
  const address = spec.contact.address ? escapeHtml(spec.contact.address) : '';

  // Real spec data → fall back to regex-extracted events when none provided.
  const events = (spec.events && spec.events.length > 0)
    ? spec.events.slice(0, 5)
    : extractEvents(spec);
  const services = spec.services && spec.services.length > 0 ? spec.services.slice(0, 6) : [];
  const testimonials = spec.testimonials && spec.testimonials.length > 0 ? spec.testimonials.slice(0, 3) : [];
  const openingHours = spec.opening_hours && spec.opening_hours.length > 0 ? spec.opening_hours.slice(0, 7) : [];

  // Editorial helpers (same as verein-musik).
  const foundedYear = extractFoundedYear(spec);
  const marqueeItems = buildMarqueeItems(spec, foundedYear);
  const pullQuote = pickPullQuote(spec);
  const board = extractBoardMembers(spec);

  const primary = spec.brand?.primary_color || '#15803d';
  const secondary = spec.brand?.secondary_color || primary;
  const accent = spec.brand?.accent_color || '#facc15';
  const headingFont = spec.brand?.heading_font_family
    ? `'${spec.brand.heading_font_family}', 'Bricolage Grotesque', system-ui, sans-serif`
    : "'Bricolage Grotesque', system-ui, sans-serif";
  const bodyFont = spec.brand?.body_font_family
    ? `'${spec.brand.body_font_family}', 'Inter', system-ui, sans-serif`
    : "'Inter', system-ui, sans-serif";
  const fontImportTags = (spec.brand?.font_imports && spec.brand.font_imports.length > 0)
    ? spec.brand.font_imports.map(u => `<link rel="stylesheet" href="${u}" crossorigin>`).join('\n  ')
    : `<link rel="preconnect" href="https://fonts.bunny.net" crossorigin>
  <link href="https://fonts.bunny.net/css?family=bricolage-grotesque:500,600,700,800|inter:400,500,600,700&display=swap" rel="stylesheet">`;

  return `---
---
<!DOCTYPE html>
<html lang="de">
<head>
  ${renderSeoHead(spec, { slug, schemaKind: 'SportsClub' })}
  ${fontImportTags}
  <style is:global>
    :root {
      --primary: ${escapeHtml(primary)};
      --primary-deep: color-mix(in oklch, ${escapeHtml(primary)} 70%, black);
      --secondary: ${escapeHtml(secondary)};
      --accent: ${escapeHtml(accent)};
      --bg: #f8fafc;
      --bg-2: #ecfdf5;
      --surface: #ffffff;
      --ink: #0f172a;
      --ink-2: #334155;
      --ink-3: #94a3b8;
      --rule: rgba(15,23,42,0.08);
      --display: ${headingFont};
      --sans: ${bodyFont};
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body { background: var(--bg); color: var(--ink); font-family: var(--sans); line-height: 1.6; -webkit-font-smoothing: antialiased; overflow-x: hidden; }
    img { display: block; max-width: 100%; }
    a { color: inherit; text-decoration: none; }
    h1, h2, h3, h4 { font-family: var(--display); font-weight: 700; line-height: 1.05; letter-spacing: -0.018em; }
    em { font-style: normal; color: var(--primary); }
    .container { max-width: 1280px; margin: 0 auto; padding: 0 1.5rem; }
    .section { padding: clamp(4rem, 8vw, 7rem) 0; }
    .section-eyebrow { display: inline-block; font-family: var(--display); font-size: 0.78rem; letter-spacing: 0.18em; text-transform: uppercase; color: var(--primary); margin-bottom: 1.25rem; font-weight: 700; }
    .section-title { font-size: clamp(2.2rem, 5vw, 3.6rem); color: var(--ink); margin-bottom: 1.25rem; }
    .section-lead { font-size: 1.05rem; color: var(--ink-2); max-width: 720px; }
    .section-head.center { text-align: center; }
    .section-head.center .section-lead { margin: 0 auto; }
    .section-head { margin-bottom: 3.5rem; }

    /* Demo banner */
    .demo-banner { background: #1a0a1f; color:#fff; padding:0.55rem 1rem; font-size:0.82rem; position: sticky; top: 0; z-index: 200; border-bottom: 1px solid rgba(236,101,186,0.35); }
    .demo-banner-inner { max-width: 1280px; margin: 0 auto; display: flex; align-items: center; gap: 0.85rem; flex-wrap: wrap; justify-content: center; }
    .demo-banner-tag { font-size: 0.7rem; letter-spacing: 0.16em; text-transform: uppercase; padding: 0.18rem 0.55rem; border-radius: 999px; background: rgba(236,101,186,0.22); border: 1px solid rgba(236,101,186,0.5); color: #ffd6ee; font-weight: 700; white-space: nowrap; }
    .demo-banner a { color: #ffb3df; font-weight: 700; border-bottom: 1px solid rgba(255,179,223,0.45); }

    /* Nav */
    .nav { background: var(--surface); border-bottom: 1px solid var(--rule); padding: 1.1rem 1.5rem; position: sticky; top: 0; z-index: 50; }
    .nav-inner { max-width: 1280px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 2rem; position: relative; }
    .brand-mark { display: inline-flex; align-items: center; gap: 0.7rem; }
    .brand-logo { width: 42px; height: 42px; object-fit: contain; }
    .brand-crest { width: 42px; height: 42px; border-radius: 6px; background: var(--primary); display: inline-flex; align-items: center; justify-content: center; color: #fff; font-family: var(--display); font-weight: 800; font-size: 1.05rem; }
    .brand-name { font-family: var(--display); font-weight: 800; font-size: 1.2rem; }
    .main-nav { display: none; gap: 2rem; font-size: 0.92rem; font-weight: 500; }
    .main-nav a { color: var(--ink-2); transition: color .2s; }
    .main-nav a:hover { color: var(--primary); }
    .nav-cta { background: var(--primary); color: #fff; padding: 0.65rem 1.4rem; border-radius: 6px; font-weight: 600; font-size: 0.9rem; transition: background .2s; }
    .nav-cta:hover { background: var(--primary-deep); }
    @media (min-width: 880px) { .main-nav { display: flex; } }
    @media (max-width: 879px) { .nav-cta { display: none; } }
    /* Mobile burger */
    .nav-toggle { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
    .nav-toggle:focus-visible ~ .nav-burger { outline: 2px solid currentColor; outline-offset: 3px; }
    .nav-burger { display: none; cursor: pointer; width: 44px; height: 44px; align-items: center; justify-content: center; border-radius: 6px; background: transparent; border: 1px solid var(--rule); flex-shrink: 0; color: var(--ink); }
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
        position: absolute; top: calc(100% + 1.1rem); left: -1.5rem; right: -1.5rem;
        display: flex; flex-direction: column; gap: 0; align-items: stretch;
        background: var(--surface); border-bottom: 1px solid var(--rule);
        box-shadow: 0 14px 30px -16px rgba(0,0,0,0.18);
        padding: 0.25rem 1.5rem 1rem;
        transform: translateY(-12px); opacity: 0; pointer-events: none;
        transition: transform .25s, opacity .25s;
        font-size: 1rem;
      }
      .main-nav a { padding: 0.95rem 0; border-bottom: 1px solid var(--rule); min-height: 44px; display: flex; align-items: center; }
      .main-nav a:last-child { border-bottom: none; }
      .nav-toggle:checked ~ .main-nav { transform: translateY(0); opacity: 1; pointer-events: auto; }
    }

    /* Hero */
    .hero {
      position: relative; min-height: clamp(560px, 80vh, 760px);
      ${hasHeroImage(spec)
        ? `background:
        linear-gradient(135deg, rgba(15,23,42,0.55) 0%, rgba(15,23,42,0.85) 100%),
        url('${getHeroImage(spec, slug)}') center/cover;`
        : `background:
        radial-gradient(ellipse at 25% 25%, rgba(250,204,21,0.18) 0%, transparent 50%),
        linear-gradient(135deg, #15803d 0%, #052e1a 100%);`
      }
      display: flex; align-items: center; padding: 4rem 1.5rem; color: #fff;
    }
    .hero-inner { max-width: 1280px; margin: 0 auto; width: 100%; }
    .hero-eyebrow { display: inline-block; font-family: var(--display); font-size: 0.78rem; letter-spacing: 0.18em; text-transform: uppercase; color: var(--accent); margin-bottom: 1.5rem; font-weight: 700; padding: 0.4rem 0.9rem; background: rgba(250,204,21,0.16); border-radius: 6px; }
    .hero h1 { font-size: clamp(3rem, 7vw, 5rem); font-weight: 800; line-height: 1.04; max-width: 18ch; margin-bottom: 1.5rem; }
    .hero-sub { font-size: 1.15rem; max-width: 60ch; color: rgba(255,255,255,0.92); margin-bottom: 2rem; }
    .hero-actions { display: flex; gap: 1rem; flex-wrap: wrap; }
    .btn-primary, .btn-ghost { display: inline-flex; align-items: center; gap: 0.5rem; padding: 1rem 2rem; font-family: var(--display); font-weight: 700; font-size: 0.98rem; border-radius: 6px; transition: all .2s; }
    .btn-primary { background: var(--accent); color: var(--ink); }
    .btn-primary:hover { background: #fde047; transform: translateY(-2px); }
    .btn-ghost { background: transparent; color: #fff; border: 1.5px solid rgba(255,255,255,0.5); }
    .btn-ghost:hover { background: rgba(255,255,255,0.1); border-color: #fff; }

    /* Stats band */
    .stats { background: var(--ink); color: #fff; }
    .stats-inner { max-width: 1280px; margin: 0 auto; display: grid; grid-template-columns: 1fr; }
    @media (min-width: 720px) { .stats-inner { grid-template-columns: repeat(4, 1fr); } }
    .stat { padding: 2rem 1.5rem; border-right: 1px solid rgba(255,255,255,0.08); text-align: center; }
    .stat:last-child { border-right: none; }
    .stat-value { font-family: var(--display); font-size: 2.3rem; font-weight: 800; color: var(--accent); line-height: 1; margin-bottom: 0.4rem; }
    .stat-label { font-size: 0.78rem; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(255,255,255,0.7); }

    /* About */
    .about { background: var(--bg); }
    .about-grid { display: grid; gap: 4rem; align-items: center; }
    @media (min-width: 920px) { .about-grid { grid-template-columns: 1.1fr 1fr; } }
    .about-text h2 { font-size: clamp(2rem, 4vw, 3rem); margin-bottom: 1.5rem; }
    .about-text p { color: var(--ink-2); margin-bottom: 1.25rem; max-width: 60ch; }
    .about-image { aspect-ratio: 4/5; overflow: hidden; border-radius: 12px; }
    .about-image img { width: 100%; height: 100%; object-fit: cover; }

    /* Services / Mannschaften */
    .services { background: var(--bg-2); }
    .services-grid { display: grid; gap: 1.25rem; grid-template-columns: 1fr; }
    @media (min-width: 720px) { .services-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (min-width: 1080px) { .services-grid { grid-template-columns: repeat(3, 1fr); } }
    .svc-card { background: var(--surface); border: 1px solid var(--rule); border-radius: 12px; padding: 2rem 1.75rem; transition: transform .25s, border-color .25s; }
    .svc-card:hover { transform: translateY(-4px); border-color: var(--primary); }
    .svc-num { font-family: var(--display); font-size: 0.85rem; color: var(--primary); font-weight: 700; letter-spacing: 0.1em; margin-bottom: 1rem; }
    .svc-name { font-size: 1.4rem; font-weight: 700; margin-bottom: 0.65rem; }
    .svc-desc { font-size: 0.95rem; color: var(--ink-2); }

    /* Events / Spielplan */
    .events { background: var(--ink); color: #fff; }
    .events-list { max-width: 980px; margin: 0 auto; }
    .event-row { display: grid; grid-template-columns: 100px 1fr; gap: 2rem; padding: 1.75rem 0; border-bottom: 1px solid rgba(255,255,255,0.08); align-items: start; }
    .event-row:last-child { border-bottom: none; }
    .event-date { font-family: var(--display); font-weight: 700; font-size: 0.92rem; color: var(--accent); letter-spacing: 0.06em; padding-top: 0.3rem; }
    .event-info h3 { font-size: 1.35rem; color: #fff; margin-bottom: 0.4rem; }
    .event-info p { color: rgba(255,255,255,0.7); font-size: 0.95rem; }

    /* Hours */
    .hours { background: var(--bg); }
    .hours-table { max-width: 720px; margin: 0 auto; background: var(--surface); border-radius: 12px; border: 1px solid var(--rule); overflow: hidden; }
    .hour-row { display: flex; justify-content: space-between; padding: 1rem 1.5rem; border-bottom: 1px solid var(--rule); font-size: 0.95rem; }
    .hour-row:last-child { border-bottom: none; }
    .hour-day { font-weight: 600; color: var(--ink); }
    .hour-time { color: var(--ink-2); font-variant-numeric: tabular-nums; }

    /* Gallery */
    .gallery { background: var(--bg-2); }
    .gallery-grid { display: grid; gap: 0.75rem; grid-template-columns: 1fr; }
    @media (min-width: 720px) { .gallery-grid { grid-template-columns: repeat(3, 1fr); } }
    .gallery-tile { aspect-ratio: 4/3; overflow: hidden; border-radius: 10px; }
    .gallery-tile img { width: 100%; height: 100%; object-fit: cover; transition: transform 1s ease; }
    .gallery-tile:hover img { transform: scale(1.05); }

    /* Testimonials */
    .testimonials-section { background: var(--bg); }
    .test-grid { display: grid; gap: 1.5rem; grid-template-columns: 1fr; max-width: 1080px; margin: 0 auto; }
    @media (min-width: 880px) { .test-grid { grid-template-columns: repeat(3, 1fr); } }
    .test-card { background: var(--surface); border-radius: 12px; padding: 2rem 1.75rem; border-left: 4px solid var(--primary); }
    .test-quote { font-size: 1.05rem; color: var(--ink); margin-bottom: 1.25rem; line-height: 1.55; }
    .test-author { font-size: 0.85rem; color: var(--ink-3); letter-spacing: 0.04em; font-weight: 600; }

    /* Contact */
    .contact { background: var(--primary); color: #fff; }
    .contact-grid { display: grid; gap: 3rem; max-width: 1080px; margin: 0 auto; }
    @media (min-width: 720px) { .contact-grid { grid-template-columns: 1fr 1fr; } }
    .contact-block h3 { font-size: 1rem; letter-spacing: 0.16em; text-transform: uppercase; color: var(--accent); margin-bottom: 1rem; font-family: var(--sans); font-weight: 700; }
    .contact-block p { color: rgba(255,255,255,0.92); font-size: 1.05rem; line-height: 1.5; }
    .contact-block a { color: var(--accent); }
    .contact-block a:hover { color: #fff; }
    .contact-cta { display: inline-flex; padding: 1rem 2rem; background: var(--accent); color: var(--ink); font-family: var(--display); font-weight: 700; border-radius: 6px; margin-top: 1.5rem; transition: all .2s; }
    .contact-cta:hover { background: #fde047; transform: translateY(-2px); }

    /* Footer */
    .footer { background: #0f172a; color: rgba(255,255,255,0.6); padding: 2.5rem 1.5rem; font-size: 0.85rem; }
    .footer-inner { max-width: 1280px; margin: 0 auto; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 1.5rem; }
    .footer a { color: var(--accent); }

    /* Reveal */
    .reveal { opacity: 1; transform: none; }
    /* removed: see .reveal */
    @media (prefers-reduced-motion: reduce) { .reveal { opacity: 1; transform: none; transition: none; } .gallery-tile img { transition: none; } }

    /* Sport-template needs the same ink-2/--primary-soft tokens that the
       _editorial CSS references — wire them through here so the shared
       block doesn't need template-specific overrides. */
    :root { --ink-2: var(--ink, #0f172a); }

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
          ? `<img class="brand-logo" src="${escapeHtml(getLogo(spec)!)}" alt="${businessName} Logo" width="76" height="76" />`
          : `<span class="brand-crest">${escapeHtml(spec.business_name.split(/\s+/).map(w => w[0] || '').slice(0, 2).join('').toUpperCase() || 'SV')}</span>`
        }
        <span class="brand-name">${businessName}</span>
      </a>
      <input type="checkbox" id="nav-toggle" class="nav-toggle" aria-hidden="true" tabindex="-1">
      <label for="nav-toggle" class="nav-burger" aria-label="Menü öffnen"><span></span></label>
      <div class="main-nav">
        ${services.length > 0 ? '<a href="#mannschaften">Mannschaften</a>' : ''}
        ${events.length > 0 ? '<a href="#spielplan">Spielplan</a>' : ''}
        ${openingHours.length > 0 ? '<a href="#training">Training</a>' : ''}
        <a href="#kontakt">Kontakt</a>
      </div>
      <a href="#kontakt" class="nav-cta">${ctaText}</a>
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
        ${services.length > 0 ? '<a href="#mannschaften" class="btn-ghost">Unsere Mannschaften</a>' : ''}
      </div>
    </div>
  </section>

  ${renderMarquee(marqueeItems)}

  ${renderHeritageStatement(spec, foundedYear)}

  ${spec.about?.body ? `
  <section class="section about">
    <div class="container">
      <div class="about-grid">
        <div class="about-text reveal">
          <span class="section-eyebrow">Über den Verein</span>
          <h2>${businessName}.</h2>
          <p>${escapeHtml(spec.about.body)}</p>
        </div>
        <div class="about-image reveal">
          <img src="${getGalleryImage(spec, slug, 0, 900, 1200)}" alt="" loading="lazy">
        </div>
      </div>
    </div>
  </section>
  ` : ''}

  ${renderPullQuote(pullQuote, businessName)}

  ${renderBoardSection(board)}

  ${renderStoriesGrid(spec.redesigned_sections)}

  ${services.length > 0 ? `
  <section id="mannschaften" class="section services">
    <div class="container">
      <div class="section-head reveal">
        <span class="section-eyebrow">Mannschaften &amp; Angebot</span>
        <h2 class="section-title">Was wir <em>bewegen</em>.</h2>
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
  <section id="spielplan" class="section events">
    <div class="container">
      <div class="section-head center reveal">
        <span class="section-eyebrow" style="color: var(--accent);">Spielplan</span>
        <h2 class="section-title" style="color: #fff;">Nächste <em style="color: var(--accent);">Termine</em>.</h2>
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

  ${openingHours.length > 0 ? `
  <section id="training" class="section hours">
    <div class="container">
      <div class="section-head center reveal">
        <span class="section-eyebrow">Trainingszeiten</span>
        <h2 class="section-title">Wann wir <em>auf dem Platz sind</em>.</h2>
      </div>
      <div class="hours-table reveal">
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
  <section class="section gallery">
    <div class="container">
      <div class="section-head center reveal">
        <span class="section-eyebrow">Eindrücke</span>
        <h2 class="section-title">Vereinsleben in <em>Bildern</em>.</h2>
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
        <h2 class="section-title">Was Mitglieder <em>sagen</em>.</h2>
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

  <section id="kontakt" class="section contact">
    <div class="container">
      <div class="section-head center reveal" style="margin-bottom: 3rem;">
        <span class="section-eyebrow" style="color: var(--accent);">Kontakt</span>
        <h2 class="section-title" style="color: #fff;">Werden Sie Teil <em style="color: var(--accent);">unseres Teams</em>.</h2>
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
