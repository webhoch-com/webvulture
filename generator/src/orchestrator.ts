/**
 * Deterministic spec builder.
 *
 * Per project directive: NO LLM API for content generation. Use scraped data
 * and the enrichment metadata directly. The only "smart" parts are:
 *   - Selecting hero/gallery from scraped images by URL-shape scoring
 *   - Picking primary brand color from scraped CSS palette
 *   - Sensible CTA defaults per layout-kind
 *
 * The output `OrchestrationResult` mirrors the previous Claude-backed shape so
 * `server.ts` keeps working without changes. `model` is set to a placeholder,
 * tokens + cost are 0.
 */

import type { RebuildPackage, SiteSpec, LayoutKind } from './types.js';

export interface OrchestrationResult {
  siteSpec: SiteSpec;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costCents: number;
}

export async function orchestrate(pkg: RebuildPackage): Promise<OrchestrationResult> {
  const layoutKind = (pkg.layout_kind ?? 'standard') as LayoutKind;

  const businessName = pkg.business?.name?.trim() || 'Unbekannt';
  const city = pkg.business?.city?.trim() || '';
  const category = pkg.business?.category?.trim() || '';
  const phone = pkg.business?.phone || pkg.extracted?.contact?.phone || '';
  const email = pkg.extracted?.contact?.email || '';
  const address = pkg.business?.address || pkg.extracted?.contact?.address || '';
  const website = pkg.business?.website || '';

  const scrapedTitle = pkg.extracted?.title?.trim() || '';
  const metaDesc = (pkg.extracted?.meta_description || pkg.extracted?.meta || '').trim();
  const textContent = (pkg.extracted?.text_content || pkg.extracted?.text || '').trim();

  const enrichment = pkg.generation_params || {};
  const niche = enrichment.niche?.trim() || '';
  const tone = enrichment.tone?.trim() || 'neutral';
  const headlineFromEnrich = (enrichment.headline as string | undefined)?.trim() || '';
  const valueProp = (enrichment.value_prop as string | undefined)?.trim() || '';

  const tagline = niche || headlineFromEnrich || metaDesc.split(/[\.!?]/, 1)[0] || category || 'Tradition. Qualität. Region.';
  // Hero headline: keep under ~45 chars or it overflows the oversized
  // display-serif typography in branch templates. Skip the city-suffix
  // when niche already mentions the city (avoids "X Vöcklabruck · Vöcklabruck").
  let headline: string;
  if (headlineFromEnrich) {
    headline = headlineFromEnrich;
  } else if (niche) {
    const nicheLower = niche.toLowerCase();
    const cityLower = (city || '').toLowerCase();
    const cityAlreadyInNiche = cityLower !== '' && nicheLower.includes(cityLower);
    const withCity = (city && !cityAlreadyInNiche) ? `${niche} · ${city}` : niche;
    headline = withCity.length <= 45 ? withCity : (niche.length <= 45 ? niche : businessName);
  } else {
    headline = businessName;
  }
  const subheadline = valueProp || metaDesc || firstSentences(textContent, 2) || `${businessName}${city ? ` aus ${city}` : ''}.`;

  // About body: prefer enrichment value_prop > meta description > scraped sentences.
  // Scraped sentences are last-resort because they often contain page chrome.
  let aboutBody = '';
  if (valueProp && valueProp.length > 40) {
    aboutBody = valueProp;
  } else if (metaDesc && metaDesc.length > 40) {
    aboutBody = metaDesc;
  } else {
    aboutBody = firstSentences(textContent, 4);
  }

  const services = mapServicesFromScrape(pkg.extracted?.services ?? []);

  const ctaText = defaultCta(layoutKind);
  const fontStyle = defaultFontStyle(layoutKind);

  const baseSpec: SiteSpec = {
    business_name: businessName,
    tagline: truncate(tagline, 90),
    layout_kind: layoutKind,
    hero: {
      headline: truncate(headline, 80),
      subheadline: truncate(subheadline, 280),
      cta_text: ctaText,
    },
    about: {
      body: truncate(aboutBody, 800),
    },
    services,
    testimonials: [],
    contact: {
      phone: phone || undefined,
      email: email || undefined,
      address: address || undefined,
      cta_text: ctaText,
    },
    footer: {
      tagline: truncate(tagline, 90),
    },
    brand: {
      primary_color: defaultPrimaryColor(layoutKind),
      font_style: fontStyle,
      tone,
    },
    // Section-level fields (events, opening_hours, menu, membership, emergency)
    // are intentionally omitted — they will be populated only when an explicit
    // scraped source provides them. No invention.
  };

  // Inject scraped media + brand color deterministically.
  baseSpec.media = pickMedia(pkg);
  const scrapedColor = pickPrimaryColor(pkg.brand_colors);
  if (scrapedColor) {
    baseSpec.brand.primary_color = scrapedColor;
  }

  // Pass through the *real* page sections from the prospect's site so the
  // template can render a premium redesign of their actual content. Strict
  // filter against duplicates of headline/about and against junk titles.
  const headlineLower = baseSpec.hero.headline.toLowerCase();
  const taglineLower = baseSpec.tagline.toLowerCase();
  const aboutLower = baseSpec.about.body.slice(0, 80).toLowerCase();
  const seenTitles = new Set<string>();
  const redesigned = (pkg.extracted?.sections ?? [])
    .filter((s) => {
      if (!s?.title || !s?.body) return false;
      const t = s.title.toLowerCase();
      if (seenTitles.has(t)) return false;
      seenTitles.add(t);
      // Skip sections whose title duplicates the headline / tagline.
      if (t === headlineLower || t === taglineLower) return false;
      // Skip sections that just repeat what's already in `about.body`.
      if (s.body.slice(0, 80).toLowerCase() === aboutLower) return false;
      return true;
    })
    .slice(0, 6)
    .map((s) => ({
      title: truncate(s.title, 80),
      body: truncate(s.body, 700),
      level: s.level || 2,
    }));
  if (redesigned.length > 0) {
    baseSpec.redesigned_sections = redesigned;
  }

  return {
    siteSpec: baseSpec,
    model: 'deterministic',
    inputTokens: 0,
    outputTokens: 0,
    costCents: 0,
  };
}

function truncate(s: string, max: number): string {
  s = s.trim();
  if (s.length <= max) return s;
  return s.slice(0, max - 1).replace(/\s+\S*$/, '') + '…';
}

/**
 * Junk patterns that often leak in from page chrome (WordPress headers,
 * cookie banners, skip-links, social CTAs). When the first sentence of a
 * source matches any of these, it gets dropped — the text-content scraper
 * should ideally remove these but defence-in-depth helps when it doesn't.
 */
const JUNK_PATTERNS: RegExp[] = [
  /^skip( to)?\s/i,
  /zum inhalt/i,
  /cookie/i,
  /(folgen sie uns|besuch.{0,5} uns|instagram|facebook|tiktok)/i,
  /^(menü|menu|navigation|toggle)/i,
  /\bcopyright\b|©/i,
  /^[\s\d.\-/]+$/,
  /impressum|datenschutz|agb/i,
];

function isJunkSentence(s: string): boolean {
  const trimmed = s.trim();
  if (trimmed.length < 25) return true;
  for (const re of JUNK_PATTERNS) {
    if (re.test(trimmed)) return true;
  }
  return false;
}

function firstSentences(text: string, n: number): string {
  if (!text) return '';
  const matches = text.match(/[^.!?]+[.!?]+/g);
  if (!matches) return text.slice(0, 280);
  const clean = matches
    .map((s) => s.trim())
    .filter((s) => !isJunkSentence(s));
  if (clean.length === 0) return '';
  return clean.slice(0, n).join(' ').trim();
}

function mapServicesFromScrape(scraped: string[]): SiteSpec['services'] {
  const cleaned = scraped
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.length < 100)
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 6);
  if (cleaned.length === 0) return [];
  return cleaned.map((name) => ({ name, description: '' }));
}

function defaultCta(kind: LayoutKind): string {
  switch (kind) {
    case 'restaurant': return 'Tisch reservieren';
    case 'friseur': return 'Termin vereinbaren';
    case 'handwerk': return 'Angebot anfragen';
    case 'arzt': return 'Termin vereinbaren';
    case 'verein':
    case 'verein_musik':
    case 'verein_sport':
    case 'verein_tradition': return 'Mitglied werden';
    case 'golfclub': return 'Probespiel anfragen';
    case 'kanzlei': return 'Erstberatung vereinbaren';
    case 'hotel': return 'Anfrage senden';
    case 'fitness': return 'Probetraining buchen';
    case 'einzelhandel': return 'Im Geschäft entdecken';
    case 'galerie': return 'Anfrage senden';
    case 'autohaus': return 'Beratung vereinbaren';
    case 'energie': return 'Kostenlose Beratung';
    case 'bestattung': return 'Wir sind für Sie da';
    case 'tier': return 'Termin vereinbaren';
    default: return 'Kontakt aufnehmen';
  }
}

function defaultFontStyle(kind: LayoutKind): SiteSpec['brand']['font_style'] {
  switch (kind) {
    case 'kanzlei':
    case 'arzt':
    case 'bestattung':
    case 'golfclub':
    case 'verein_tradition': return 'classic';
    case 'fitness':
    case 'autohaus':
    case 'einzelhandel':
    case 'verein_sport': return 'bold';
    case 'restaurant':
    case 'friseur':
    case 'tier':
    case 'verein_musik': return 'friendly';
    default: return 'modern';
  }
}

function defaultPrimaryColor(kind: LayoutKind): string {
  switch (kind) {
    case 'restaurant': return '#a31621';
    case 'friseur': return '#7c3aed';
    case 'handwerk': return '#c2410c';
    case 'arzt': return '#0e7490';
    case 'verein':
    case 'verein_musik': return '#2d4a32';
    case 'verein_sport': return '#15803d';
    case 'verein_tradition': return '#7c2d12';
    case 'golfclub': return '#23423a';
    case 'kanzlei': return '#1e3a8a';
    case 'hotel': return '#84603a';
    case 'fitness': return '#dc2626';
    case 'einzelhandel': return '#831843';
    case 'galerie': return '#171717';
    case 'autohaus': return '#1e293b';
    case 'energie': return '#ca8a04';
    case 'bestattung': return '#3a4859';
    case 'tier': return '#0d9488';
    default: return '#0f172a';
  }
}

// ─── Media picker (unchanged from previous version) ──────────────────────────

function pickPrimaryColor(colors: string[] | undefined): string | undefined {
  if (!colors || colors.length === 0) return undefined;
  for (const raw of colors) {
    const hex = normalizeHex(raw);
    if (!hex) continue;
    const { r, g, b } = hexToRgb(hex);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max > 0 ? (max - min) / max : 0;
    const lum = (max + min) / 2 / 255;
    if (sat > 0.25 && lum > 0.1 && lum < 0.85) return hex;
  }
  return undefined;
}

function normalizeHex(raw: string): string | null {
  const m = raw.match(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (!m) return null;
  const v = m[1];
  return v.length === 3 ? `#${v[0]}${v[0]}${v[1]}${v[1]}${v[2]}${v[2]}` : `#${v}`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}

function pickMedia(pkg: RebuildPackage): SiteSpec['media'] {
  const raw = pkg.extracted?.images ?? [];
  const logo = pkg.logo_url || undefined;
  const favicon = pkg.favicon_url || undefined;

  const seen = new Set<string>();
  if (logo) seen.add(logo);

  const SCORE_THRESHOLD = 50;
  const scored = raw
    .map((img) => ({
      src: img.src,
      alt: img.alt ?? '',
      // Score against the *original* URL when present — mirror URLs are
      // opaque hashes and lose all keyword signal (sponsor names,
      // file-purpose hints, dimensions). Falls back to mirror URL when
      // legacy data has no original_src.
      score: scoreImage(img.original_src || img.src, img.alt ?? ''),
    }))
    .filter((i) => !seen.has(i.src) && i.score >= SCORE_THRESHOLD)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return logo || favicon ? { logo, favicon } : undefined;
  }

  const heroPick = scored[0];
  seen.add(heroPick.src);

  const gallery = scored.slice(1).filter((i) => !seen.has(i.src)).map((i) => i.src).slice(0, 8);

  return { logo, favicon, hero_image: heroPick.src, gallery };
}

function scoreImage(src: string, alt: string): number {
  let score = 100;
  const lowerSrc = src.toLowerCase();
  const lowerAlt = alt.toLowerCase();
  // Sponsor / bank logos that creep into hero/gallery via "unsere Partner"
  // sections — match against BOTH src and alt because the URL is often a
  // generic CDN path (e.g. `/media/123.jpg`) while the alt text reveals
  // the sponsor name.
  const SPONSOR_RE = /(?:^|[\W_])(raiffeisen|sparkasse|allianz|generali|wienerstaedtische|uniqa|hofer|spar|billa|rewe|lidl|toyota|vw|volkswagen|bmw|mercedes|opel|ford|magenta|t[\W_]?mobile|a1|drei|ggz|merkur|bauhaus|obi|hornbach)(?:[\W_]|$)/;

  if (/(?:^|[\W_])(icon|avatar|badge|button|btn|logo|favicon|social|chevron|arrow|sponsor|partner)(?:[\W_]|$)/.test(lowerSrc)) score -= 80;
  if (/(?:^|[\W_])(thumb|small|tiny)(?:[\W_]|$)/.test(lowerSrc)) score -= 20;
  if (SPONSOR_RE.test(lowerSrc) || SPONSOR_RE.test(lowerAlt)) score -= 90;
  if (/(\b16x16|\b32x32|\b48x48|\b64x64)/.test(lowerSrc)) score -= 50;

  if (/(?:^|[\W_])(hero|banner|cover|header-image|main|gallery|photo|fotos|stories)(?:[\W_]|$)/.test(lowerSrc)) score += 40;
  if (/(?:^|[\W_])(team|portrait|projekt|referenz|werk|raum|interior|orchester|konzert)(?:[\W_]|$)/.test(lowerSrc)) score += 20;
  if (alt.length > 10) score += 10;
  if (/(jpg|jpeg|webp|png)(\?|$)/i.test(src)) score += 5;

  const depth = (lowerSrc.match(/\//g) || []).length;
  if (depth >= 4) score += 10;

  return score;
}
