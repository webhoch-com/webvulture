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

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/**
 * Look for a founding year in the prospect's about-body. Most Vereinsseiten
 * mention "seit 1923", "gegründet 1957", "Gründungsjahr: 1898" or similar
 * — when we find one, the hero fallback adds a "SEIT YYYY · 102 Jahre" line
 * that makes the page feel rooted instead of generic. Returns null when we
 * can't be confident the match is a year (rejects years outside 1700–current).
 */
function extractFoundedYear(spec: SiteSpec): number | null {
  const text = `${spec.about?.body ?? ''} ${spec.tagline ?? ''}`;
  // Two-direction match: trigger BEFORE year ("seit 1898", "gründungsjahr: 1898",
  // "established in 1898") OR trigger AFTER year ("im Jahr 1898 gegründet",
  // "1898 gegründet", "von 1898"). Real Vereinsseiten phrase it both ways.
  const beforeRe = /\b(?:seit|gegründet|gegruendet|gründungsjahr|gruendungsjahr|established|since|von)\s*(?:im\s+jahr\s+)?:?\s*(1[78]\d{2}|19\d{2}|20[0-2]\d)\b/i;
  const afterRe  = /\b(?:im\s+jahr\s+)?(1[78]\d{2}|19\d{2}|20[0-2]\d)\s+(?:gegründet|gegruendet|gegründet|ins\s+leben|established)\b/i;
  const m = text.match(beforeRe) || text.match(afterRe);
  if (!m) return null;
  const year = parseInt(m[1], 10);
  const currentYear = new Date().getFullYear();
  if (year < 1700 || year > currentYear) return null;
  return year;
}

/**
 * Build the marquee text items from real spec data — never invented strings.
 * Order: founded year · city · category · scraped tagline-words · scraped
 * service names. Returns at least 4 items (duplicates the input twice to keep
 * the CSS `translateX(-50%)` loop continuous) when ≥ 2 distinct items exist;
 * otherwise returns an empty array → marquee section is skipped.
 */
function buildMarqueeItems(spec: SiteSpec, foundedYear: number | null): string[] {
  const items: string[] = [];
  if (foundedYear) items.push(`Seit ${foundedYear}`);
  if (spec.contact?.address) {
    // Extract the city after the postcode. Supports compound names like
    // "Bad Ischl", "Sankt Johann am Wimberg", "Klagenfurt-Wörthersee" — the
    // previous regex stopped at the first whitespace and missed multi-word
    // Austrian municipalities.
    const m = spec.contact.address.match(/\b\d{4,5}\s+([A-ZÄÖÜ][\wäöüÄÖÜß-]+(?:\s+(?:am|im|an|bei|ob|in|der|auf)\s+[A-ZÄÖÜ][\wäöüÄÖÜß-]+|\s+[A-ZÄÖÜ][\wäöüÄÖÜß-]+){0,3})/);
    if (m) items.push(m[1].trim());
  }
  // Tagline words (≥4 chars, capitalised) as identity tokens
  const taglineWords = (spec.tagline || '').match(/\b[A-ZÄÖÜ][a-zäöüß]{3,}\b/g) || [];
  for (const w of taglineWords.slice(0, 4)) {
    if (!items.includes(w)) items.push(w);
  }
  for (const s of (spec.services || []).slice(0, 3)) {
    if (s.name && s.name.length < 24 && !items.includes(s.name)) items.push(s.name);
  }
  if (items.length < 2) return [];
  // Duplicate so the CSS marquee loops without a visible gap
  return [...items, ...items];
}

/**
 * Find a substantive sentence from about.body that doesn't duplicate the
 * subhead — used as the editorial pull-quote between sections. Returns null
 * if no candidate ≥ 50 chars survives.
 */
function pickPullQuote(spec: SiteSpec): string | null {
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
  const subheadN = norm(spec.hero?.subheadline || '');
  const body = spec.about?.body || '';
  const sentences = body.match(/[^.!?]+[.!?]+/g) || [];
  for (const raw of sentences) {
    const s = raw.trim();
    if (s.length < 50 || s.length > 220) continue;
    const n = norm(s);
    if (n === subheadN) continue;
    // Skip chrome
    if (/zum inhalt|cookie|folgen sie|impressum/i.test(s)) continue;
    return s;
  }
  // Thin-page fallback: the tagline often has 30–90 chars and reads well as
  // an editorial quote. Only emit if it's distinct from the subhead and long
  // enough to look intentional. Pages with no about.body still get a section
  // here — closes a regression from the previous mission-section IIFE.
  const tagline = (spec.tagline || '').trim();
  const taglineN = norm(tagline);
  if (tagline.length >= 40 && taglineN !== subheadN) {
    return tagline;
  }
  return null;
}

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

/**
 * Inline SVG marks for the social-icon strip. Tiny, recognisable, mono-color
 * (`currentColor`) so they recolour against any footer theme. Kept in this
 * file (not _media.ts) because they're presentation-only and only the
 * verein-* templates need them today; will move to _social.ts once a second
 * template asks for them.
 */
const SOCIAL_ICONS: Record<string, string> = {
  facebook: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 12c0-5.5-4.5-10-10-10S2 6.5 2 12c0 5 3.7 9.1 8.4 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.4h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.7l-.4 2.9h-2.3v7c4.7-.8 8.5-4.9 8.5-9.9z"/></svg>',
  instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.4A4 4 0 1 1 12.6 8 4 4 0 0 1 16 11.4z"/><line x1="17.5" y1="6.5" x2="17.5" y2="6.5"/></svg>',
  youtube: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23 7.5s-.2-1.6-.9-2.3c-.8-.9-1.8-.9-2.2-1C16.7 4 12 4 12 4s-4.7 0-7.9.2c-.5.1-1.4.1-2.2 1C1.2 5.9 1 7.5 1 7.5S.8 9.4.8 11.3v1.4c0 1.9.2 3.8.2 3.8s.2 1.6.9 2.3c.8.9 1.9.9 2.4 1 1.8.2 7.7.2 7.7.2s4.7 0 7.9-.2c.5-.1 1.4-.1 2.2-1 .7-.7.9-2.3.9-2.3s.2-1.9.2-3.8v-1.4c0-1.9-.2-3.8-.2-3.8zM9.7 14.6V8.2l6.2 3.2-6.2 3.2z"/></svg>',
  tiktok: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.6 6.3A4.85 4.85 0 0 1 17.7 3h-3.3v13.4a2.86 2.86 0 0 1-5.4 1.3 2.85 2.85 0 0 1 4-3.8V10.3a6.16 6.16 0 0 0-7.1 9.5 6.18 6.18 0 0 0 9.8.4 6.4 6.4 0 0 0 1.4-4V8.7a8.16 8.16 0 0 0 4.7 1.5V7a4.79 4.79 0 0 1-2.2-.7z"/></svg>',
  linkedin: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM8.339 18v-8.59H5.667V18zm-1.34-9.764a1.55 1.55 0 1 0 0-3.099 1.55 1.55 0 0 0 0 3.1zM18 18v-4.708c0-2.575-1.395-3.77-3.255-3.77-1.502 0-2.175.825-2.55 1.404V9.41h-2.834c.037.798 0 8.59 0 8.59h2.834v-4.797c0-.255.018-.51.093-.692.205-.51.671-1.037 1.453-1.037 1.026 0 1.435.781 1.435 1.927V18z"/></svg>',
  twitter: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
};

function renderSocialStrip(items: Array<{ platform: string; href: string; label: string }>): string {
  if (items.length === 0) return '';
  const links = items
    .filter(i => SOCIAL_ICONS[i.platform])
    .map(i => `<a href="${i.href}" target="_blank" rel="noopener nofollow" aria-label="${escapeHtml(i.label)}">${SOCIAL_ICONS[i.platform]}</a>`)
    .join('');
  if (!links) return '';
  return `<div class="vf-socials">${links}</div>`;
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

  // Trust pill — only shown when the rating is strong (≥4.0) and based on a
  // meaningful sample (≥5 reviews). Weak ratings would hurt rather than help.
  const ratingNum = typeof spec.business?.rating === 'number' ? spec.business.rating : null;
  const reviewCount = typeof spec.business?.review_count === 'number' ? spec.business.review_count : 0;
  const showRating = ratingNum !== null && ratingNum >= 4.0 && reviewCount >= 5;
  const ratingFull = showRating ? Math.round(ratingNum!) : 0;
  const ratingStars = showRating ? '★'.repeat(ratingFull) + '☆'.repeat(5 - ratingFull) : '';

  // Social handles surfaced as an icon-strip in the footer. Filter on a hard
  // allow-list of platforms we ship icons for (anything else would render as
  // text, looks broken). Each entry: {platform, href, label}.
  const SOCIAL_PLATFORMS = ['facebook', 'instagram', 'youtube', 'tiktok', 'linkedin', 'twitter'] as const;
  const socialItems = Object.entries(spec.socials ?? {})
    .filter(([k]) => (SOCIAL_PLATFORMS as readonly string[]).includes(k.toLowerCase()))
    .map(([k, v]) => ({ platform: k.toLowerCase(), href: v as string, label: k }));

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

  // Phase-3 editorial data: pre-computed so the template body stays clean.
  const foundedYear = extractFoundedYear(spec);
  const marqueeItems = buildMarqueeItems(spec, foundedYear);
  const pullQuote = pickPullQuote(spec);
  // Number anchors track section order so they read 01/02/03 vertically.
  let anchorIdx = 0;
  const nextAnchor = () => {
    anchorIdx += 1;
    return String(anchorIdx).padStart(2, '0');
  };

  // Brand-token resolution: real scraped values override the template's
  // hardcoded defaults. The CSS `color-mix()` calls derive `-soft` and `-deep`
  // shades from whatever primary we end up with, so darker prospects get
  // accordingly darker hover-states without us hand-tuning per club.
  // Strict allow-list of font-family characters and font-import hosts is
  // enforced upstream in the orchestrator — safe to interpolate raw here.
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
    .brand-logo { width: 56px; height: 56px; object-fit: contain; flex-shrink: 0; }
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

    /* ─── Hero — photo overlay if real, else CSS-only gradient ────── */
    .hero {
      position: relative; min-height: clamp(560px, 84vh, 740px);
      ${hasHeroImage(spec)
        ? `background:
        linear-gradient(135deg, rgba(28,47,31,0.55) 0%, rgba(28,47,31,0.7) 60%, rgba(28,47,31,0.85) 100%),
        url('${getHeroImage(spec, slug)}') center/cover;`
        : `background:
        radial-gradient(ellipse at 20% 20%, rgba(184,137,61,0.16) 0%, transparent 55%),
        radial-gradient(ellipse at 80% 80%, rgba(45,74,50,0.6) 0%, transparent 50%),
        linear-gradient(135deg, #1c2f1f 0%, #2d4a32 60%, #1a2419 100%);`
      }
      display: flex; align-items: center; padding: 4rem 1.5rem;
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
      font-size: clamp(2rem, 6.5vw, 5rem); line-height: 1.05;
      letter-spacing: -0.025em; max-width: 18ch;
      text-wrap: balance;
      /* Don't auto-hyphenate inside compound words like "Blasmusik" — produced
         the visible "Blas-/musik" break that looked broken. */
      overflow-wrap: normal; word-break: normal; hyphens: manual;
    }
    .hero h1 em { font-style: italic; color: var(--accent); font-weight: 500; }
    .hero p { color: rgba(255,255,255,0.92); font-size: 1.2rem; margin-top: 2rem; max-width: 56ch; line-height: 1.65; font-family: var(--serif); }
    .hero-cta-row { display: flex; gap: 1rem; margin-top: 2.5rem; flex-wrap: wrap; }

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

    /* Big-number anchor — outline-stroke numerals between sections,
       2026 magazine pacing element. */
    .section-anchor-wrap {
      max-width: 1400px; margin: 0 auto;
      padding: clamp(2rem, 4vw, 3.5rem) clamp(1.5rem, 5vw, 5rem) 0;
      pointer-events: none; overflow: hidden;
    }
    .section-anchor {
      display: block;
      font-family: var(--display); font-weight: 700;
      font-size: clamp(6rem, 18vw, 16rem);
      line-height: 0.85; letter-spacing: -0.04em;
      -webkit-text-stroke: 1px var(--accent);
      color: transparent;
      opacity: 0.45;
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
    .stories-section { padding: clamp(5rem, 9vw, 8rem) 1.5rem; background: var(--bg); }
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
    .about-image { position: relative; border-radius: 12px; overflow: hidden; box-shadow: 0 24px 60px -28px rgba(45,74,50,0.4); background: var(--primary-deep); display: grid; place-items: center; min-height: 400px; max-height: 640px; }
    .about-image img { width: 100%; height: auto; max-height: 640px; object-fit: contain; }
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

    /* Members-Section is the simple CTA wrapper (.member-cta-wrap above).
       The 3-tier-pricing block was removed: we never have verified per-tier
       data and the placeholder rendered as obvious filler. */
    .members-section { background: var(--bg); }

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
    .gallery-item { position: relative; aspect-ratio: 4/3; overflow: hidden; border-radius: 8px; background: var(--primary-deep); display: grid; place-items: center; }
    .gallery-item img { width: 100%; height: 100%; object-fit: cover; transition: transform 1s ease; }
    /* Panorama / portrait images: contain instead of cover so they don't get sliced. */
    @supports (aspect-ratio: 1) {
      .gallery-item img[data-shape="panorama"], .gallery-item img[data-shape="portrait"] {
        object-fit: contain; max-width: 100%; max-height: 100%;
      }
    }
    .gallery-item:hover img { transform: scale(1.06); }

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

    /* Reveal: previously hid content with opacity:0 + IntersectionObserver,
       which left whole sections invisible if JS failed or scroll didn't reach.
       Now: content is always visible; .reveal is a no-op kept for backwards
       compat with the JS query selector. */
    .reveal { opacity: 1; transform: none; }

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
    .anfahrt-map { position: relative; }
    .anfahrt-map iframe { display: block; }
    .anfahrt-fallback {
      display: inline-block; margin-top: 0.75rem; font-size: 0.9rem;
      color: var(--primary); font-weight: 500;
    }

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
      ? `<img class="brand-logo" src="${escapeHtml(getLogo(spec)!)}" alt="${escapeHtml(spec.business_name)} Logo" width="44" height="44" />`
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
    ${showRating ? `
    <div class="hero-rating" role="img" aria-label="Google-Bewertung ${ratingNum!.toFixed(1)} von 5 Sternen, basierend auf ${reviewCount} Bewertungen">
      <span class="stars" aria-hidden="true">${ratingStars}</span>
      <span class="meta"><strong>${ratingNum!.toFixed(1).replace('.', ',')}</strong> · ${reviewCount} Google-Bewertungen</span>
    </div>` : ''}
    <div class="hero-cta-row">
      <a href="#kontakt" class="btn-primary">${ctaText} →</a>
      ${events.length > 0 ? '<a href="#termine" class="btn-outline">Nächste Termine</a>' : ''}
    </div>
  </div>
  ${hasHeroImage(spec) ? '' : (() => {
    const foundedYear = extractFoundedYear(spec);
    const currentYear = new Date().getFullYear();
    return `
  <div class="hero-decor-bigtype" aria-hidden="true">${escapeHtml(businessName)}</div>
  <div>
    <div class="hero-decor-stripes" aria-hidden="true">
      <span class="s-primary"></span>
      <span class="s-secondary"></span>
      <span class="s-accent"></span>
    </div>
    ${foundedYear ? `<div class="hero-decor-since">Seit <strong>${foundedYear}</strong> · ${currentYear - foundedYear} Jahre in der Region</div>` : ''}
  </div>`;
  })()}
</section>

${marqueeItems.length > 0 ? `
<div class="marquee" aria-hidden="true">
  <div class="marquee-track">${marqueeItems.map(i => `<span>${escapeHtml(i)}</span>`).join('')}</div>
</div>
` : ''}

${events.length > 0 ? `
<div class="section-anchor-wrap on-dark"><span class="section-anchor">${nextAnchor()}</span></div>
<section id="termine" class="section events tone-cream">
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

${spec.about?.body ? `
<div class="section-anchor-wrap"><span class="section-anchor">${nextAnchor()}</span></div>
<section id="ueber-uns" class="section tone-tint">
  <div class="container">
    <div class="section-head">
      <span class="section-eyebrow">Wer wir sind</span>
      <h2 class="section-title">Über <em>uns</em>.</h2>
    </div>
    <div class="about-text" style="max-width: 760px; margin: 0 auto;">
      <p class="dropcap">${escapeHtml(spec.about.body)}</p>
    </div>
  </div>
</section>
` : ''}

${pullQuote ? `
<section class="pullquote-section">
  <div class="pullquote-inner">
    <div class="pullquote-mark" aria-hidden="true">"</div>
    <blockquote class="pullquote-text">${escapeHtml(pullQuote)}</blockquote>
    <div class="pullquote-byline">${escapeHtml(businessName)}</div>
  </div>
</section>
` : ''}


${/* Klangkörper, Instrumente und Meilensteine wurden entfernt — diese
       Inhalte konnten nicht aus der gescrapten Quellseite verifiziert werden.
       Pro User-Vorgabe: keine erfundenen Sektionen. */ ''}


${spec.testimonials && spec.testimonials.length > 0 ? `
<div class="section-anchor-wrap"><span class="section-anchor">${nextAnchor()}</span></div>
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
<div class="section-anchor-wrap"><span class="section-anchor">${nextAnchor()}</span></div>
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

${galleryCount(spec) >= 1 ? `
<div class="section-anchor-wrap on-dark"><span class="section-anchor">${nextAnchor()}</span></div>
<section id="bilder" class="section tone-carbon">
  <div class="container">
    <div class="section-head center reveal">
      <span class="section-eyebrow">Eindrücke</span>
      <h2 class="section-title">Vereinsleben in <em>Bildern</em>.</h2>
    </div>
    <div class="gallery-grid">
      ${spec.media!.gallery!.map((_url, i) => `
        <div class="gallery-item reveal"><img src="${getGalleryImage(spec, slug, i, 800, 600)}" alt="" loading="lazy"></div>
      `).join('')}
    </div>
  </div>
</section>
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
      <div class="anfahrt-map reveal">
        <iframe
          src="https://www.openstreetmap.org/export/embed.html?bbox=${osmBbox(address)}&amp;layer=mapnik&amp;marker=${encodeURIComponent(address)}"
          width="100%" height="400" frameborder="0" scrolling="no"
          marginheight="0" marginwidth="0" style="border:0; border-radius: 8px;"
          loading="lazy" referrerpolicy="no-referrer"
          title="Karte zur Anfahrt"></iframe>
        <a href="https://www.openstreetmap.org/search?query=${encodeURIComponent(address)}" target="_blank" rel="noopener" class="anfahrt-fallback">Auf Karte öffnen ↗</a>
      </div>
    </div>
  </div>
</section>
` : ''}

<div class="section-anchor-wrap"><span class="section-anchor">${nextAnchor()}</span></div>
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
    ${renderSocialStrip(socialItems)}
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
