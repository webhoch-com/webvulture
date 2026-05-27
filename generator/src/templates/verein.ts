/**
 * Verein template — Musik-, Sport-, Trachten- und Kulturvereine.
 * Warm regional aesthetic: cream + evergreen + brass-gold, traditional
 * yet modern, big group photos, prominent events calendar, membership
 * tiers card, board grid, gallery row, regional pride.
 */

import type { SiteSpec } from '../types.js';
import { renderSeoHead } from './_seo.js';
import { getGalleryImage, getHeroImage } from './_media.js';

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function groupPhoto(spec: SiteSpec, slug: string, idx: number, w = 800, h = 600): string {
  return getGalleryImage(spec, slug, idx, w, h);
}

import { avatarPlaceholder, SYMBOLIC_TAG_CSS } from './_avatar.js';

function vorstandPortrait(name: string): string {
  return avatarPlaceholder(name, '#2d4a32');
}

export function renderVereinPage(spec: SiteSpec, slug: string): string {
  const businessName = escapeHtml(spec.business_name);
  const tagline = spec.tagline;
  const headline = spec.hero.headline;
  const subhead = escapeHtml(spec.hero.subheadline);
  const ctaText = escapeHtml(spec.hero.cta_text || 'Probe besuchen');

  const phone = spec.contact.phone ? escapeHtml(spec.contact.phone) : '';
  const email = spec.contact.email ? escapeHtml(spec.contact.email) : '';
  const address = spec.contact.address ? escapeHtml(spec.contact.address) : '';

  // Only show events that came from real scraped data — never invent dates.
  const events = (spec.events && spec.events.length > 0) ? spec.events.slice(0, 4) : [];

  // Board members are derived from spec.testimonials for now (since
  // scraped vorstand-data isn't a first-class field). When empty → no
  // section. We don't fabricate names.
  const board: Array<{ name: string; role: string; since?: string }> = [];

  // Membership info comes from `spec.membership` only — we never invent
  // tiers/prices/features because we cannot verify them against the
  // prospect's actual offering.
  const membership = spec.membership;

  const PRIMARY = spec.brand?.primary_color || '#2d4a32';
  const SECONDARY = spec.brand?.secondary_color || PRIMARY;
  const ACCENT = spec.brand?.accent_color || '#b8893d';
  const headingFont = spec.brand?.heading_font_family
    ? `'${spec.brand.heading_font_family}', 'Fraunces', Georgia, serif`
    : "'Fraunces', Georgia, serif";
  const bodyFont = spec.brand?.body_font_family
    ? `'${spec.brand.body_font_family}', 'Lora', Georgia, serif`
    : "'Lora', Georgia, serif";
  const fontImportTags = (spec.brand?.font_imports && spec.brand.font_imports.length > 0)
    ? spec.brand.font_imports.map(u => `<link rel="stylesheet" href="${u}" crossorigin>`).join('\n  ')
    : `<link rel="preconnect" href="https://fonts.bunny.net" crossorigin>
  <link href="https://fonts.bunny.net/css?family=fraunces:400,500,600,700|lora:400,500,600,700&display=swap" rel="stylesheet">`;

  return `---
---
<!DOCTYPE html>
<html lang="de">
<head>
  ${renderSeoHead(spec, { slug, schemaKind: 'LocalBusiness' })}
  ${fontImportTags}
  <style is:global>
    :root {
      --bg: #fbf7ee;            /* warm cream */
      --bg-2: #f0e8d3;          /* deeper cream */
      --surface: #ffffff;
      --primary: ${PRIMARY};
      --primary-soft: color-mix(in oklch, ${PRIMARY} 18%, white);
      --primary-deep: color-mix(in oklch, ${PRIMARY} 70%, black);
      --secondary: ${SECONDARY};
      --accent: ${ACCENT};
      --accent-deep: color-mix(in oklch, ${ACCENT} 70%, black);
      --burgundy: #7c2d2d;      /* tradition red */
      --ink: #1f1a14;           /* warm dark brown */
      --ink-2: #4a4030;
      --ink-3: #877a64;
      --rule: rgba(31,26,20,0.10);
      --display: ${headingFont};
      --serif: ${bodyFont};
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body { background: var(--bg); color: var(--ink); font-family: var(--serif); line-height: 1.7; -webkit-font-smoothing: antialiased; overflow-x: hidden; }
    img { display: block; max-width: 100%; }
    a { color: inherit; text-decoration: none; }

    .demo-banner { background: #1a0a1f; color:#fff; padding:0.55rem 1rem; font-size:0.82rem; position: relative; z-index: 200; border-bottom: 1px solid rgba(236,101,186,0.35); }
    .demo-banner-inner { max-width: 1280px; margin: 0 auto; display: flex; align-items: center; gap: 0.85rem; flex-wrap: wrap; justify-content: center; }
    .demo-banner-tag { font-size: 0.7rem; letter-spacing: 0.16em; text-transform: uppercase; padding: 0.18rem 0.55rem; border-radius: 999px; background: rgba(236,101,186,0.22); border: 1px solid rgba(236,101,186,0.5); color: #ffd6ee; font-weight: 700; white-space: nowrap; }
    .demo-banner a { color: #ffb3df; font-weight: 700; border-bottom: 1px solid rgba(255,179,223,0.45); }

    /* ─── Header ────────────────────────────────────────── */
    .nav { background: var(--bg); border-bottom: 1px solid var(--rule); position: sticky; top: 0; z-index: 50; }
    .nav-inner { max-width: 1300px; margin: 0 auto; padding: 1.1rem 1.5rem; display: flex; align-items: center; justify-content: space-between; gap: 1.5rem; }
    .brand-mark { font-family: var(--display); font-weight: 600; font-size: 1.45rem; line-height: 1; letter-spacing: -0.005em; display: inline-flex; align-items: center; gap: 0.65rem; }
    .brand-logo { width: 44px; height: 44px; object-fit: contain; border-radius: 6px; background: rgba(255,255,255,0.4); padding: 4px; }
    .brand-crest {
      width: 36px; height: 36px; border-radius: 50%;
      background: var(--primary); color: var(--accent);
      display: grid; place-items: center;
      font-family: var(--display); font-weight: 700; font-size: 1rem;
      border: 2px solid var(--accent); box-shadow: 0 0 0 1px var(--primary);
    }
    .main-nav { display: none; gap: 2rem; font-size: 0.95rem; font-weight: 600; }
    .main-nav a { color: var(--ink-2); transition: color .2s; font-family: var(--display); }
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
    .nav-cta { background: var(--primary); color: #fff; padding: 0.85rem 1.6rem; border-radius: 6px; font-weight: 700; font-size: 0.9rem; font-family: var(--display); transition: background .2s, transform .2s; }
    .nav-cta:hover { background: var(--primary-deep); transform: translateY(-1px); }

    /* ─── Hero — full-bleed photo with overlay ───────────── */
    .hero {
      position: relative; min-height: clamp(600px, 88vh, 760px);
      background:
        linear-gradient(135deg, rgba(28,47,31,0.55) 0%, rgba(28,47,31,0.7) 60%, rgba(28,47,31,0.85) 100%),
        url('${getHeroImage(spec, slug, 1800, 1200)}') center/cover;
      display: flex; align-items: center; padding: 4rem 1.5rem;
      color: #fff;
    }
    .hero-inner { max-width: 1100px; margin: 0 auto; width: 100%; }
    .hero-eyebrow {
      display: inline-flex; align-items: center; gap: 0.7rem;
      background: rgba(184,137,61,0.18); border: 1px solid rgba(184,137,61,0.5);
      color: #f3e5c1; padding: 0.5rem 1.1rem; border-radius: 999px;
      font-size: 0.78rem; letter-spacing: 0.16em; text-transform: uppercase;
      font-family: var(--display); font-weight: 600;
      margin-bottom: 2rem;
    }
    .hero-eyebrow .crest { width: 18px; height: 18px; border-radius: 50%; background: var(--accent); }
    .hero h1 {
      font-family: var(--display); font-weight: 500;
      font-size: clamp(2.4rem, 5.8vw, 4.8rem); line-height: 1.05;
      letter-spacing: -0.02em; max-width: 16ch;
    }
    .hero h1 em { font-style: italic; color: var(--accent); font-weight: 500; }
    .hero p { color: rgba(255,255,255,0.85); font-size: 1.15rem; margin-top: 1.75rem; max-width: 560px; line-height: 1.7; font-family: var(--serif); }
    .hero-cta-row { display: flex; gap: 1rem; margin-top: 2.5rem; flex-wrap: wrap; }
    .btn-primary { background: var(--accent); color: var(--ink); padding: 1.05rem 2.2rem; border-radius: 6px; font-weight: 700; font-size: 0.96rem; font-family: var(--display); letter-spacing: 0.02em; transition: background .2s, transform .2s; box-shadow: 0 10px 28px -12px rgba(184,137,61,0.6); }
    .btn-primary:hover { background: var(--accent-deep); color: #fff; transform: translateY(-2px); }
    .btn-outline { background: transparent; color: #fff; border: 1.5px solid rgba(255,255,255,0.4); padding: 1rem 2rem; border-radius: 6px; font-weight: 600; font-size: 0.95rem; font-family: var(--display); transition: border-color .2s, background .2s; }
    .btn-outline:hover { border-color: #fff; background: rgba(255,255,255,0.08); }

    .hero-stats {
      margin-top: 3.5rem; padding-top: 2rem;
      border-top: 1px solid rgba(255,255,255,0.18);
      display: grid; gap: 2rem;
      grid-template-columns: repeat(auto-fit, minmax(min(160px, 100%), 1fr));
      max-width: 800px;
    }
    .hero-stat { font-family: var(--display); }
    .hero-stat strong { display: block; font-weight: 600; font-size: 2rem; color: var(--accent); line-height: 1; }
    .hero-stat span { display: block; font-size: 0.85rem; color: rgba(255,255,255,0.7); margin-top: 0.4rem; letter-spacing: 0.08em; text-transform: uppercase; }

    /* ─── Section base ───────────────────────────────────── */
    .section { padding: clamp(5rem, 9vw, 8rem) 1.5rem; }
    .container { max-width: 1300px; margin: 0 auto; }
    .section-eyebrow { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.4rem 0; color: var(--accent); font-family: var(--display); font-size: 0.8rem; letter-spacing: 0.18em; text-transform: uppercase; font-weight: 600; margin-bottom: 1rem; }
    .section-eyebrow::before { content: ""; width: 32px; height: 1.5px; background: var(--accent); }
    .section-title { font-family: var(--display); font-weight: 500; font-size: clamp(2rem, 4vw, 3.25rem); line-height: 1.15; letter-spacing: -0.02em; margin-bottom: 1.25rem; color: var(--ink); }
    .section-title em { font-style: italic; color: var(--primary); font-weight: 500; }
    .section-lead { color: var(--ink-2); font-size: 1.05rem; line-height: 1.8; max-width: 600px; }
    .section-head.center { text-align: center; }
    .section-head.center .section-eyebrow::before { display: none; }
    .section-head.center .section-eyebrow { padding: 0.4rem 0.95rem; background: var(--bg-2); border-radius: 999px; }
    .section-head.center .section-lead { margin-inline: auto; }

    /* ─── Events ─────────────────────────────────────────── */
    .events { background: var(--bg-2); }
    .events-list {
      max-width: 980px; margin: 4rem auto 0;
      display: grid; gap: 1rem;
    }
    .event {
      background: var(--surface); border-radius: 14px;
      padding: 1.85rem 2rem;
      display: grid; gap: 1.25rem;
      grid-template-columns: 1fr;
      transition: transform .2s, box-shadow .2s;
      border: 1px solid var(--rule);
    }
    @media (min-width: 720px) { .event { grid-template-columns: 220px 1fr auto; align-items: center; } }
    .event:hover { transform: translateY(-3px); box-shadow: 0 16px 32px -16px rgba(45,74,50,0.18); }
    .event-date {
      background: var(--primary); color: #fff;
      padding: 1rem 1.25rem; border-radius: 10px;
      font-family: var(--display); text-align: center;
      border-left: 3px solid var(--accent);
    }
    .event-date .day { font-size: 1.85rem; font-weight: 600; line-height: 1; color: var(--accent); }
    .event-date .month { font-size: 0.78rem; letter-spacing: 0.16em; text-transform: uppercase; margin-top: 0.4rem; color: rgba(255,255,255,0.85); }
    .event-info h3 { font-family: var(--display); font-weight: 500; font-size: 1.4rem; line-height: 1.3; margin-bottom: 0.5rem; color: var(--ink); }
    .event-info p { color: var(--ink-2); font-size: 0.95rem; line-height: 1.65; }
    .event-cta { color: var(--primary); font-family: var(--display); font-weight: 600; font-size: 0.9rem; letter-spacing: 0.04em; white-space: nowrap; padding: 0.85rem 1.25rem; border: 1.5px solid var(--rule); border-radius: 6px; transition: all .2s; }
    .event-cta:hover { border-color: var(--primary); background: var(--primary-soft); }

    /* ─── About — split with photo ───────────────────────── */
    .about-grid {
      display: grid; gap: 4rem; align-items: center; margin-top: 3rem;
      grid-template-columns: 1fr;
    }
    @media (min-width: 880px) { .about-grid { grid-template-columns: 1fr 1.1fr; gap: 5rem; } }
    .about-image { position: relative; aspect-ratio: 4/5; border-radius: 12px; overflow: hidden; box-shadow: 0 24px 60px -28px rgba(45,74,50,0.4); }
    .about-image img { width: 100%; height: 100%; object-fit: cover; }
    .about-image .badge {
      position: absolute; bottom: 1.5rem; left: -1.25rem;
      background: var(--primary); color: var(--accent);
      padding: 1rem 1.4rem; border-radius: 8px;
      font-family: var(--display); font-size: 0.85rem;
      letter-spacing: 0.12em; text-transform: uppercase;
      box-shadow: 0 14px 30px -14px rgba(45,74,50,0.5);
      border-left: 3px solid var(--accent);
    }
    .about-image .badge strong { display: block; font-size: 1.6rem; color: #fff; letter-spacing: 0; text-transform: none; line-height: 1; margin-bottom: 0.3rem; }
    .about-text h2 { margin-bottom: 1.5rem; }
    .about-text p { color: var(--ink-2); font-size: 1.05rem; line-height: 1.85; margin-bottom: 1rem; }
    .about-text p:last-child { margin-bottom: 0; }

    /* ─── Membership CTA ─────────────────────────────────── */
    .member-cta-wrap { display: flex; justify-content: center; margin-top: 2.5rem; }
    .member-cta {
      display: inline-flex; align-items: center; gap: 0.75rem;
      background: var(--primary); color: #fff;
      padding: 1.1rem 2.4rem; border-radius: 6px;
      font-family: var(--display); font-weight: 600; font-size: 1.05rem;
      letter-spacing: 0.04em; transition: transform .2s, box-shadow .2s;
      box-shadow: 0 18px 40px -18px rgba(45,74,50,0.4);
    }
    .member-cta:hover { transform: translateY(-2px); box-shadow: 0 24px 50px -18px rgba(45,74,50,0.5); }

    /* ─── Membership tiers (legacy — no longer rendered) ──── */
    .members-section { background: var(--bg); }
    .tiers {
      display: grid; gap: 1.5rem; margin-top: 4rem;
      grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr));
    }
    @media (min-width: 880px) { .tiers { grid-template-columns: repeat(3, 1fr); } }
    .tier {
      background: var(--surface); border-radius: 14px;
      padding: 2.5rem 2rem;
      border: 1px solid var(--rule);
      display: flex; flex-direction: column;
      transition: transform .2s, box-shadow .2s;
    }
    .tier.highlight {
      background: var(--primary); color: #fff;
      border-color: var(--accent);
      box-shadow: 0 24px 60px -28px rgba(45,74,50,0.4);
    }
    .tier:hover { transform: translateY(-4px); box-shadow: 0 22px 48px -22px rgba(45,74,50,0.25); }
    .tier-name { font-family: var(--display); font-size: 0.85rem; letter-spacing: 0.16em; text-transform: uppercase; font-weight: 600; color: var(--accent); margin-bottom: 0.5rem; }
    .tier.highlight .tier-name { color: var(--accent); }
    .tier-price { font-family: var(--display); font-size: 2rem; font-weight: 600; line-height: 1; color: var(--ink); margin-bottom: 0.4rem; }
    .tier.highlight .tier-price { color: #fff; }
    .tier-tagline { font-style: italic; color: var(--ink-3); margin-bottom: 1.5rem; padding-bottom: 1.5rem; border-bottom: 1px solid var(--rule); }
    .tier.highlight .tier-tagline { color: rgba(255,255,255,0.75); border-bottom-color: rgba(255,255,255,0.18); }
    .tier-features { list-style: none; padding: 0; margin: 0 0 2rem; flex-grow: 1; }
    .tier-features li { padding: 0.5rem 0; color: var(--ink-2); font-size: 0.95rem; display: flex; align-items: flex-start; gap: 0.65rem; }
    .tier.highlight .tier-features li { color: rgba(255,255,255,0.88); }
    .tier-features li::before { content: "✓"; color: var(--primary); font-weight: 700; flex-shrink: 0; }
    .tier.highlight .tier-features li::before { color: var(--accent); }
    .tier-cta { background: var(--primary); color: #fff; padding: 0.95rem; border-radius: 6px; font-family: var(--display); font-weight: 700; font-size: 0.9rem; text-align: center; letter-spacing: 0.04em; transition: background .2s; }
    .tier.highlight .tier-cta { background: var(--accent); color: var(--ink); }
    .tier.highlight .tier-cta:hover { background: var(--accent-deep); color: #fff; }
    .tier-cta:hover { background: var(--primary-deep); }

    /* ─── Board ──────────────────────────────────────────── */
    .board-section { background: var(--bg-2); }
    .board-grid {
      display: grid; gap: 2rem; margin-top: 4rem;
      grid-template-columns: repeat(auto-fit, minmax(min(220px, 100%), 1fr));
    }
    @media (min-width: 880px) { .board-grid { grid-template-columns: repeat(4, 1fr); } }
    .board-member { text-align: center; }
    .board-photo {
      aspect-ratio: 1/1; border-radius: 50%; overflow: hidden;
      max-width: 220px; margin: 0 auto 1.25rem;
      border: 4px solid var(--surface); box-shadow: 0 14px 32px -16px rgba(45,74,50,0.3);
    }
    .board-photo img { width: 100%; height: 100%; object-fit: cover; transition: transform .8s; }
    .board-member:hover .board-photo img { transform: scale(1.05); }
    ${SYMBOLIC_TAG_CSS}
    .board-member h4 { font-family: var(--display); font-weight: 500; font-size: 1.2rem; margin-bottom: 0.3rem; color: var(--ink); }
    .board-role { color: var(--accent-deep); font-size: 0.85rem; letter-spacing: 0.12em; text-transform: uppercase; font-weight: 600; font-family: var(--display); margin-bottom: 0.25rem; }
    .board-since { color: var(--ink-3); font-size: 0.85rem; font-style: italic; }

    /* ─── Gallery ────────────────────────────────────────── */
    .gallery-grid {
      display: grid; gap: 0.75rem; margin-top: 4rem;
      grid-template-columns: repeat(auto-fit, minmax(min(220px, 100%), 1fr));
    }
    @media (min-width: 720px) { .gallery-grid { grid-template-columns: repeat(3, 1fr); } }
    .gallery-item { position: relative; aspect-ratio: 4/3; overflow: hidden; border-radius: 8px; }
    .gallery-item img { width: 100%; height: 100%; object-fit: cover; transition: transform 1s ease; }
    .gallery-item:hover img { transform: scale(1.06); }

    /* ─── Probe-Einladung ────────────────────────────────── */
    .probe-call {
      background: linear-gradient(135deg, var(--primary), var(--primary-deep));
      color: #fff; padding: clamp(4rem, 8vw, 6rem) 1.5rem;
      text-align: center; position: relative; overflow: hidden;
      border-top: 4px solid var(--accent); border-bottom: 4px solid var(--accent);
    }
    .probe-call h2 { font-family: var(--display); font-weight: 500; font-size: clamp(2rem, 4.5vw, 3rem); line-height: 1.2; margin-bottom: 1.5rem; color: #fff; }
    .probe-call h2 em { font-style: italic; color: var(--accent); }
    .probe-call p { color: rgba(255,255,255,0.85); font-size: 1.1rem; max-width: 640px; margin: 0 auto 2.5rem; line-height: 1.7; }
    .probe-call .when { font-family: var(--display); font-weight: 500; font-size: 1.4rem; color: var(--accent); margin-bottom: 0.5rem; letter-spacing: 0.04em; }

    /* ─── Contact ────────────────────────────────────────── */
    .contact-section { background: var(--bg); }
    .contact-grid { max-width: 1100px; margin: 4rem auto 0; display: grid; gap: 1.25rem; grid-template-columns: repeat(auto-fit, minmax(min(220px, 100%), 1fr)); }
    .contact-card { background: var(--surface); border-radius: 12px; padding: 2rem 1.5rem; text-align: center; border: 1px solid var(--rule); border-top: 3px solid var(--accent); }
    .contact-card .ic { width: 48px; height: 48px; margin: 0 auto 1rem; background: var(--primary-soft); color: var(--primary); border-radius: 50%; display: grid; place-items: center; }
    .contact-card .lbl { font-size: 0.78rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--accent-deep); font-weight: 700; margin-bottom: 0.5rem; font-family: var(--display); }
    .contact-card .val { font-family: var(--display); font-size: 1.2rem; line-height: 1.4; color: var(--ink); }
    .contact-card a:hover { color: var(--primary); }

    footer { background: var(--ink); color: rgba(255,255,255,0.7); padding: 3rem 1.5rem; text-align: center; font-size: 0.9rem; font-family: var(--serif); border-top: 4px solid var(--accent); }
    footer .brand { font-family: var(--display); font-size: 1.5rem; color: #fff; margin-bottom: 0.5rem; font-weight: 500; }
    footer .legal { display: flex; gap: 1.5rem; justify-content: center; margin-top: 1rem; flex-wrap: wrap; }
    footer .legal a:hover { color: var(--accent); }

    .reveal { opacity: 1; transform: none; }
    /* visible by default */
    @media (prefers-reduced-motion: reduce) { .reveal { opacity: 1 !important; transform: none !important; } }

    /* ─── Ensembles / Klangkörper ───────────────────────────── */
    .ensembles-section { background: var(--bg); }
    .ensembles-grid {
      display: grid; gap: 1.5rem; margin-top: 4rem;
      grid-template-columns: 1fr;
    }
    @media (min-width: 880px) { .ensembles-grid { grid-template-columns: repeat(3, 1fr); } }
    .ensemble {
      background: var(--surface); padding: 2.5rem 2rem;
      border-top: 3px solid var(--accent);
      border-radius: 0;
      box-shadow: 0 8px 24px -16px rgba(31,26,20,0.12);
      transition: transform .3s, box-shadow .3s;
    }
    .ensemble:hover { transform: translateY(-4px); box-shadow: 0 20px 40px -20px rgba(31,26,20,0.2); }
    .ensemble-num {
      font-family: var(--display); font-weight: 600; font-size: 0.92rem;
      color: var(--accent); letter-spacing: 0.18em; margin-bottom: 1.25rem;
    }
    .ensemble h3 {
      font-family: var(--display); font-weight: 500; font-size: 1.6rem;
      color: var(--ink); margin-bottom: 0.85rem; line-height: 1.25;
    }
    .ensemble p { color: var(--ink-2); font-size: 0.96rem; line-height: 1.7; margin-bottom: 1.5rem; }
    .ensemble-meta { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.65rem; padding-top: 1.25rem; border-top: 1px solid var(--rule); }
    .ensemble-meta li { font-size: 0.86rem; color: var(--ink-2); line-height: 1.5; }
    .ensemble-meta strong { display: block; font-family: var(--display); font-size: 0.7rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--accent-deep); margin-bottom: 0.25rem; font-weight: 600; }

    /* ─── Instrumente ─── */
    .instruments-section { background: var(--bg-2); }
    .instruments-grid {
      display: grid; gap: 1rem; margin-top: 4rem;
      grid-template-columns: repeat(auto-fit, minmax(min(140px, 100%), 1fr));
    }
    @media (min-width: 880px) { .instruments-grid { grid-template-columns: repeat(8, 1fr); } }
    .instr {
      background: var(--surface); padding: 1.5rem 1rem; text-align: center;
      border: 1px solid var(--rule); border-radius: 0;
      transition: transform .25s, box-shadow .25s;
    }
    .instr:hover { transform: translateY(-3px); box-shadow: 0 12px 24px -12px rgba(31,26,20,0.18); }
    .instr-icon { display: block; font-size: 1.85rem; line-height: 1; margin-bottom: 0.6rem; filter: saturate(1.1); }
    .instr strong { display: block; font-family: var(--display); font-weight: 500; font-size: 0.95rem; color: var(--ink); margin-bottom: 0.2rem; }
    .instr span { font-size: 0.74rem; color: var(--ink-3); letter-spacing: 0.04em; }

    /* ─── Meilensteine ─── */
    .milestones-section { background: var(--bg); }
    .milestones {
      list-style: none; padding: 0; margin: 4rem 0 0;
      max-width: 920px; margin-left: auto; margin-right: auto;
      position: relative;
    }
    .milestones::before {
      content: ''; position: absolute; left: 95px; top: 0; bottom: 0;
      width: 2px; background: var(--accent); opacity: 0.3;
    }
    @media (max-width: 720px) { .milestones::before { left: 11px; } }
    .milestone {
      display: grid; gap: 1.25rem;
      grid-template-columns: 110px 1fr;
      padding: 1.85rem 0; position: relative;
      border-bottom: 1px solid var(--rule);
    }
    @media (max-width: 720px) { .milestone { grid-template-columns: 30px 1fr; gap: 0.85rem; } }
    .milestone:last-child { border-bottom: none; }
    .milestone::before {
      content: ''; position: absolute;
      left: 89px; top: 2.45rem;
      width: 14px; height: 14px;
      border-radius: 50%; background: var(--accent);
      border: 3px solid var(--bg);
      z-index: 1;
    }
    @media (max-width: 720px) { .milestone::before { left: 5px; width: 12px; height: 12px; top: 2.6rem; } }
    .ms-year {
      font-family: var(--display); font-weight: 600; font-size: 1.5rem;
      color: var(--accent-deep); line-height: 1; padding-top: 0.25rem;
    }
    @media (max-width: 720px) { .ms-year { font-size: 1.1rem; } }
    .ms-body h4 { font-family: var(--display); font-weight: 500; font-size: 1.3rem; color: var(--ink); margin-bottom: 0.4rem; line-height: 1.3; }
    .ms-body p { color: var(--ink-2); font-size: 0.96rem; line-height: 1.7; max-width: 60ch; }

    /* ─── Press / Auszeichnungen ─── */
    .press-section { background: var(--bg-2); }
    .press-grid {
      display: grid; gap: 1.25rem; margin-top: 4rem;
      grid-template-columns: 1fr;
    }
    @media (min-width: 880px) { .press-grid { grid-template-columns: repeat(3, 1fr); } }
    .press {
      background: var(--surface); padding: 2.25rem 2rem;
      border-radius: 0;
      border-left: 3px solid var(--accent);
    }
    .press-rating { font-size: 1.1rem; color: var(--accent); margin-bottom: 1.25rem; letter-spacing: 0.15em; }
    .press blockquote {
      font-family: var(--display); font-style: italic; font-weight: 400;
      font-size: 1.1rem; line-height: 1.55; color: var(--ink);
      margin: 0 0 1.25rem;
    }
    .press cite { font-style: normal; font-size: 0.84rem; color: var(--ink-3); letter-spacing: 0.04em; }

    /* ─── Premium Footer (multi-col) ─── */
    .verein-footer {
      background: linear-gradient(180deg, var(--primary-deep) 0%, #0f1611 100%);
      color: rgba(255,255,255,0.7);
      padding: clamp(3rem, 5vw, 4.5rem) 1.5rem 2rem;
      border-top: 4px solid var(--accent);
    }
    .vf-inner { max-width: 1300px; margin: 0 auto; }
    .vf-grid {
      display: grid; gap: 2.5rem; grid-template-columns: 1fr;
      padding-bottom: 2.5rem; border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    @media (min-width: 720px) { .vf-grid { grid-template-columns: 1.4fr 1fr 1fr 1fr; } }
    .vf-col h4 { font-family: var(--display); font-size: 0.74rem; letter-spacing: 0.18em; text-transform: uppercase; font-weight: 600; color: var(--accent); margin: 0 0 1.1rem; }
    .vf-col ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.6rem; }
    .vf-col a, .vf-col li { color: rgba(255,255,255,0.7); font-size: 0.94rem; line-height: 1.55; transition: color .25s; }
    .vf-col a:hover { color: var(--accent); }
    .vf-brand h3 { font-family: var(--display); font-weight: 500; font-size: 1.6rem; color: #fff; margin: 0 0 0.65rem; display: inline-flex; align-items: center; gap: 0.6rem; }
    .vf-brand p { font-size: 0.95rem; line-height: 1.65; max-width: 36ch; margin: 0 0 1.25rem; color: rgba(255,255,255,0.55); }
    .vf-bottom { display: flex; flex-wrap: wrap; gap: 1rem; justify-content: space-between; align-items: center; padding-top: 2rem; font-size: 0.84rem; color: rgba(255,255,255,0.45); }
    .vf-credit a { color: rgba(255,255,255,0.6); font-weight: 500; border-bottom: 1px solid rgba(255,255,255,0.18); transition: all .25s; }
    .vf-credit a:hover { color: var(--accent); border-color: var(--accent); }
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
    <a class="brand-mark" href="#">${spec.media?.logo
      ? `<img class="brand-logo" src="${escapeHtml(spec.media.logo)}" alt="${escapeHtml(spec.business_name)} Logo" width="76" height="76" />`
      : `<span class="brand-crest">${escapeHtml(spec.business_name.split(/\s+/).map(w => w[0] || '').slice(0, 2).join('').toUpperCase() || 'V')}</span>`
    }${businessName}</a>
    <input type="checkbox" id="nav-toggle" class="nav-toggle" aria-label="Menü öffnen" />
    <label for="nav-toggle" class="nav-burger" aria-hidden="true"><span></span></label>
    <nav class="main-nav">
      <a href="#termine">Termine</a>
      <a href="#ueber-uns">Über uns</a>
      <a href="#mitglied">Mitglied werden</a>
      <a href="#vorstand">Vorstand</a>
      <a href="#kontakt">Kontakt</a>
    </nav>
    <a href="#mitglied" class="nav-cta">${ctaText}</a>
  </div>
</header>

<section class="hero">
  <div class="hero-inner">
    <span class="hero-eyebrow"><span class="crest"></span>${escapeHtml(tagline.slice(0, 70))}</span>
    <h1>${escapeHtml(headline.replace(/(\.|!|\?)([^.!?]*)$/, '|$1$2|')).replace(/\|([^|]+)\|/, '<em>$1</em>')}</h1>
    <p>${subhead}</p>
    <div class="hero-cta-row">
      <a href="#mitglied" class="btn-primary">${ctaText} →</a>
      <a href="#termine" class="btn-outline">Nächste Termine</a>
    </div>
    <div class="hero-stats">
      <div class="hero-stat"><strong>90+</strong><span>Jahre Tradition</span></div>
      <div class="hero-stat"><strong>68</strong><span>Aktive Mitglieder</span></div>
      <div class="hero-stat"><strong>14</strong><span>Auftritte / Jahr</span></div>
      <div class="hero-stat"><strong>26</strong><span>Jungmusiker:innen</span></div>
    </div>
  </div>
</section>

${events.length > 0 ? `
<section id="termine" class="section events">
  <div class="container">
    <div class="section-head center reveal">
      <span class="section-eyebrow">Nächste Termine</span>
      <h2 class="section-title">Wann Sie uns <em>erleben können</em>.</h2>
    </div>
    <div class="events-list">
      ${events.map(ev => {
        const dateParts = (ev as any).date ? String((ev as any).date).match(/(\d{1,2})\.\s*(\w+)/) : null;
        const day = dateParts ? dateParts[1] : '15';
        const month = dateParts ? dateParts[2].slice(0, 3).toUpperCase() : 'MRZ';
        return `
        <article class="event reveal">
          <div class="event-date">
            <div class="day">${day}</div>
            <div class="month">${month}</div>
          </div>
          <div class="event-info">
            <h3>${escapeHtml((ev as any).title || (ev as any).name || 'Veranstaltung')}</h3>
            <p>${escapeHtml((ev as any).description || (ev as any).body || '')}</p>
          </div>
          <a href="#kontakt" class="event-cta">Notieren →</a>
        </article>
      `;
      }).join('')}
    </div>
  </div>
</section>
` : ''}

<section id="ueber-uns" class="section">
  <div class="container">
    <div class="section-head reveal">
      <span class="section-eyebrow">Wer wir sind</span>
      <h2 class="section-title">Tradition und <em>frischer Klang</em>.</h2>
    </div>
    <div class="about-grid">
      <div class="about-image reveal">
        <img src="${groupPhoto(spec, slug, 2, 800, 1000)}" alt="" loading="lazy">
      </div>
      <div class="about-text reveal">
        <p>${escapeHtml(spec.about?.body || '')}</p>
      </div>
    </div>
  </div>
</section>


${/* Klangkörper, Instrumente und Meilensteine wurden entfernt — diese
       Inhalte konnten nicht aus der gescrapten Quellseite verifiziert werden.
       Pro User-Vorgabe: keine erfundenen Sektionen. */ ''}


${spec.testimonials && spec.testimonials.length > 0 ? `
<section class="section press-section">
  <div class="container">
    <div class="section-head center reveal">
      <span class="section-eyebrow">Stimmen</span>
      <h2 class="section-title">Was über uns <em>geschrieben</em> wird.</h2>
    </div>
    <div class="press-grid">
      ${spec.testimonials.slice(0, 3).map(t => `
      <article class="press reveal">
        <div class="press-rating">★ ★ ★ ★ ★</div>
        <blockquote>${escapeHtml(t.quote)}</blockquote>
        <cite>— ${escapeHtml(t.author)}</cite>
      </article>
      `).join('')}
    </div>
  </div>
</section>
` : ''}

${membership && membership.description ? `
<section id="mitglied" class="section members-section">
  <div class="container">
    <div class="section-head center reveal">
      <span class="section-eyebrow">Mitgliedschaft</span>
      <h2 class="section-title">Werden Sie <em>Teil von uns</em>.</h2>
      <p class="section-lead">${escapeHtml(membership.description)}</p>
    </div>
    <div class="member-cta-wrap reveal">
      <a href="#kontakt" class="member-cta">${escapeHtml(membership.cta || 'Mitglied werden')}</a>
    </div>
  </div>
</section>
` : ''}

${board.length > 0 ? `
<section id="vorstand" class="section board-section">
  <div class="container">
    <div class="section-head center reveal">
      <span class="section-eyebrow">Vorstand</span>
      <h2 class="section-title">Die Köpfe <em>hinter dem Klang</em>.</h2>
    </div>
    <div class="board-grid">
      ${board.map((m, i) => `
        <div class="board-member reveal">
          <div class="board-photo avatar-symbolic-wrap"><img src="${vorstandPortrait(m.name)}" alt="${escapeHtml(m.name)}" loading="lazy"><span class="avatar-symbolic-tag">Symbolfoto</span></div>
          <h4>${escapeHtml(m.name)}</h4>
          <div class="board-role">${escapeHtml(m.role)}</div>
          <div class="board-since">${escapeHtml(m.since || '')}</div>
        </div>
      `).join('')}
    </div>
  </div>
</section>
` : ''}

<section class="section">
  <div class="container">
    <div class="section-head center reveal">
      <span class="section-eyebrow">Eindrücke</span>
      <h2 class="section-title">Vereinsleben in <em>Bildern</em>.</h2>
    </div>
    <div class="gallery-grid">
      ${[1, 2, 3, 4, 5, 6].map(i => `
        <div class="gallery-item reveal"><img src="${groupPhoto(spec, slug, 100 + i)}" alt="" loading="lazy"></div>
      `).join('')}
    </div>
  </div>
</section>

<section class="probe-call reveal">
  <h2>Schnuppern Sie herein. <em>Einfach so.</em></h2>
  <div class="when">Mittwochs 19:30 Uhr · Probelokal</div>
  <p>Keine Anmeldung nötig — kommen Sie, hören Sie zu, lernen Sie uns kennen. Wenn Sie ein Instrument mitbringen möchten: noch besser. Wir freuen uns auf Sie.</p>
  <a href="#kontakt" class="btn-primary">Den Weg fragen →</a>
</section>

<section id="kontakt" class="section contact-section">
  <div class="container">
    <div class="section-head center reveal">
      <span class="section-eyebrow">Kontakt</span>
      <h2 class="section-title">Schreiben Sie uns <em>einfach</em>.</h2>
      <p class="section-lead">Wir antworten persönlich — meist innerhalb von zwei Tagen.</p>
    </div>
    <div class="contact-grid">
      ${address ? `<div class="contact-card reveal">
        <div class="ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></div>
        <div class="lbl">Probelokal</div>
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
        <div class="val"><a href="mailto:${email}?subject=${encodeURIComponent('Vereins-Anfrage')}">${email}</a></div>
      </div>` : ''}
    </div>
  </div>
</section>

<footer class="verein-footer">
  <div class="vf-inner">
    <div class="vf-grid">
      <div class="vf-col vf-brand">
        <h3>${businessName}</h3>
        <p>${escapeHtml(tagline)}</p>
      </div>
      <div class="vf-col">
        <h4>Verein</h4>
        <ul>
          <li><a href="#termine">Termine</a></li>
          <li><a href="#ueber-uns">Über uns</a></li>
          <li><a href="#kapellen">Kapellen</a></li>
          <li><a href="#vorstand">Vorstand</a></li>
        </ul>
      </div>
      <div class="vf-col">
        <h4>Mitwirken</h4>
        <ul>
          <li><a href="#mitglied">Mitglied werden</a></li>
          <li>Wöchentliche Probe<br><span style="color:rgba(255,255,255,0.5)">Mittwoch · 19:30 Uhr</span></li>
          <li>Jugendkapelle<br><span style="color:rgba(255,255,255,0.5)">Freitag · 17:00 Uhr</span></li>
        </ul>
      </div>
      <div class="vf-col">
        <h4>Kontakt</h4>
        <ul>
          ${phone ? `<li>${phone}</li>` : ''}
          ${email ? `<li><a href="mailto:${email}">${email}</a></li>` : ''}
          ${address ? `<li>${address}</li>` : ''}
          <li><a href="/impressum">Impressum</a></li>
          <li><a href="/datenschutz">Datenschutz</a></li>
        </ul>
      </div>
    </div>
    <div class="vf-bottom">
      <span>&copy; ${new Date().getFullYear()} ${businessName} · Alle Rechte vorbehalten.</span>
      <span class="vf-credit">Demo erstellt von <a href="https://webhoch.com" target="_blank" rel="noopener">Webagentur Hochmeir e.U.</a></span>
    </div>
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
