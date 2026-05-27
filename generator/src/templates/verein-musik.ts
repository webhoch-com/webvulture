/**
 * Verein template — Musik-, Sport-, Trachten- und Kulturvereine.
 * Warm regional aesthetic: cream + evergreen + brass-gold, traditional
 * yet modern, big group photos, prominent events calendar, membership
 * tiers card, board grid, gallery row, regional pride.
 */

import type { SiteSpec } from '../types.js';
import { getGalleryImage, getHeroImage, hasHeroImage, hasGalleryImages, galleryCount, getLogo, getFavicon } from './_media.js';
import { REDESIGNED_SECTIONS_CSS } from './_sections.js';
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
  extractHeritageMilestones,
  renderHeritageTimeline,
  extractEnsembles,
  renderEnsembleGrid,
  renderKuenstlerischeLeitung,
  EDITORIAL_CSS,
} from './_editorial.js';

/**
 * Generate a rough lat/lon bounding box around an address-string for use in an
 * OpenStreetMap embed. We don't have a geocoder client-side, so we fall back
 * to a fixed bounding box around Austria (which Vöcklabruck etc. all sit in).
 * Even with a wrong bbox the marker query string ensures the right pin is
 * shown when the user opens the map.
 */
function osmBbox(_address: string): string {
  // Austria-wide fallback. Marker query in the iframe URL pins the actual location.
  return '13.5,47.5,14.5,48.5';
}

function groupPhoto(spec: SiteSpec, slug: string, idx: number, w = 800, h = 600): string {
  return getGalleryImage(spec, slug, idx, w, h);
}

import { avatarPlaceholder, SYMBOLIC_TAG_CSS } from './_avatar.js';

function vorstandPortrait(name: string): string {
  return avatarPlaceholder(name, '#2d4a32');
}

export function renderVereinMusikPage(spec: SiteSpec, slug: string): string {
  const businessName = escapeHtml(spec.business_name);
  const tagline = spec.tagline;
  const headline = spec.hero.headline;
  const subhead = escapeHtml(spec.hero.subheadline);
  const ctaText = escapeHtml(spec.hero.cta_text || 'Probe besuchen');

  const phone = spec.contact.phone ? escapeHtml(spec.contact.phone) : '';
  const email = spec.contact.email ? escapeHtml(spec.contact.email) : '';
  const address = spec.contact.address ? escapeHtml(spec.contact.address) : '';

  // Pre-computed editorial data — all extractors are pure and module-shared.
  // Block-C v2: extractFoundedYear falls back to oldest milestone if no
  // before/after-trigger match, so milestones must be computed FIRST. We
  // also pass the pre-computed array to renderHeritageTimeline below so
  // the regex doesn't run twice per render.
  const heritageMilestones = extractHeritageMilestones(spec);
  const foundedYear = extractFoundedYear(spec);
  const marqueeItems = buildMarqueeItems(spec, foundedYear);
  const pullQuote = pickPullQuote(spec);
  // Events: prefer explicit spec.events (rarely populated), fall back to
  // regex extraction from text_content/sections. Both paths return [] when
  // nothing usable found → section is skipped.
  const events = (spec.events && spec.events.length > 0)
    ? spec.events.slice(0, 4)
    : extractEvents(spec);
  // Board: extracted from "Obmann: Name" patterns. Empty unless ≥2 valid
  // matches (single-match is usually a false-positive contact line).
  const board = extractBoardMembers(spec);

  // Block-C content: sub-band names → Ensemble-Grid, Kapellmeister →
  // Künstlerische-Leitung card. Both return '' / [] when source data is
  // insufficient — pure graceful-degrade, no invented content.
  // heritageMilestones is already computed above (must precede extractFoundedYear).
  const ensembles = extractEnsembles(spec);
  const kuenstlerischeLeitungHtml = renderKuenstlerischeLeitung(board);

  // Membership info comes from `spec.membership` only — we never invent
  // tiers/prices/features because we cannot verify them against the
  // prospect's actual offering.
  const membership = spec.membership;

  // Section-anchor numbering is driven by a CSS counter (see EDITORIAL_CSS
  // .section-anchor-wrap counter-increment + .section-anchor::before
  // counter() rules). No server-side counter needed — JS-removed wrappers
  // skip in the count automatically.

  // Brand-token resolution: real scraped values override the template's
  // hardcoded defaults. The CSS `color-mix()` calls derive `-soft` and `-deep`
  // shades from whatever primary we end up with, so darker prospects get
  // accordingly darker hover-states without us hand-tuning per club.
  // Strict allow-list of font-family characters and font-import hosts is
  // enforced upstream in the orchestrator — safe to interpolate raw here.
  // Warm-festive forcer: Verein-template is a TRACHTEN aesthetic — warm
  // wood + brass-gold + tannengrün + burgundy. Scraped brand colors are
  // often corporate-cold (Drupal-blau, WP-defaults). We KEEP the scraped
  // primary only if it's already in the warm spectrum (greens, browns,
  // burgundy, gold); otherwise force-fallback to Tannengrün so the
  // template always reads as warm/festive.
  const rawPrimary = spec.brand?.primary_color || '';
  const isWarmColor = (hex: string): boolean => {
    const m = hex.match(/^#?([0-9a-f]{6})$/i);
    if (!m) return false;
    const n = parseInt(m[1], 16);
    const r = (n >> 16) & 0xff, g = (n >> 8) & 0xff, b = n & 0xff;
    // Reject COLD/CORPORATE colors: high blue, low warmth
    if (b > r + 30 && b > g + 20) return false;  // blue-dominant
    if (r < 80 && g < 80 && b < 80) return false; // near-black
    if (r > 230 && g > 230 && b > 230) return false; // near-white
    // Accept warm: red/orange/brown/green/gold dominant
    return true;
  };
  const PRIMARY = isWarmColor(rawPrimary) ? rawPrimary : '#2d4a32';  // Tannengrün fallback
  const SECONDARY = isWarmColor(spec.brand?.secondary_color || '') ? spec.brand!.secondary_color! : PRIMARY;
  // Accent: always force brass-gold for the warm-festive aesthetic, unless
  // the scraped accent is itself a clearly warm color (gold/burgundy/orange).
  const rawAccent = spec.brand?.accent_color || '';
  const ACCENT = (isWarmColor(rawAccent) && rawAccent !== rawPrimary) ? rawAccent : '#b8893d';
  // PRIMARY als RGB-Tupel für den Hero-Overlay (CSS rgba() braucht Numbers).
  const primaryRgb = (() => {
    const m = PRIMARY.match(/^#?([0-9a-f]{6})$/i);
    if (!m) return { r: 28, g: 47, b: 31 };
    const n = parseInt(m[1], 16);
    return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
  })();
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
  ${renderSeoHead(spec, { slug, schemaKind: 'MusicGroup' })}
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

    .demo-banner { background: #1a0a1f; color:#fff; padding:0.55rem 1rem; font-size:0.82rem; position: sticky; top: 0; z-index: 200; border-bottom: 1px solid rgba(236,101,186,0.35); }
    .demo-banner-inner { max-width: 1280px; margin: 0 auto; display: flex; align-items: center; gap: 0.85rem; flex-wrap: wrap; justify-content: center; }
    .demo-banner-tag { font-size: 0.7rem; letter-spacing: 0.16em; text-transform: uppercase; padding: 0.18rem 0.55rem; border-radius: 999px; background: rgba(236,101,186,0.22); border: 1px solid rgba(236,101,186,0.5); color: #ffd6ee; font-weight: 700; white-space: nowrap; }
    .demo-banner a { color: #ffb3df; font-weight: 700; border-bottom: 1px solid rgba(255,179,223,0.45); }

    /* ─── Header ────────────────────────────────────────── */
    .nav { background: var(--bg); border-bottom: 1px solid var(--rule); position: sticky; top: 0; z-index: 50; }
    .nav-inner { max-width: 1300px; margin: 0 auto; padding: 1.1rem 1.5rem; display: flex; align-items: center; justify-content: space-between; gap: 1.5rem; }
    .brand-mark { font-family: var(--display); font-weight: 600; font-size: 1.4rem; line-height: 1.1; letter-spacing: -0.005em; display: inline-flex; align-items: center; gap: 0.85rem; max-width: 60vw; }
    .brand-logo { width: 76px; height: 76px; object-fit: contain; flex-shrink: 0; }
    @media (max-width: 720px) { .brand-logo { width: 56px; height: 56px; } }
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
    @media (max-width: 879px) { .nav-cta { display: none; } }

    /* ─── Hero — photo with WARM lower-third gradient (let photo breathe) ── */
    .hero {
      position: relative; min-height: clamp(560px, 84vh, 740px);
      ${hasHeroImage(spec)
        ? `background:
        /* Strong gradient ONLY at the bottom-third for text legibility,
           top 2/3 stays photo-bright. Sepia-warm tone instead of cold dark wash. */
        linear-gradient(to bottom, transparent 0%, transparent 45%, rgba(44,28,16,0.45) 70%, rgba(44,28,16,0.88) 100%),
        url('${getHeroImage(spec, slug)}') center/cover;`
        : `background:
        radial-gradient(ellipse at 20% 20%, rgba(184,137,61,0.22) 0%, transparent 55%),
        radial-gradient(ellipse at 80% 80%, rgba(45,74,50,0.6) 0%, transparent 50%),
        linear-gradient(135deg, #1c2f1f 0%, #2d4a32 60%, #1a2419 100%);`
      }
      display: flex; align-items: flex-end; padding: 4rem 1.5rem 5rem;
      color: #fff;
    }
    ${hasHeroImage(spec) ? '' : `
    .hero::before {
      content: ''; position: absolute; inset: 0;
      background-image: radial-gradient(circle at 1px 1px, rgba(243,229,193,0.06) 1px, transparent 0);
      background-size: 40px 40px;
      mask-image: radial-gradient(ellipse at center, black 30%, transparent 80%);
      pointer-events: none;
    }
    `}
    .hero-inner { max-width: 1100px; margin: 0 auto; width: 100%; position: relative; z-index: 2; }
    .hero-eyebrow {
      display: inline-flex; align-items: center; gap: 0.7rem;
      background: color-mix(in oklch, var(--accent) 28%, transparent);
      border: 1px solid color-mix(in oklch, var(--accent) 65%, transparent);
      color: #fff8e8; padding: 0.55rem 1.2rem; border-radius: 999px;
      font-size: 0.78rem; letter-spacing: 0.18em; text-transform: uppercase;
      font-family: var(--display); font-weight: 600;
      margin-bottom: 1.5rem;
      backdrop-filter: blur(8px);
      text-shadow: 0 1px 2px rgba(0,0,0,0.4);
    }
    .hero-eyebrow .crest { width: 18px; height: 18px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 0 3px color-mix(in oklch, var(--accent) 40%, transparent); }
    .hero h1 {
      font-family: var(--display); font-weight: 500;
      font-size: clamp(2.2rem, 6.5vw, 5rem); line-height: 1.05;
      letter-spacing: -0.025em; max-width: 18ch;
      text-wrap: balance;
      overflow-wrap: normal; word-break: normal; hyphens: manual;
      text-shadow: 0 2px 16px rgba(0,0,0,0.55);
    }
    .hero h1 em { font-style: italic; color: var(--accent); font-weight: 500; }
    .hero p { color: rgba(255,250,240,0.94); font-size: 1.2rem; margin-top: 1.5rem; max-width: 56ch; line-height: 1.65; font-family: var(--serif); text-shadow: 0 1px 8px rgba(0,0,0,0.6); }
    .hero-cta-row { display: flex; gap: 1rem; margin-top: 2rem; flex-wrap: wrap; }

    /* Rating pill — appears under the subhead only when rating ≥ 4.0 and ≥ 5
       reviews. The stars are styled with a tighter letter-spacing so the row
       reads as one badge, not five separate glyphs. */
    .hero-rating {
      display: inline-flex; align-items: center; gap: 0.7rem;
      margin-top: 1.5rem; padding: 0.45rem 1rem;
      background: rgba(255,255,255,0.10); border: 1px solid rgba(255,255,255,0.18);
      border-radius: 999px; backdrop-filter: blur(8px);
      font-family: var(--display); font-size: 0.85rem; color: #fff;
    }
    .hero-rating .stars { color: var(--accent); letter-spacing: 0.04em; font-size: 0.95rem; }
    .hero-rating .meta { color: rgba(255,255,255,0.75); font-weight: 500; }
    .hero-rating .meta strong { color: #fff; font-weight: 600; }

    /* Hero with no scraped image: editorial big-type layout. The previous
       gold-circle "crest" rendered like a placeholder bug — replaced with a
       large display-serif wordmark of the club name plus 3 horizontal brand-
       color stripes at the bottom. Intentionally loud, not apologetic. */
    .hero.hero-decor { display: flex; flex-direction: column; justify-content: space-between; min-height: clamp(560px, 84vh, 740px); padding: 4rem clamp(1.5rem, 5vw, 5rem); position: relative; }
    .hero-decor-bigtype {
      font-family: var(--display); font-weight: 500;
      font-size: clamp(3.5rem, 12vw, 11rem);
      line-height: 0.92; letter-spacing: -0.035em;
      color: rgba(255,255,255,0.95);
      max-width: 14ch; text-wrap: balance;
      margin-top: 4rem;
    }
    .hero-decor-stripes {
      display: flex; gap: 0; height: 8px; width: clamp(160px, 22vw, 280px);
      margin-top: 2rem; border-radius: 4px; overflow: hidden;
    }
    .hero-decor-stripes span { flex: 1; }
    .hero-decor-stripes .s-primary   { background: var(--primary); }
    .hero-decor-stripes .s-secondary { background: var(--secondary); }
    .hero-decor-stripes .s-accent    { background: var(--accent); }
    .hero-decor-since {
      font-family: var(--display); font-size: 0.95rem;
      letter-spacing: 0.16em; text-transform: uppercase;
      color: rgba(255,255,255,0.6); margin-top: 1rem;
    }
    .hero-decor-since strong { color: var(--accent); font-size: 1.1rem; letter-spacing: 0; font-weight: 600; }
    /* "Tradition-Anchor" — when foundedYear ≥ 50 years ago, show the
       count as a large editorial number in the hero corner. Subtle but
       it communicates pedigree at a glance. Position is absolute so it
       doesn't fight the bigtype wordmark for layout space. */
    .hero-tradition-anchor {
      position: absolute; top: clamp(5rem, 10vh, 8rem); right: clamp(1.5rem, 4vw, 4rem);
      text-align: right; pointer-events: none;
    }
    .hero-tradition-anchor .num {
      font-family: var(--display); font-weight: 500;
      font-size: clamp(4rem, 10vw, 8rem); line-height: 0.9;
      letter-spacing: -0.04em;
      color: var(--accent);
      display: block;
      text-shadow: 0 6px 24px rgba(0,0,0,0.3);
    }
    .hero-tradition-anchor .lbl {
      font-family: var(--display); font-size: 0.8rem;
      letter-spacing: 0.2em; text-transform: uppercase;
      color: rgba(255,255,255,0.7); margin-top: 0.5rem; display: block;
    }
    @media (max-width: 720px) {
      .hero-tradition-anchor { display: none; }  /* preserve hierarchy on mobile */
    }
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

    /* ─── Editorial premium patterns (2026 redesign) ─────────
       Section variants: --tone-cream | --tone-carbon | --tone-tint
       — alternating background "switches" between sections so the
       page reads as a magazine, not a single-tone wall of text. */
    .section.tone-cream  { background: var(--bg);    color: var(--ink); }
    .section.tone-tint   { background: color-mix(in oklch, var(--primary) 8%, white); color: var(--ink); }
    .section.tone-carbon {
      background: linear-gradient(180deg, var(--primary-deep) 0%, #0c1410 100%);
      color: #f3e9d3;
    }
    .section.tone-carbon .section-eyebrow { color: var(--accent); }
    .section.tone-carbon .section-eyebrow::before { background: var(--accent); }
    .section.tone-carbon .section-title { color: #fff; }
    .section.tone-carbon .section-title em { color: var(--accent); }
    .section.tone-carbon .section-lead { color: rgba(255,255,255,0.78); }

    /* Section divider — Trachten-Ornament statt magazine outline-numbers.
       Wider rule + central edelweiss-glyph. Subtle, festive, doesn't
       compete with content. */
    body { counter-reset: section-anchor; }
    .section-anchor-wrap {
      max-width: 920px; margin: 0 auto;
      padding: clamp(1.25rem, 3vw, 2.5rem) clamp(1.5rem, 5vw, 5rem);
      pointer-events: none;
      counter-increment: section-anchor;
      display: flex; align-items: center; justify-content: center;
      gap: 1.5rem;
    }
    .section-anchor-wrap::before,
    .section-anchor-wrap::after {
      content: ''; flex: 1; height: 1px;
      background: linear-gradient(to var(--dir, right),
        transparent,
        color-mix(in oklch, var(--accent) 40%, transparent) 40%,
        color-mix(in oklch, var(--accent) 40%, transparent) 60%,
        transparent);
    }
    .section-anchor-wrap::after { --dir: left; }
    .section-anchor {
      display: inline-flex; align-items: center; gap: 0.75rem;
      font-family: var(--display); font-weight: 500;
      font-size: 1.1rem; letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--accent);
      flex-shrink: 0;
    }
    .section-anchor::before {
      content: '✦'; font-size: 0.95rem; opacity: 0.85;
    }
    .section-anchor::after {
      content: counter(section-anchor, decimal-leading-zero);
      font-family: var(--display); font-weight: 600;
      font-size: 0.95rem; letter-spacing: 0.05em;
      color: color-mix(in oklch, var(--accent) 70%, var(--ink));
    }
    .section-anchor-wrap.on-dark .section-anchor,
    .section-anchor-wrap.on-dark .section-anchor::after {
      color: var(--accent);
    }
    .section-anchor-wrap.on-dark::before,
    .section-anchor-wrap.on-dark::after {
      background: linear-gradient(to var(--dir, right),
        transparent,
        rgba(255,255,255,0.25) 40%,
        rgba(255,255,255,0.25) 60%,
        transparent);
    }
    .section.tone-carbon + .section-anchor-wrap .section-anchor,
    .section-anchor-wrap.on-dark .section-anchor {
      -webkit-text-stroke-color: rgba(255,255,255,0.35);
    }

    /* Marquee strip — slow horizontal scroll of club values + dates.
       Pause-on-hover for a11y. */
    .marquee {
      background: var(--primary-deep); color: var(--accent);
      padding: 1.1rem 0; overflow: hidden; position: relative;
      border-top: 1px solid color-mix(in oklch, var(--accent) 30%, transparent);
      border-bottom: 1px solid color-mix(in oklch, var(--accent) 30%, transparent);
    }
    .marquee-track {
      display: inline-flex; gap: 3rem; padding-left: 3rem;
      white-space: nowrap; animation: wv-marquee 36s linear infinite;
      font-family: var(--display); font-weight: 500;
      font-size: clamp(1rem, 1.6vw, 1.35rem);
      letter-spacing: 0.04em;
    }
    .marquee-track span::before {
      content: "✦"; margin-right: 3rem; color: rgba(255,255,255,0.35);
    }
    .marquee:hover .marquee-track { animation-play-state: paused; }
    @keyframes wv-marquee {
      from { transform: translateX(0); }
      to   { transform: translateX(-50%); }
    }
    @media (prefers-reduced-motion: reduce) {
      .marquee-track { animation: none; }
    }

    /* Pull-quote section — large editorial quote, deep brand background. */
    .pullquote-section {
      background: linear-gradient(135deg, var(--primary) 0%, var(--primary-deep) 100%);
      color: #fff; padding: clamp(5rem, 10vw, 9rem) 1.5rem;
      border-top: 4px solid var(--accent);
      border-bottom: 4px solid var(--accent);
      position: relative;
    }
    .pullquote-inner { max-width: 1100px; margin: 0 auto; }
    .pullquote-mark {
      font-family: var(--display); font-weight: 700;
      font-size: clamp(6rem, 12vw, 10rem); line-height: 0.7;
      color: var(--accent); opacity: 0.85;
      margin-bottom: 1rem;
    }
    .pullquote-text {
      font-family: var(--display); font-style: italic; font-weight: 400;
      font-size: clamp(1.7rem, 4vw, 3.4rem);
      line-height: 1.22; letter-spacing: -0.015em;
      color: #fff; max-width: 28ch; text-wrap: balance;
    }
    .pullquote-byline {
      margin-top: 2rem; display: inline-flex; align-items: center; gap: 1rem;
      font-family: var(--display); font-size: 0.92rem;
      letter-spacing: 0.16em; text-transform: uppercase;
      color: var(--accent); font-weight: 600;
    }
    .pullquote-byline::before { content: ""; width: 36px; height: 1.5px; background: var(--accent); }

    /* "Stories" cards — editorial magazine grid for redesigned_sections.
       Replaces the previous linear sequence of equal-height blocks. */
    .stories-section { padding: clamp(3.25rem, 6vw, 5.5rem) 1.5rem; background: var(--bg); }
    .stories-grid {
      max-width: 1300px; margin: 4rem auto 0;
      display: grid; gap: 3rem;
      grid-template-columns: 1fr;
    }
    @media (min-width: 880px) {
      .stories-grid { grid-template-columns: repeat(2, 1fr); gap: 4rem 3rem; }
      .stories-grid > article:nth-child(3n+1) { grid-column: span 2; }
    }
    .story-card {
      display: flex; flex-direction: column; gap: 1.25rem;
      padding-bottom: 2rem; border-bottom: 1px solid var(--rule);
    }
    .story-card .story-num {
      font-family: var(--display); font-size: 0.82rem;
      color: var(--accent); letter-spacing: 0.22em;
      text-transform: uppercase; font-weight: 600;
    }
    .story-card h3 {
      font-family: var(--display); font-weight: 500;
      font-size: clamp(1.8rem, 3.4vw, 2.6rem);
      line-height: 1.1; letter-spacing: -0.015em;
      color: var(--ink);
    }
    .story-card h3 em { color: var(--primary); font-style: italic; }
    .story-card p {
      color: var(--ink-2); font-size: 1.02rem; line-height: 1.75;
      font-family: var(--serif);
    }

    /* XXL footer wordmark variant — big-type club name as the main bottom
       statement (Awwwards-2025 pattern). Sits ABOVE the existing vf-grid. */
    .vf-wordmark {
      font-family: var(--display); font-weight: 600;
      font-size: clamp(3rem, 12vw, 11rem); line-height: 0.92;
      letter-spacing: -0.04em; color: #fff;
      padding-bottom: clamp(2rem, 4vw, 3rem);
      border-bottom: 1px solid rgba(255,255,255,0.10);
      margin-bottom: clamp(2.5rem, 5vw, 4rem);
      max-width: 100%; word-break: break-word;
    }
    .vf-wordmark .accent { color: var(--accent); }

    /* ─── Section base ───────────────────────────────────── */
    .section { padding: clamp(3.25rem, 6vw, 5.5rem) 1.5rem; }
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
    .event:hover { transform: translateY(-3px); box-shadow: 0 16px 32px -16px rgba(${primaryRgb.r},${primaryRgb.g},${primaryRgb.b},0.18); }
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
    .about-image { position: relative; border-radius: 12px; overflow: hidden; box-shadow: 0 24px 60px -28px rgba(${primaryRgb.r},${primaryRgb.g},${primaryRgb.b},0.4); background: var(--primary-deep); display: grid; place-items: center; min-height: 400px; max-height: 640px; }
    .about-image img { width: 100%; height: auto; max-height: 640px; object-fit: contain; }
    .about-image .badge {
      position: absolute; bottom: 1.5rem; left: -1.25rem;
      background: var(--primary); color: var(--accent);
      padding: 1rem 1.4rem; border-radius: 8px;
      font-family: var(--display); font-size: 0.85rem;
      letter-spacing: 0.12em; text-transform: uppercase;
      box-shadow: 0 14px 30px -14px rgba(${primaryRgb.r},${primaryRgb.g},${primaryRgb.b},0.5);
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
      box-shadow: 0 18px 40px -18px rgba(${primaryRgb.r},${primaryRgb.g},${primaryRgb.b},0.4);
    }
    .member-cta:hover { transform: translateY(-2px); box-shadow: 0 24px 50px -18px rgba(${primaryRgb.r},${primaryRgb.g},${primaryRgb.b},0.5); }

    /* Members-Section is the simple CTA wrapper (.member-cta-wrap above).
       The 3-tier-pricing block was removed: we never have verified per-tier
       data and the placeholder rendered as obvious filler. */
    .members-section { background: var(--bg-2); position: relative; }
    .member-perks {
      display: grid; gap: 1.25rem; max-width: 1100px; margin: 3rem auto 1rem;
      grid-template-columns: 1fr;
    }
    @media (min-width: 760px) { .member-perks { grid-template-columns: repeat(3, 1fr); gap: 2rem; } }
    .member-perk {
      display: flex; gap: 1.25rem; align-items: flex-start;
      background: var(--surface);
      padding: 1.75rem 1.5rem;
      border-radius: 10px;
      border-left: 3px solid var(--accent);
      transition: transform .25s ease, box-shadow .25s ease;
    }
    .member-perk:hover { transform: translateY(-3px); box-shadow: 0 14px 28px -12px rgba(45,74,50,0.18); }
    .member-perk svg {
      width: 42px; height: 42px; flex-shrink: 0;
      color: var(--primary);
      padding: 8px; background: color-mix(in oklch, var(--primary) 8%, white);
      border-radius: 50%;
    }
    .member-perk strong {
      display: block;
      font-family: var(--display); font-size: 1.05rem; font-weight: 600;
      color: var(--ink); margin-bottom: 0.25rem;
    }
    .member-perk span {
      display: block;
      font-family: var(--serif); font-size: 0.92rem; line-height: 1.55;
      color: var(--ink-2);
    }

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
      border: 4px solid var(--surface); box-shadow: 0 14px 32px -16px rgba(${primaryRgb.r},${primaryRgb.g},${primaryRgb.b},0.3);
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
    .gallery-item { position: relative; aspect-ratio: 4/3; overflow: hidden; border-radius: 8px; background: var(--primary-deep); display: grid; place-items: center; }
    .gallery-item img { width: 100%; height: 100%; object-fit: cover; transition: transform 1s ease; }
    /* Panorama / portrait images: contain instead of cover so they don't get sliced. */
    @supports (aspect-ratio: 1) {
      .gallery-item img[data-shape="panorama"], .gallery-item img[data-shape="portrait"] {
        object-fit: contain; max-width: 100%; max-height: 100%;
      }
    }
    .gallery-item { cursor: pointer; }
    .gallery-item::after {
      content: '⤢'; position: absolute; top: 0.75rem; right: 0.75rem;
      width: 36px; height: 36px; border-radius: 50%;
      background: rgba(0,0,0,0.55); color: #fff;
      display: grid; place-items: center; font-size: 1.1rem;
      opacity: 0; transition: opacity .25s, transform .25s;
      transform: scale(0.85);
      pointer-events: none;
    }
    .gallery-item:hover::after { opacity: 1; transform: scale(1); }
    .gallery-item:hover img { transform: scale(1.06); }

    /* ─── Lightbox modal ─────────────────────────────────── */
    .wv-lightbox {
      position: fixed; inset: 0; z-index: 9999;
      background: rgba(20, 16, 8, 0);
      display: none;
      align-items: center; justify-content: center;
      padding: clamp(1rem, 4vw, 3rem);
      backdrop-filter: blur(0px);
      transition: background 0.35s ease, backdrop-filter 0.35s ease;
    }
    .wv-lightbox.is-open { display: flex; background: rgba(20, 16, 8, 0.92); backdrop-filter: blur(8px); }
    .wv-lightbox-stage {
      position: relative;
      max-width: 95vw; max-height: 90vh;
      transform: scale(0.92); opacity: 0;
      transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.35s ease;
    }
    .wv-lightbox.is-open .wv-lightbox-stage { transform: scale(1); opacity: 1; }
    .wv-lightbox-stage img { max-width: 95vw; max-height: 90vh; display: block; border-radius: 6px; box-shadow: 0 25px 80px rgba(0,0,0,0.5); }
    .wv-lightbox-close, .wv-lightbox-prev, .wv-lightbox-next {
      position: absolute; background: rgba(255,255,255,0.12); color: #fff;
      border: 0; border-radius: 50%; width: 48px; height: 48px;
      cursor: pointer; font-size: 1.4rem; line-height: 1;
      transition: background .2s, transform .2s;
      display: grid; place-items: center;
    }
    .wv-lightbox-close:hover, .wv-lightbox-prev:hover, .wv-lightbox-next:hover { background: rgba(255,255,255,0.25); transform: scale(1.08); }
    .wv-lightbox-close { top: clamp(1rem, 3vw, 2rem); right: clamp(1rem, 3vw, 2rem); }
    .wv-lightbox-prev  { top: 50%; left: clamp(0.5rem, 2vw, 2rem); transform: translateY(-50%); }
    .wv-lightbox-next  { top: 50%; right: clamp(0.5rem, 2vw, 2rem); transform: translateY(-50%); }
    .wv-lightbox-prev:hover, .wv-lightbox-next:hover { transform: translateY(-50%) scale(1.08); }
    .wv-lightbox-counter {
      position: absolute; bottom: clamp(1rem, 3vw, 2rem); left: 50%;
      transform: translateX(-50%); color: rgba(255,255,255,0.7);
      font-family: var(--display); font-size: 0.85rem;
      letter-spacing: 0.15em; text-transform: uppercase;
    }

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

    /* Reveal-on-scroll: subtle fade-up of major content blocks. The
       @media(prefers-reduced-motion) override + the JS fallback (auto
       .is-visible after 800ms) guarantee content is always visible even
       if IntersectionObserver fires late or JS throws. */
    .reveal { opacity: 0; transform: translateY(24px); transition: opacity 0.7s cubic-bezier(0.25,0.46,0.45,0.94), transform 0.7s cubic-bezier(0.25,0.46,0.45,0.94); }
    .reveal.is-visible { opacity: 1; transform: translateY(0); }
    .reveal[data-stagger]:not(:first-child) { transition-delay: var(--stagger-delay, 0s); }
    @media (prefers-reduced-motion: reduce) {
      .reveal { opacity: 1; transform: none; transition: none; }
    }
    /* Count-up: applied to .count-up numeric elements via JS. The number
       starts at 0 and animates to its data-target over ~1.4s with easing.
       Fallback: when JS doesn't run, the inner text is the final value. */
    .count-up { font-variant-numeric: tabular-nums; }
    /* Parallax hero photo: subtle 1.08x scale on the hero img + slow
       translateY via scroll-linked transform (CSS-only with scroll-driven
       animations where supported). Reduces to no-op on older browsers. */
    @supports (animation-timeline: scroll()) {
      .hero.hero-with-image .hero-bg { animation: heroParallax linear; animation-timeline: scroll(); animation-range: 0 100vh; }
    }
    @keyframes heroParallax {
      from { transform: scale(1.05) translateY(0); }
      to   { transform: scale(1.12) translateY(40px); }
    }
    /* Decorative SVG notes-pattern background for empty/sparse sections.
       Subtle, low-opacity, brand-color-tinted. */
    .pattern-notes::before {
      content: ''; position: absolute; inset: 0; pointer-events: none;
      background-image:
        radial-gradient(circle 2px at 20% 30%, var(--accent) 99%, transparent 100%),
        radial-gradient(circle 1.5px at 80% 60%, var(--accent) 99%, transparent 100%),
        radial-gradient(circle 1px at 50% 80%, var(--accent) 99%, transparent 100%),
        radial-gradient(circle 1.5px at 35% 70%, var(--accent) 99%, transparent 100%),
        radial-gradient(circle 1px at 65% 20%, var(--accent) 99%, transparent 100%);
      background-size: 200px 200px;
      opacity: 0.08;
      mask-image: linear-gradient(to bottom, transparent, black 30%, black 70%, transparent);
    }
    /* SVG ornamental dividers between sections — treble-clef-inspired. */
    .ornament-divider {
      display: flex; align-items: center; justify-content: center;
      gap: 1.25rem; margin: 0 auto; max-width: 200px;
      color: var(--accent); opacity: 0.5;
    }
    .ornament-divider::before, .ornament-divider::after {
      content: ''; flex: 1; height: 1px; background: currentColor;
    }
    .ornament-divider svg { width: 22px; height: 22px; fill: currentColor; }

    /* Ensembles/Klangkörper, Instrumente and Meilensteine CSS blocks were
       removed in 2026-05 — their markup was deleted earlier because we cannot
       verify the data, leaving the styles as 280 lines of dead weight. */

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

    /* ─── Editorial ornaments ────────────────────────────── */
    .ornament-divider {
      display: flex; align-items: center; justify-content: center;
      gap: 1.5rem; padding: 3.5rem 1.5rem 0;
      max-width: 480px; margin: 0 auto;
    }
    .ornament-divider span:not(.diamond) {
      flex: 1; height: 1px;
      background: linear-gradient(to right, transparent 0%, var(--accent) 50%, transparent 100%);
      opacity: 0.55;
    }
    .ornament-divider .diamond {
      color: var(--accent); font-size: 0.7rem; opacity: 0.7;
    }
    .dropcap::first-letter {
      font-family: var(--display); font-size: 4em; font-weight: 600;
      float: left; line-height: 0.85;
      margin: 0.15em 0.18em 0 0;
      color: var(--accent);
    }

    /* Mission-section CSS removed — replaced by .pullquote-* above. */

    /* ─── Anfahrt-Section mit Map ─── */
    .anfahrt-section { padding: clamp(4.5rem, 8vw, 7rem) 1.5rem; background: var(--bg); }
    .anfahrt-grid {
      max-width: 1200px; margin: 0 auto;
      display: grid; gap: 3rem; align-items: center;
    }
    @media (min-width: 880px) { .anfahrt-grid { grid-template-columns: 1fr 1.4fr; gap: 4rem; } }
    .anfahrt-text .section-title { margin-bottom: 1.75rem; }
    .anfahrt-address {
      font-style: normal; font-size: 1.1rem; color: var(--ink-2);
      line-height: 1.6; padding: 1.25rem 1.5rem;
      background: var(--surface); border-left: 3px solid var(--accent);
      margin-bottom: 1.5rem;
    }
    .anfahrt-link {
      display: inline-flex; align-items: center; gap: 0.5rem;
      color: var(--primary); font-weight: 600; font-size: 1rem;
      padding: 0.75rem 0; border-bottom: 1px solid var(--rule);
    }
    .anfahrt-link:hover { color: var(--primary-deep); }
    .anfahrt-map { position: relative; min-height: 420px; }
    .anfahrt-map iframe { display: block; width: 100%; height: 420px; border: 0; border-radius: 8px; }
    .anfahrt-fallback {
      display: inline-block; margin-top: 0.75rem; font-size: 0.9rem;
      color: var(--primary); font-weight: 500;
    }
    /* Map-Placeholder bis Cookie-Consent erteilt wird */
    .anfahrt-map-placeholder {
      width: 100%; height: 420px; border-radius: 8px;
      background:
        repeating-linear-gradient(45deg, color-mix(in oklch, var(--primary) 6%, white) 0 12px, color-mix(in oklch, var(--primary) 9%, white) 12px 24px),
        color-mix(in oklch, var(--primary) 6%, white);
      border: 1px solid var(--rule);
      display: grid; place-items: center;
      text-align: center; padding: 2rem;
    }
    .map-ph-content { max-width: 360px; }
    .map-ph-content svg { color: var(--primary); margin-bottom: 0.75rem; opacity: 0.7; }
    .map-ph-content h3 { font-family: var(--display); font-size: 1.35rem; color: var(--ink); margin-bottom: 0.6rem; }
    .map-ph-content p { color: var(--ink-2); font-size: 0.95rem; line-height: 1.55; margin-bottom: 1.25rem; }
    .map-load-btn {
      background: var(--primary); color: #fff;
      padding: 0.75rem 1.5rem; border-radius: 6px; border: 0;
      font-family: var(--display); font-weight: 600; font-size: 0.95rem;
      cursor: pointer; transition: background .2s, transform .2s;
    }
    .map-load-btn:hover { background: var(--primary-deep); transform: translateY(-1px); }
    .map-ph-fallback {
      display: block; margin-top: 1rem; font-size: 0.85rem;
      color: var(--ink-3); text-decoration: underline;
    }

    /* ─── Cookie-Banner (CSS-only sliding up) ─── */
    .wv-cookie {
      position: fixed; bottom: 0; left: 0; right: 0; z-index: 200;
      background: var(--ink); color: rgba(255,250,240,0.95);
      padding: 1.25rem clamp(1rem, 4vw, 2.5rem);
      box-shadow: 0 -20px 50px -10px rgba(0,0,0,0.35);
      transform: translateY(100%);
      transition: transform 0.45s cubic-bezier(0.4, 0, 0.2, 1);
      border-top: 3px solid var(--accent);
    }
    .wv-cookie.is-visible { transform: translateY(0); }
    .wv-cookie-inner {
      max-width: 1280px; margin: 0 auto;
      display: grid; gap: 1.25rem; align-items: center;
      grid-template-columns: 1fr;
    }
    @media (min-width: 880px) { .wv-cookie-inner { grid-template-columns: 1fr auto; } }
    .wv-cookie h3 {
      font-family: var(--display); font-size: 1.05rem; font-weight: 600;
      margin-bottom: 0.35rem; color: #fff;
    }
    .wv-cookie p {
      font-size: 0.88rem; line-height: 1.55; color: rgba(255,250,240,0.78);
      font-family: var(--serif);
    }
    .wv-cookie p a {
      color: var(--accent); text-decoration: underline;
      text-underline-offset: 2px;
    }
    .wv-cookie-actions {
      display: flex; gap: 0.75rem; flex-wrap: wrap;
      justify-content: flex-start;
    }
    @media (min-width: 880px) { .wv-cookie-actions { justify-content: flex-end; } }
    .wv-cookie-btn {
      padding: 0.7rem 1.4rem; border: 0; border-radius: 6px;
      font-family: var(--display); font-weight: 600; font-size: 0.9rem;
      cursor: pointer; transition: transform .2s, background .2s;
      white-space: nowrap;
    }
    .wv-cookie-btn-primary { background: var(--accent); color: var(--ink); }
    .wv-cookie-btn-primary:hover { background: color-mix(in oklch, var(--accent) 80%, white); transform: translateY(-1px); }
    .wv-cookie-btn-secondary { background: transparent; color: rgba(255,250,240,0.85); border: 1px solid rgba(255,250,240,0.3); }
    .wv-cookie-btn-secondary:hover { background: rgba(255,250,240,0.08); border-color: rgba(255,250,240,0.5); }

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
    .vf-brand h3 { font-family: var(--display); font-weight: 500; font-size: 1.5rem; color: #fff; margin: 0 0 0.65rem; line-height: 1.15; }
    .vf-brand p { font-size: 0.95rem; line-height: 1.65; max-width: 36ch; margin: 0 0 1.25rem; color: rgba(255,255,255,0.55); }
    .vf-bottom { display: flex; flex-wrap: wrap; gap: 1rem; justify-content: space-between; align-items: center; padding-top: 2rem; font-size: 0.84rem; color: rgba(255,255,255,0.45); }
    .vf-credit a { color: rgba(255,255,255,0.6); font-weight: 500; border-bottom: 1px solid rgba(255,255,255,0.18); transition: all .25s; }
    .vf-credit a:hover { color: var(--accent); border-color: var(--accent); }

    /* Social-icon strip — surfaces scraped Facebook/Instagram/etc. handles
       as a discreet row in the footer. SVG-only (no external icon-fonts) to
       keep the page weight unchanged. */
    .vf-socials {
      display: flex; gap: 0.65rem; align-items: center;
      padding-top: 1.5rem; margin-top: 1.5rem;
      border-top: 1px solid rgba(255,255,255,0.08);
    }
    .vf-socials a {
      width: 40px; height: 40px; border-radius: 50%;
      display: grid; place-items: center;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.10);
      color: rgba(255,255,255,0.7);
      transition: background .2s, color .2s, transform .2s;
    }
    .vf-socials a:hover { background: var(--accent); color: var(--ink); transform: translateY(-2px); }
    .vf-socials svg { width: 18px; height: 18px; }

    /* ─── Redesigned-sections partial (premium re-rendering of the
       prospect's actual H2/H3 sections). The CSS uses --rd-* variables
       which we map to the verein-musik palette here so the partial
       inherits the host template's character. ─── */
    :root {
      --rd-serif: var(--display);
      --rd-sans: var(--body);
      --rd-accent: var(--accent);
      --rd-fg: var(--ink);
      --rd-alt-bg: var(--bg-2);
    }
    ${REDESIGNED_SECTIONS_CSS}
    ${EDITORIAL_CSS}
  </style>
</head>
<body>

<div class="demo-banner" role="contentinfo">
  <div class="demo-banner-inner">
    <span class="demo-banner-tag">Unverbindlicher Demo-Entwurf</span>
    <span class="demo-banner-text">
      Erstellt von <a href="https://webhoch.com" target="_blank" rel="noopener">Webagentur Hochmeir e.U.</a>
      auf Basis öffentlich verfügbarer Daten von <strong>${businessName}</strong>.
      Widerspruch &amp; Löschung an <a href="mailto:hello@webhoch.com">hello@webhoch.com</a> ·
      <a href="https://webhoch.com/#contact" target="_blank" rel="noopener">Beratung anfragen</a>
    </span>
  </div>
</div>

<header class="nav">
  <div class="nav-inner">
    <a class="brand-mark" href="#">${getLogo(spec)
      ? `<img class="brand-logo" src="${escapeHtml(getLogo(spec)!)}" alt="${escapeHtml(spec.business_name)} Logo" width="76" height="76" />`
      : `<span class="brand-crest">${escapeHtml(spec.business_name.split(/\s+/).map(w => w[0] || '').slice(0, 2).join('').toUpperCase() || 'V')}</span>`
    }${businessName}</a>
    <input type="checkbox" id="nav-toggle" class="nav-toggle" aria-label="Menü öffnen" />
    <label for="nav-toggle" class="nav-burger" aria-hidden="true"><span></span></label>
    <nav class="main-nav">
      ${events.length > 0 ? '<a href="#termine">Termine</a>' : ''}
      ${spec.about?.body ? '<a href="#ueber-uns">Über uns</a>' : ''}
      ${(membership && membership.description) ? '<a href="#mitglied">Mitglied werden</a>' : ''}
      ${galleryCount(spec) >= 1 ? '<a href="#bilder">Bilder</a>' : ''}
      <a href="#kontakt">Kontakt</a>
    </nav>
    <a href="#kontakt" class="nav-cta">${ctaText}</a>
  </div>
</header>

<section class="hero ${hasHeroImage(spec) ? 'hero-with-image' : 'hero-decor'}">
  <div class="hero-inner">
    <span class="hero-eyebrow"><span class="crest"></span>${escapeHtml(tagline.slice(0, 70))}</span>
    <h1>${escapeHtml(headline.replace(/(\.|!|\?)([^.!?]*)$/, '|$1$2|')).replace(/\|([^|]+)\|/, '<em>$1</em>')}</h1>
    <p>${subhead}</p>
    ${renderRatingPill(spec)}
    <div class="hero-cta-row">
      <a href="#kontakt" class="btn-primary">${ctaText} →</a>
      ${events.length > 0 ? '<a href="#termine" class="btn-outline">Nächste Termine</a>' : ''}
    </div>
  </div>
  ${hasHeroImage(spec) ? '' : (() => {
    const currentYear = new Date().getFullYear();
    const yearsSince = foundedYear ? currentYear - foundedYear : 0;
    return `
  ${(foundedYear && yearsSince >= 50) ? `
  <div class="hero-tradition-anchor" aria-hidden="true">
    <span class="num">${yearsSince}</span>
    <span class="lbl">Jahre Tradition</span>
  </div>` : ''}
  <div class="hero-decor-bigtype" aria-hidden="true">${escapeHtml(businessName)}</div>
  <div>
    <div class="hero-decor-stripes" aria-hidden="true">
      <span class="s-primary"></span>
      <span class="s-secondary"></span>
      <span class="s-accent"></span>
    </div>
    ${foundedYear ? `<div class="hero-decor-since">Seit <strong>${foundedYear}</strong> · ${yearsSince} Jahre in der Region</div>` : ''}
  </div>`;
  })()}
</section>

${marqueeItems.length > 0 ? `
<div class="marquee" aria-hidden="true">
  <div class="marquee-track">${marqueeItems.map(i => `<span>${escapeHtml(i)}</span>`).join('')}</div>
</div>
` : ''}

${renderHeritageStatement(spec, foundedYear)}

${renderHeritageTimeline(heritageMilestones)}

${events.length > 0 ? `
<div class="section-anchor-wrap on-dark"><span class="section-anchor" aria-hidden="true"></span></div>
${renderEventsSection(events.map(ev => ({
  date: (ev as any).date || '',
  title: (ev as any).title || (ev as any).name || 'Veranstaltung',
})))}
` : ''}

${spec.about?.body ? (() => {
  // Block-G polish: derive a personalized eyebrow from the business name when
  // it begins with a recognizable Verein-prefix. Falls back to the generic
  // "Wer wir sind" when the name doesn't match a known pattern.
  const VEREIN_PREFIX_RE = /^(Musikverein|Musikkapelle|MV|Trachtenmusikkapelle|TMK|Stadtmusikkapelle|Bürgerkapelle|Marktmusik|Werkskapelle)\b\s*/i;
  const match = spec.business_name.match(VEREIN_PREFIX_RE);
  const place = match ? spec.business_name.slice(match[0].length).replace(/^\W+/, '').trim() : '';
  const ueberTitle = place ? `Der Musikverein <em>${escapeHtml(place)}</em>.` : 'Über <em>uns</em>.';
  return `
<div class="section-anchor-wrap"><span class="section-anchor" aria-hidden="true"></span></div>
<section id="ueber-uns" class="section tone-tint">
  <div class="container">
    <div class="section-head">
      <span class="section-eyebrow">Wer wir sind</span>
      <h2 class="section-title">${ueberTitle}</h2>
    </div>
    <div class="about-text" style="max-width: 760px; margin: 0 auto;">
      <p class="dropcap">${(() => {
        // Sanitize about-body before rendering. Scraped Vereinsseiten often
        // concatenate the about-paragraph with an event-feed sidebar (Social
        // Media · Frühschoppen · Gestern (17. Mai)... · 🎶🥁) — the LLM that
        // produces about.body sometimes preserves the join, producing a
        // dropcap that reads as broken mid-sentence. Strip everything after
        // a clear feed-pollution marker. Also strip leading non-letter chars
        // so :first-letter never renders a digit.
        const FEED_MARKER = /\s*(?:Social Media|Frühschoppen|Save the date|Save-the-date|Gestern\b|Heute\b|Morgen\b|Kirchenkonzert\b|Maiblasen\b|🎶|🥁|☀️|⛪️|»\s*Bildergalerie|» Seiten|nächste Seite|🎵|🎺|Neuigkeiten und Termine|Der erste wichtige Termin|Der nächste\s+(?:wichtige\s+)?Termin|Frühlingskonzert|Frühlngskonzert|Herbstkonzert|Adventskonzert|in diesem Jahr,\s+das|Termin in diesem Jahr|Konzertwertung|haben\s+wir\s+(?:bereits|schon)|fand\s+statt|Folgen Sie uns|Termin\s*[:.]|Veranstaltung\s*[:.])/i;
        let body = spec.about!.body.trim();
        // Strip leading non-letter chars (digits, punctuation) so the dropcap
        // never renders a non-letter as the giant first-letter.
        body = body.replace(/^[^A-Za-zÄÖÜäöü(]+/, '');
        // If body now starts with a lowercase letter (the prefix sentence was
        // chopped server-side, e.g. Bruckmühl "...als Feuerwehr-Musikkapelle"),
        // skip to the next sentence so the dropcap is a real uppercase start.
        if (/^[a-zäöüß]/.test(body)) {
          const nextSentence = body.search(/[.!?]\s+[A-ZÄÖÜ]/);
          if (nextSentence > 0 && nextSentence < body.length - 10) {
            body = body.slice(nextSentence + 1).trim();
          }
        }
        // Walk ALL feed-marker positions; pick the EARLIEST that's ≥80 chars
        // into the body so we don't chop a legit opening sentence containing
        // a marker word ("Die Neuigkeiten und Termine sind wichtig...") but
        // still catch a marker that follows after substantive content. If
        // body is shorter than 80 and starts with a marker, cut anyway.
        const re = new RegExp(FEED_MARKER.source, FEED_MARKER.flags + 'g');
        let bestCut = -1;
        for (const m of body.matchAll(re)) {
          const pos = m.index ?? -1;
          if (pos >= 80) { bestCut = pos; break; }  // first one past 80 wins
        }
        // Aggressive markers always cut regardless of position (these are
        // never legit body content — emoji feed-rows, "Save the date").
        // HARD_MARKER cuts at any position ≥20. These are never legit
        // body content for a Verein about-section.
        const HARD_MARKER = /\s*(?:🎶|🥁|☀️|⛪️|🎵|🎺|Save the date|Save-the-date|»\s*Bildergalerie|» Seiten|nächste Seite|Social Media\b|Frühschoppen\b|Frühlingskonzert\b|Frühlngskonzert\b|Herbstkonzert\b|Adventskonzert\b|Kirchenkonzert\b|Maiblasen\b|Gestern\b|Heute\b|Morgen\b|Save\s+the\s+date|Folgen\s+Sie\s+uns|Wir\s+freuen\s+uns\s+auf)/i;
        const hardCut = body.search(HARD_MARKER);
        if (hardCut >= 20 && (bestCut < 0 || hardCut < bestCut)) bestCut = hardCut;
        if (bestCut > 0) body = body.slice(0, bestCut).replace(/\s+\S{0,12}$/, '').trim();
        // Drop trailing dangling open-parens and incomplete clauses
        body = body.replace(/\s*\([^)]{0,3}\s*$/, '').trim();
        return escapeHtml(body);
      })()}</p>
    </div>
  </div>
</section>`;
})() : ''}

${renderEnsembleGrid(ensembles)}

${pullQuote ? `
<section class="pullquote-section">
  <div class="pullquote-inner">
    <div class="pullquote-mark" aria-hidden="true">"</div>
    <blockquote class="pullquote-text">${escapeHtml(pullQuote)}</blockquote>
    <div class="pullquote-byline">${escapeHtml(businessName)}</div>
  </div>
</section>
` : ''}

${kuenstlerischeLeitungHtml}

${/* Klangkörper, Instrumente und Meilensteine wurden entfernt — diese
       Inhalte konnten nicht aus der gescrapten Quellseite verifiziert werden.
       Pro User-Vorgabe: keine erfundenen Sektionen. */ ''}


${spec.testimonials && spec.testimonials.length > 0 ? `
<div class="section-anchor-wrap"><span class="section-anchor" aria-hidden="true"></span></div>
<section class="section press-section tone-tint">
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

${(spec.redesigned_sections && spec.redesigned_sections.length > 0) ? `
<div class="section-anchor-wrap"><span class="section-anchor" aria-hidden="true"></span></div>
<section class="stories-section">
  <div class="container">
    <div class="section-head">
      <span class="section-eyebrow">Aus Ihrer Webseite — neu interpretiert</span>
      <h2 class="section-title">Was uns <em>ausmacht</em>.</h2>
    </div>
    <div class="stories-grid">
      ${spec.redesigned_sections.slice(0, 5).map((s, i) => `
      <article class="story-card">
        <span class="story-num">${String(i + 1).padStart(2, '0')} / ${String(Math.min(spec.redesigned_sections!.length, 5)).padStart(2, '0')}</span>
        <h3>${escapeHtml(s.title)}</h3>
        <p>${escapeHtml(s.body.length > 320 ? s.body.slice(0, 320).replace(/\s+\S*$/, '') + '…' : s.body)}</p>
      </article>
      `).join('')}
    </div>
  </div>
</section>
` : ''}

${(() => {
  // Mitgliedschafts-Section: always rendered for Verein templates since
  // every Amateur-Verein actively recruits. Falls back to a Verein-
  // appropriate generic copy if spec.membership.description is empty.
  // The instrument-quartet icon row adds visual texture without needing
  // photos of actual members.
  const descr = membership?.description?.trim();
  const cta = membership?.cta?.trim() || 'Probespiel vereinbaren';
  const fallback = `Wir freuen uns über jeden, der mit uns musizieren möchte. Egal ob Anfänger, Wiedereinsteiger oder erfahrener Musiker — nehmen Sie unverbindlich Kontakt mit uns auf.`;
  return `
<div class="section-anchor-wrap"><span class="section-anchor" aria-hidden="true"></span></div>
<section id="mitglied" class="section members-section pattern-notes" style="position:relative">
  <div class="container">
    <div class="section-head center reveal">
      <span class="section-eyebrow">Mitgliedschaft</span>
      <h2 class="section-title">Werden Sie <em>Teil von uns</em>.</h2>
      <p class="section-lead">${escapeHtml(descr || fallback)}</p>
    </div>
    <div class="member-perks stagger-group" aria-hidden="true">
      <div class="member-perk reveal">
        <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="16" cy="11" r="5"/><path d="M5 28c0-5 5-9 11-9s11 4 11 9"/></svg>
        <div>
          <strong>Gemeinschaft</strong>
          <span>Gemeinsam musizieren, gemeinsam erleben.</span>
        </div>
      </div>
      <div class="member-perk reveal">
        <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M16 4v24"/><circle cx="11" cy="24" r="3" fill="currentColor"/><path d="M16 4l8 4"/></svg>
        <div>
          <strong>Ausbildung</strong>
          <span>Vom ersten Ton bis zum Solo — wir begleiten Sie.</span>
        </div>
      </div>
      <div class="member-perk reveal">
        <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="6" y="10" width="20" height="14" rx="2"/><path d="M6 14h20M10 18h8"/></svg>
        <div>
          <strong>Auftritte</strong>
          <span>Konzerte, Feste, Reisen — werden Sie Teil unseres Programms.</span>
        </div>
      </div>
    </div>
    <div class="member-cta-wrap reveal">
      <a href="#kontakt" class="member-cta">${escapeHtml(cta)} →</a>
    </div>
  </div>
</section>`;
})()}

${board.length > 0 ? `
<div class="section-anchor-wrap"><span class="section-anchor" aria-hidden="true"></span></div>
${renderBoardSection(board)}
` : ''}

${galleryCount(spec) >= 1 ? `
<div class="section-anchor-wrap on-dark"><span class="section-anchor" aria-hidden="true"></span></div>
<section id="bilder" class="section tone-carbon">
  <div class="container">
    <div class="section-head center reveal">
      <span class="section-eyebrow">Eindrücke</span>
      <h2 class="section-title">Vereinsleben in <em>Bildern</em>.</h2>
    </div>
    <div class="gallery-grid">
      ${spec.media!.gallery!.map((_url, i) => `
        <div class="gallery-item reveal"><img src="${getGalleryImage(spec, slug, i, 800, 600)}" alt="" onerror="this.parentNode.classList.add('img-broken'); this.style.display='none';" onload="if(this.naturalWidth<20||this.naturalHeight<20){this.parentNode.classList.add('img-broken');this.style.display='none';} else if(this.naturalWidth<360){this.parentNode.classList.add('img-small');}"></div>
      `).join('')}
    </div>
  </div>
</section>
<script>
  // Gallery self-heal v4: hide the entire #bilder section when no image
  // actually rendered. Polls naturalWidth every 800ms for up to 8s.
  // Catches the hung-load case (Asset-Mirror sometimes returns 0-byte
  // 200-OK that NEVER triggers onload OR onerror) — after 4s of no
  // pixels, treats as broken even without an event.
  document.addEventListener('DOMContentLoaded', () => {
    const grid = document.querySelector('#bilder .gallery-grid');
    if (!grid) return;
    const items = [...grid.querySelectorAll('.gallery-item')];
    const total = items.length;
    let attempts = 0;
    const check = () => {
      attempts++;
      items.forEach(item => {
        if (item.classList.contains('img-broken')) return;
        const img = item.querySelector('img');
        if (!img) return;
        if (img.complete && (img.naturalWidth < 20 || img.naturalHeight < 20)) {
          item.classList.add('img-broken');
          img.style.display = 'none';
        } else if (attempts >= 5 && img.naturalWidth === 0) {
          item.classList.add('img-broken');
          img.style.display = 'none';
        } else if (img.naturalWidth > 0 && img.naturalWidth < 360 && !item.classList.contains('img-small')) {
          item.classList.add('img-small');
        }
      });
      const broken = grid.querySelectorAll('.gallery-item.img-broken').length;
      if (broken === total && total > 0) {
        const anchor = document.querySelector('#bilder')?.previousElementSibling;
        if (anchor && anchor.classList.contains('section-anchor-wrap')) anchor.remove();
        document.querySelector('#bilder')?.remove();
        return;
      }
      if (attempts < 10) setTimeout(check, 800);
    };
    setTimeout(check, 800);
  });
</script>
` : ''}

${/* Old mission-section IIFE removed — replaced by the editorial
       Pull-Quote-Section higher up the page (between About and Stories). */ ''}

${address ? `
<div class="ornament-divider" aria-hidden="true"><span></span><span class="diamond">◆</span><span></span></div>
<section id="anfahrt" class="anfahrt-section">
  <div class="container">
    <div class="anfahrt-grid">
      <div class="anfahrt-text reveal">
        <span class="section-eyebrow">Anfahrt</span>
        <h2 class="section-title">Hier finden Sie <em>uns</em>.</h2>
        <address class="anfahrt-address">${address}</address>
        ${phone ? `<a href="tel:${phone.replace(/\s/g, '')}" class="anfahrt-link">📞 ${phone}</a>` : ''}
      </div>
      <div class="anfahrt-map reveal" data-map-q="${encodeURIComponent(address)}">
        <!-- Map-Placeholder: iframe wird erst nach Cookie-Consent geladen
             (DSGVO/ePrivacy — Google Maps setzt Tracking-Cookies).
             Bei "Alle akzeptieren" tauscht wv-cookie.js das Placeholder
             gegen das echte iframe. -->
        <div class="anfahrt-map-placeholder" role="img" aria-label="Karte zur Anfahrt (Klick zum Laden)">
          <div class="map-ph-content">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <h3>Karte laden</h3>
            <p>Beim Laden der Karte werden Daten an Google übermittelt.</p>
            <button type="button" class="map-load-btn" data-cookie-accept="maps">Karte anzeigen</button>
            <a href="https://www.google.com/maps/search/${encodeURIComponent(address)}" target="_blank" rel="noopener" class="map-ph-fallback">In Google Maps öffnen ↗</a>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
` : ''}

<div class="section-anchor-wrap"><span class="section-anchor" aria-hidden="true"></span></div>
<section id="kontakt" class="section contact-section tone-cream">
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

<div class="wv-lightbox" id="wv-lightbox" role="dialog" aria-modal="true" aria-label="Bildergalerie">
  <button class="wv-lightbox-close" type="button" aria-label="Schließen">✕</button>
  <button class="wv-lightbox-prev" type="button" aria-label="Vorheriges Bild">‹</button>
  <div class="wv-lightbox-stage"><img alt=""></div>
  <button class="wv-lightbox-next" type="button" aria-label="Nächstes Bild">›</button>
  <div class="wv-lightbox-counter"></div>
</div>

<!-- Cookie-Banner (DSGVO/ePrivacy): erscheint nur wenn 'wv-consent' Cookie
     fehlt. Map-iframe wird erst nach Accept geladen. -->
<aside class="wv-cookie" id="wv-cookie" role="dialog" aria-modal="false" aria-label="Cookie-Hinweis">
  <div class="wv-cookie-inner">
    <div>
      <h3>Cookie-Hinweis</h3>
      <p>Diese Demo-Seite kann externe Inhalte einbetten (z.B. <strong>Google Maps</strong> für die Anfahrtskarte). Beim Laden dieser Dienste werden Daten an den Anbieter übermittelt. Nähere Infos in der <a href="/datenschutz">Datenschutzerklärung</a>.</p>
    </div>
    <div class="wv-cookie-actions">
      <button type="button" class="wv-cookie-btn wv-cookie-btn-secondary" data-cookie-action="reject">Nur notwendige</button>
      <button type="button" class="wv-cookie-btn wv-cookie-btn-primary" data-cookie-action="accept">Alle akzeptieren</button>
    </div>
  </div>
</aside>

<footer class="verein-footer">
  <div class="vf-inner">
    <div class="vf-wordmark" aria-hidden="true">${escapeHtml(businessName)}<span class="accent">.</span></div>
    <div class="vf-grid">
      <div class="vf-col vf-brand">
        <h3>${businessName}</h3>
        <p>${escapeHtml(tagline)}</p>
      </div>
      <div class="vf-col">
        <h4>Auf der Seite</h4>
        <ul>
          ${events.length > 0 ? '<li><a href="#termine">Termine</a></li>' : ''}
          ${spec.about?.body ? '<li><a href="#ueber-uns">Über uns</a></li>' : ''}
          ${galleryCount(spec) >= 1 ? '<li><a href="#bilder">Bilder</a></li>' : ''}
          ${(membership && membership.description) ? '<li><a href="#mitglied">Mitglied werden</a></li>' : ''}
          <li><a href="#kontakt">Kontakt</a></li>
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
    ${renderSocialStrip(spec.socials)}
    <div class="vf-bottom">
      <span>&copy; ${new Date().getFullYear()} ${businessName} · Alle Rechte vorbehalten.</span>
      <span class="vf-credit">Demo erstellt von <a href="https://webhoch.com" target="_blank" rel="noopener">Webagentur Hochmeir e.U.</a></span>
    </div>
  </div>
</footer>

<script>
  // ── Reveal-on-scroll with auto-fallback ──────────────────────────────
  // Sets .is-visible on each .reveal element when it enters the viewport.
  // After 1200ms, force any unrevealed .reveal to is-visible so content
  // never stays hidden behind a broken observer or above-fold initial state.
  (() => {
    const ALL_REVEAL = document.querySelectorAll('.reveal');
    const forceShow = () => ALL_REVEAL.forEach(el => el.classList.add('is-visible'));

    if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      forceShow();
      return;
    }

    // Stagger: walk siblings in a .stagger-group container and assign
    // incremental --stagger-delay so items appear one after another.
    document.querySelectorAll('.stagger-group').forEach(group => {
      [...group.children].forEach((child, idx) => {
        if (child.classList.contains('reveal') || child.querySelector('.reveal')) {
          (child.classList.contains('reveal') ? child : child.querySelector('.reveal')).style.setProperty('--stagger-delay', (idx * 90) + 'ms');
          (child.classList.contains('reveal') ? child : child.querySelector('.reveal')).setAttribute('data-stagger', '1');
        }
      });
    });

    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('is-visible');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px' });
    ALL_REVEAL.forEach(el => io.observe(el));

    // Safety net: anything not visible after 1.2s gets force-shown so
    // page never has a permanently-hidden block.
    setTimeout(forceShow, 1200);
  })();

  // ── Gallery lightbox ─────────────────────────────────────────────────
  // Click any non-broken .gallery-item img to open in full-screen lightbox.
  // Arrow keys + click on prev/next buttons cycle through. ESC closes.
  (() => {
    const lb = document.getElementById('wv-lightbox');
    if (!lb) return;
    const stage = lb.querySelector('.wv-lightbox-stage img');
    const counter = lb.querySelector('.wv-lightbox-counter');
    let images = [];
    let currentIdx = 0;
    const refreshImages = () => {
      images = [...document.querySelectorAll('#bilder .gallery-item:not(.img-broken) img')];
    };
    const show = (idx) => {
      if (!images.length) return;
      currentIdx = (idx + images.length) % images.length;
      stage.src = images[currentIdx].src;
      counter.textContent = (currentIdx + 1) + ' / ' + images.length;
    };
    // Focus trap: remember the trigger that opened the lightbox so we
    // can restore focus after close; trap Tab inside the lightbox while
    // open (WCAG 2.1 §2.1.2 keyboard trap rules).
    let lastFocused = null;
    const focusables = () => [...lb.querySelectorAll('button:not([disabled])')];
    const open = (idx) => {
      refreshImages();
      show(idx);
      lastFocused = document.activeElement;
      lb.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      lb.setAttribute('tabindex', '-1');
      requestAnimationFrame(() => lb.querySelector('.wv-lightbox-close')?.focus());
    };
    const close = () => {
      lb.classList.remove('is-open');
      document.body.style.overflow = '';
      if (lastFocused && lastFocused.focus) lastFocused.focus();
    };
    document.addEventListener('click', (e) => {
      const item = e.target.closest('#bilder .gallery-item:not(.img-broken)');
      if (!item) return;
      e.preventDefault();
      refreshImages();
      const idx = images.findIndex(img => img.parentNode === item);
      if (idx >= 0) open(idx);
    });
    lb.querySelector('.wv-lightbox-close').addEventListener('click', close);
    lb.querySelector('.wv-lightbox-prev').addEventListener('click', () => show(currentIdx - 1));
    lb.querySelector('.wv-lightbox-next').addEventListener('click', () => show(currentIdx + 1));
    lb.addEventListener('click', (e) => { if (e.target === lb) close(); });
    document.addEventListener('keydown', (e) => {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') { close(); return; }
      if (e.key === 'ArrowLeft') { show(currentIdx - 1); return; }
      if (e.key === 'ArrowRight') { show(currentIdx + 1); return; }
      // Focus trap: cycle Tab/Shift+Tab between prev/close/next buttons.
      if (e.key === 'Tab') {
        const items = focusables();
        if (items.length === 0) return;
        const i = items.indexOf(document.activeElement);
        if (e.shiftKey) {
          if (i <= 0) { e.preventDefault(); items[items.length - 1].focus(); }
        } else {
          if (i === items.length - 1) { e.preventDefault(); items[0].focus(); }
        }
      }
    });
  })();

  // ── Count-up animation on year/number elements ──────────────────────
  // Any element with .count-up data-target="N" counts from 0 to N over
  // ~1.4s with easeOutQuart. Fires once when element first enters viewport.
  (() => {
    const targets = document.querySelectorAll('.count-up');
    if (targets.length === 0) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      targets.forEach(el => { el.textContent = el.dataset.target || el.textContent; });
      return;
    }
    const easeOut = (t) => 1 - Math.pow(1 - t, 4);
    const animate = el => {
      const target = parseInt(el.dataset.target || '0', 10);
      if (!target) return;
      const duration = 1400;
      const start = performance.now();
      const step = (now) => {
        const t = Math.min(1, (now - start) / duration);
        el.textContent = Math.round(target * easeOut(t)).toString();
        if (t < 1) requestAnimationFrame(step);
        else el.textContent = target.toString();
      };
      requestAnimationFrame(step);
    };
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          animate(e.target);
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.4 });
    targets.forEach(el => io.observe(el));
  })();

  // ── Cookie-Banner + Map-Lazy-Load (DSGVO/ePrivacy) ─────────────────
  // Banner shows only when 'wv-consent' cookie missing. Map iframe is
  // only created (via safe DOM APIs, NOT innerHTML) after user accepts.
  (() => {
    const banner = document.getElementById('wv-cookie');
    const consentName = 'wv-consent';
    const readConsent = () => {
      const m = document.cookie.match(/(?:^|;\s*)wv-consent=([^;]+)/);
      return m ? decodeURIComponent(m[1]) : null;
    };
    const writeConsent = (value) => {
      document.cookie = consentName + '=' + encodeURIComponent(value)
        + '; path=/; max-age=' + (60 * 60 * 24 * 365) + '; samesite=lax';
    };

    const loadMaps = () => {
      document.querySelectorAll('.anfahrt-map[data-map-q]').forEach(wrap => {
        const q = wrap.dataset.mapQ;
        if (!q) return;
        // q was server-side URL-encoded; we treat it strictly as URL
        // component and never as HTML. createElement + setAttribute is
        // safe — no innerHTML, no string-concat to .outerHTML.
        while (wrap.firstChild) wrap.removeChild(wrap.firstChild);
        const iframe = document.createElement('iframe');
        iframe.src = 'https://maps.google.com/maps?q=' + q
          + '&t=&z=14&ie=UTF8&iwloc=&output=embed';
        iframe.width = '100%';
        iframe.height = '420';
        iframe.style.border = '0';
        iframe.style.borderRadius = '8px';
        iframe.loading = 'lazy';
        iframe.referrerPolicy = 'no-referrer-when-downgrade';
        iframe.title = 'Karte zur Anfahrt';
        wrap.appendChild(iframe);
        const link = document.createElement('a');
        link.href = 'https://www.google.com/maps/search/' + q;
        link.target = '_blank';
        link.rel = 'noopener';
        link.className = 'anfahrt-fallback';
        link.textContent = 'In Google Maps öffnen ↗';
        wrap.appendChild(link);
      });
    };
    const hideBanner = () => banner && banner.classList.remove('is-visible');
    const accept = () => { writeConsent('accept-all'); loadMaps(); hideBanner(); };
    const reject = () => { writeConsent('necessary-only'); hideBanner(); };

    if (banner) {
      banner.addEventListener('click', (e) => {
        const action = (e.target.closest('[data-cookie-action]') || {}).dataset?.cookieAction;
        if (action === 'accept') accept();
        else if (action === 'reject') reject();
      });
    }
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-cookie-accept="maps"]')) {
        e.preventDefault(); accept();
      }
    });

    const consent = readConsent();
    if (consent === 'accept-all') {
      loadMaps();
    } else if (!consent && banner) {
      setTimeout(() => banner.classList.add('is-visible'), 1000);
    }
  })();
</script>
</body>
</html>
`;
}
