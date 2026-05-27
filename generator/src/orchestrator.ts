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
  // display-serif typography in branch templates. NEVER append the city —
  // it produced ugly "Verein · Stadt" suffixes that read like a slug.
  //
  // Audit 2026-05-25: generic "Blasmusikverein Oberösterreich" was hitting
  // 3 of 5 production previews — reads as SEO-headline not brand-headline.
  // Heuristic: if the niche-from-enrichment is just "Category + Bundesland"
  // (≤ 3 words, all from a known geo-category vocabulary), reject it and
  // fall through to the business name.
  const isGenericCategoryGeo = (s: string): boolean => {
    const words = s.trim().split(/\s+/);
    if (words.length > 3) return false;
    const lower = s.toLowerCase();
    // Categories — match anywhere because compounds like "Blasmusikverein"
    // contain the root "musikverein", and "Stadtmusik" contains "musik".
    const categoryNeedles = ['musikverein', 'sportverein', 'trachtenverein',
      'schützenverein', 'kunstverein', 'sängerverein', 'kulturverein',
      'blasmusik', 'musikkapelle', 'stadtmusik', 'fanfarenzug'];
    const hasCategory = categoryNeedles.some(n => lower.includes(n));
    const geoTokens = /(oberösterreich|niederösterreich|salzburg|tirol|vorarlberg|kärnten|burgenland|wien|steiermark|bayern|bayer|deutschland|österreich|austria|germany)$/i;
    return hasCategory && geoTokens.test(lower);
  };
  let headline: string;
  if (headlineFromEnrich && !isGenericCategoryGeo(headlineFromEnrich)) {
    headline = headlineFromEnrich;
  } else if (niche && niche.length <= 45 && !isGenericCategoryGeo(niche)) {
    headline = niche;
  } else {
    headline = businessName;
  }

  // Subheadline: block generic LLM filler that bleeds across every
  // Verein ("Gemeinsam Musik machen, Freundschaften pflegen ..." appeared
  // verbatim on three different clubs — clearly a model default).
  const isGenericFiller = (s: string): boolean => {
    const lower = s.toLowerCase();
    const fillerNeedles = [
      'gemeinsam musik machen',
      'freundschaften pflegen',
      'musikalische ausbildung des nachwuchses',
      'verbinden sie sich mit einer aktiven musikgemeinschaft',
      'erleben sie traditionelle blasmusik',
      'für alle altersgruppen und spielniveaus',
    ];
    return fillerNeedles.some((n) => lower.includes(n));
  };
  let subheadline: string;
  if (valueProp && !isGenericFiller(valueProp)) {
    subheadline = valueProp;
  } else if (metaDesc && !isGenericFiller(metaDesc)) {
    subheadline = metaDesc;
  } else {
    const scraped = firstSentences(textContent, 2);
    subheadline = (scraped && !isGenericFiller(scraped))
      ? scraped
      : (city ? `${businessName} aus ${city}.` : businessName);
  }

  // About body: build a substantive paragraph by stitching together enrichment
  // value_prop (concise pitch) + scraped sentences (real authoritative content).
  // The previous logic returned just the 130-char meta_desc → the About section
  // collapsed to a single line and the page felt empty. We now aim for ≥ 280 chars
  // by appending scraped sentences whose normalised form does NOT already appear
  // in subheadline or about. Junk sentences are filtered upstream by `firstSentences`.
  //
  // Substring guard: we compare normalised candidates against the running
  // normalised buffer (not just per-sentence). This catches the realistic
  // overlap where value_prop = "Wir sind ein Musikverein." and scraped3
  // starts with "Wir sind ein Musikverein aus Linz und ...".
  const norm = (s: string) => s.toLowerCase().replace(/[\s.,;:!?…—-]+/g, ' ').trim();
  const subheadNorm = norm(subheadline);
  const parts: string[] = [];
  let runningNorm = subheadNorm; // includes the hero subhead so we don't repeat it
  const pushUnique = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    const key = norm(trimmed);
    if (key.length < 30) return;
    if (!key) return;
    // Reject if the candidate is already contained in the running buffer
    // OR contains the running buffer entirely (would duplicate the prefix).
    if (runningNorm.length > 0 && (runningNorm.includes(key) || key.includes(runningNorm))) {
      // If the new candidate is a strict superset of what we have, swap it in.
      if (key.length > runningNorm.length + 40 && key.includes(runningNorm)) {
        // Drop the old parts whose normalised form is fully covered by the new candidate.
        for (let i = parts.length - 1; i >= 0; i--) {
          if (key.includes(norm(parts[i]))) parts.splice(i, 1);
        }
        parts.push(trimmed);
        runningNorm = norm(parts.join(' '));
      }
      return;
    }
    parts.push(trimmed);
    runningNorm = norm(parts.join(' '));
  };

  if (valueProp && valueProp.length > 40) pushUnique(valueProp);
  if (metaDesc && metaDesc.length > 40) pushUnique(metaDesc);
  // Try to enrich with multiple scraped sentences. firstSentences already
  // filters out cookies/skip-links/etc.
  const scraped3 = firstSentences(textContent, 3);
  if (scraped3) pushUnique(scraped3);
  // If still thin, REPLACE with a longer cut (don't append — would duplicate
  // the first sentences) when the longer version is significantly bigger.
  if (parts.join(' ').length < 200) {
    const scraped6 = firstSentences(textContent, 6);
    if (scraped6 && scraped6.length > parts.join(' ').length + 80) {
      // Discard previous scraped3-derived parts to avoid prefix duplication,
      // keep enrichment-sourced parts (value_prop / meta_desc).
      const scraped3Norm = scraped3 ? norm(scraped3) : '';
      if (scraped3Norm) {
        for (let i = parts.length - 1; i >= 0; i--) {
          if (norm(parts[i]) === scraped3Norm) parts.splice(i, 1);
        }
      }
      runningNorm = norm([subheadNorm, ...parts.map(norm)].join(' '));
      pushUnique(scraped6);
    }
  }
  let aboutBody = parts.join(' ').trim();
  // Last-resort: if all paths above came up dry (very thin scrape), emit a
  // neutral placeholder rather than an empty section. Better than a 1-line block.
  if (!aboutBody && (city || category)) {
    aboutBody = [businessName, city ? `aus ${city}` : '', category ? `· ${category}` : '']
      .filter(Boolean).join(' ').trim() + '.';
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

  // Brand-primary in Reihenfolge: pkg.brand.primary_color (CSS-extrahiert,
  // präzise) → pkg.brand_colors[] (Häufigkeits-Scoring, generisch) →
  // defaultPrimaryColor (Branchen-Vorgabe). Vorher war nur die Liste
  // gewichtet — die direkte CSS-Variable wurde ignoriert obwohl sie
  // qualitativ besser ist.
  const cssPrimary = pkg.brand?.primary_color
    ? normalizeHex(pkg.brand.primary_color)
    : null;
  const scrapedColor = cssPrimary || pickPrimaryColor(pkg.brand_colors);
  if (scrapedColor) {
    baseSpec.brand.primary_color = scrapedColor;
  }

  // ─── Forward the structured brand block from the PHP RebuildPackageBuilder ──
  // Previously dropped on the floor: secondary + accent + fonts. Surfacing them
  // lets each preview look like the real club instead of every Verein being
  // hard-coded evergreen+Fraunces. Validate values defensively — these come
  // from CSS parsing which can leak garbage when sites use obscure custom
  // properties.
  const pkgBrand = pkg.brand;
  if (pkgBrand) {
    const secondaryHex = pkgBrand.secondary_color ? normalizeHex(pkgBrand.secondary_color) : null;
    const accentHex = pkgBrand.accent_color ? normalizeHex(pkgBrand.accent_color) : null;
    if (secondaryHex) baseSpec.brand.secondary_color = secondaryHex;
    if (accentHex) baseSpec.brand.accent_color = accentHex;

    // Fonts: only accept reasonably shaped family names (alpha + spaces +
    // hyphens) to keep CSS injection impossible. Length capped at 60.
    const SAFE_FONT_RE = /^[A-Za-z0-9][\w\s\-]{0,59}$/;
    if (pkgBrand.heading_font_family && SAFE_FONT_RE.test(pkgBrand.heading_font_family)) {
      baseSpec.brand.heading_font_family = pkgBrand.heading_font_family;
    }
    if (pkgBrand.body_font_family && SAFE_FONT_RE.test(pkgBrand.body_font_family)) {
      baseSpec.brand.body_font_family = pkgBrand.body_font_family;
    }
    // font_imports: must be absolute https URLs to fonts.googleapis.com,
    // fonts.bunny.net, use.typekit.net or similar font-CDNs. Anything else
    // gets dropped — a scraped `@import` from a hostile site could otherwise
    // load arbitrary CSS into our previews.
    const FONT_HOST_RE = /^https:\/\/(fonts\.googleapis\.com|fonts\.bunny\.net|use\.typekit\.net|use\.fontawesome\.com|fonts\.gstatic\.com)\//i;
    const imports = (pkgBrand.font_imports ?? [])
      .filter((u): u is string => typeof u === 'string' && u.length < 512 && FONT_HOST_RE.test(u))
      .slice(0, 5);
    if (imports.length > 0) {
      baseSpec.brand.font_imports = imports;
    }
  }

  // ─── Trust signals (Google Maps rating) ───────────────────────────────────
  // Templates surface these only if rating ≥ 4.0 AND review_count ≥ 5 — anything
  // weaker actively hurts. We still set the field so templates can decide.
  if (typeof pkg.business?.rating === 'number' && typeof pkg.business?.review_count === 'number') {
    baseSpec.business = {
      rating: pkg.business.rating,
      review_count: pkg.business.review_count,
    };
  }

  // ─── Socials (top-level for footer-strip rendering) ───────────────────────
  // Only accept entries whose URL is https:// to a known social host. Anything
  // else is silently dropped (e.g. mailto:, tel:, javascript:).
  const SOCIAL_HOST_RE = /^https?:\/\/(www\.)?(facebook|instagram|youtube|twitter|x|linkedin|tiktok|threads|whatsapp)\.com\//i;
  const socials: Record<string, string> = {};
  for (const [k, v] of Object.entries(pkg.extracted?.socials ?? {})) {
    if (typeof v === 'string' && v.length < 256 && SOCIAL_HOST_RE.test(v)) {
      socials[k] = v;
    }
  }
  if (Object.keys(socials).length > 0) {
    baseSpec.socials = socials;
  }

  // ─── Screenshots passthrough (fallback gallery / before-after) ───────────
  if (pkg.screenshots && pkg.screenshots.length > 0) {
    baseSpec.media = baseSpec.media || {};
    baseSpec.media.screenshots = pkg.screenshots.slice(0, 4);
  }

  // ─── Raw text excerpt for content-extractors ──────────────────────────────
  // about.body is summarised to ~3 sentences for the editorial layout; the
  // board-member and event extractors need much more text to work. Pass the
  // PHP-side already-capped (6000 chars) text_content through untruncated so
  // regex helpers can scan e.g. footer-listed Vorstand entries that didn't
  // make it into the summary.
  if (textContent) {
    baseSpec.raw_text_excerpt = textContent.slice(0, 6000);
  }

  // Pass through the *real* page sections from the prospect's site so the
  // template can render a premium redesign of their actual content. Strict
  // filter against duplicates of headline/about and against junk titles.
  const headlineLower = baseSpec.hero.headline.toLowerCase();
  const taglineLower = baseSpec.tagline.toLowerCase();
  const aboutLower = baseSpec.about.body.slice(0, 80).toLowerCase();
  const seenTitles = new Set<string>();
  // Page-chrome titles. Mirrors the PHP-side junk filter in RebuildPackageBuilder
  // so a future direct-from-test path can't push skip-links into editorial slots.
  const JUNK_TITLE_RE = /^(zum inhalt|skip to|cookie|menü|menu|navigation|impressum|datenschutz|agb|kontakt|footer|kontaktformular|search|suche)\b/i;
  const redesigned = (pkg.extracted?.sections ?? [])
    .filter((s) => {
      if (!s?.title || !s?.body) return false;
      if (JUNK_TITLE_RE.test(s.title)) return false;
      // Body too short → almost always page chrome ("Mehr lesen" etc.).
      if (s.body.trim().length < 30) return false;
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

  // ─── Apply user revision notes (keyword-based for now) ─────────────────
  const revisionNotes = (pkg.generation_params as any)?.user_revision_notes;
  if (revisionNotes && typeof revisionNotes === 'string') {
    applyRevisionNotes(baseSpec, revisionNotes);
    // Persist im SiteSpec für Audit + damit Templates die Notes als Banner
    // anzeigen können falls gewünscht.
    (baseSpec as any).meta = {
      ...((baseSpec as any).meta || {}),
      user_revision_notes: revisionNotes,
    };
  }

  return {
    siteSpec: baseSpec,
    model: 'deterministic',
    inputTokens: 0,
    outputTokens: 0,
    costCents: 0,
  };
}

/**
 * Lese das User-Feedback und wende einfache Schlüsselwort-Regeln auf das
 * SiteSpec an. Funktioniert für die häufigsten "weglassen"-Wünsche:
 *
 *   "ohne gallery" / "keine bilder"   → media.gallery = []
 *   "kein hero(bild)"                → media.hero_image = undefined
 *   "kein vorstand" / "ohne team"     → vorstand-Block wird disabled
 *   "ohne karte" / "keine karte"      → contact.show_map = false
 *
 * Komplexe Änderungen (Farben, Tonalität, neue Sections) sind hiermit
 * NICHT abgedeckt — die brauchen einen LLM-Schritt davor (Phase 4).
 * Diese Layer ist absichtlich klein und deterministisch — der User
 * kriegt sofort sichtbare Effekte für die häufigsten Wünsche, ohne
 * dass wir einen weiteren LLM-Roundtrip pro Revision brauchen.
 */
function applyRevisionNotes(spec: SiteSpec, notes: string): void {
  const n = notes.toLowerCase();

  const wants = (...phrases: string[]) => phrases.some((p) => n.includes(p));

  if (wants('ohne gallery', 'keine gallery', 'ohne galerie', 'keine galerie', 'ohne bilder', 'keine bilder')) {
    if (spec.media) {
      spec.media.gallery = [];
    }
  }
  if (wants('ohne hero', 'kein hero', 'kein heroimage', 'kein hero-bild', 'kein herobild')) {
    if (spec.media) {
      spec.media.hero_image = undefined;
    }
  }
  if (wants('ohne vorstand', 'kein vorstand', 'kein team', 'ohne team')) {
    (spec as any).hide_vorstand = true;
  }
  if (wants('ohne karte', 'keine karte', 'kein map')) {
    if (spec.contact) {
      (spec.contact as any).show_map = false;
    }
  }
  if (wants('ohne anfahrt', 'keine anfahrt')) {
    (spec as any).hide_anfahrt = true;
  }
  if (wants('ohne kontakt')) {
    (spec as any).hide_contact_section = true;
  }
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
 *
 * Expanded 2026-05-25 after production-audit revealed 5 distinct failure
 * modes in about.body across all 5 deployed Verein previews: contact-card
 * leakage, schema.org slugs (association_or_organization), JS UI labels
 * ('zuklappen' / 'Save the date!'), calendar-widget exports with repeated
 * dates, and pull-quote substring cuts that break sentence boundaries.
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
  // Widget / UI labels accidentally crawled as fließtext
  /zuklappen|aufklappen|mehr lesen|read more|weiterlesen|save the date/i,
  /^(suchen|search|menü öffnen|cookies?\s+akzeptieren|hauptnavigation)\b/i,
  /^startseite|^home|^aktuelles$|^termine$|^chronik$/i,
  // Schema.org type slugs / API response tokens leaked from enrichment
  /\b(association_or_organization|local_business|point_of_interest|tourist_attraction|premise|sublocality)\b/i,
  /\b\w+_\w+_\w+\b/,  // any 3-underscore snake_case token (catches future Google Places types)
  // Contact-data signals — if a sentence reads like a vCard line, drop it.
  /\bTel\.?\s*[:.]/i,
  /\bMobil\.?\s*[:.]/i,
  /\bFax\.?\s*[:.]/i,
  /\b(Mo|Di|Mi|Do|Fr|Sa|So)[-–]?(Mo|Di|Mi|Do|Fr|Sa|So)\b/,
  /(\+43|0043|0049|\+49)\s*[\d\s\/-]{6,}/,
  /\b\d{4,5}\s+[A-ZÄÖÜ][\wäöüß-]+(?:\s*,|\s*$|\s+(?:Tel|Mobil|Fax)\b)/,
  // Calendar-widget exports: "17. Mai 2026 - 09:00 - Sonntag, 17. Mai" — same
  // date 3+ times in one sentence is a list-collapse, not narrative.
  /(\d{1,2}\.\s*(?:Jan|Feb|Mär|Apr|Mai|Jun|Jul|Aug|Sep|Okt|Nov|Dez)\w*)[^\n]{0,40}\1[^\n]{0,40}\1/i,
  // Block-A additions (audit 2026-05-25 of live Puchkirchen showed leakage).
  // (a) ANY email-shape sequence including truncated ".at" / no-TLD variants
  //     — current `[\w.+-]+@\S+\.\S+` requires post-dot characters, missed
  //     'admin@mv-puchkirchen.' (period at end). New pattern matches an @
  //     surrounded by word-chars regardless of post-period content.
  /\b[\w.+-]{2,}@[\w-]{2,}/i,
  // (b) Webmaster / Sekretariat / Vereinsanschrift / Geschäftsstelle as
  //     leading role-prefix — these slipped past the original Obmann/
  //     Kapellmeister list and produced 't Webmaster: admin@mv-puchkirchen.'
  //     as the entire dropcap on Puchkirchen V3.
  /\b(Webmaster|Sekretariat|Vereinsanschrift|Geschäftsstelle|Kontaktperson|Korrespondenz|Newsletter)\s*[:.-]/i,
  // (c) Sentences starting with a single-char fragment + space + capital
  //     ('t Webmaster: …', 'a Konzert …', 'i Verein …') are crawl artefacts
  //     from a previous sentence's terminal letter. Always demo-optik.
  /^[a-zäöü]\s+[A-ZÄÖÜ]/,
];

/**
 * STRICT junk-detection for the pull-quote slot specifically. Pull-quotes
 * are the most-visible single editorial element on the page; if a quote
 * reads like contact-card data, the whole page collapses to "Demo". This
 * adds checks beyond the loose JUNK_PATTERNS used for about.body where
 * some leakage is tolerable.
 */
function looksLikeContactData(s: string): boolean {
  // Has an email address
  if (/[\w.+-]+@[\w-]+\.[\w.-]+/.test(s)) return true;
  // Has 2+ digits in close proximity (phone-fragment, postal-code, etc.)
  const digitGroups = (s.match(/\b\d{3,}\b/g) || []).length;
  if (digitGroups >= 2) return true;
  // Has multiple role-with-name patterns
  const roleMatches = (s.match(/\b(Obmann|Kapellmeister|Schriftführer|Kassier|Trainer|Vorsitzend|Präsident|Stabführer)\s*[:.-]/gi) || []).length;
  if (roleMatches >= 1) return true;
  // Starts with a fragment that looks like .com TLD or domain ("at Kapellmeister: ...")
  if (/^(at|com|de|net|org|info)\b/i.test(s)) return true;
  return false;
}

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
  if (!matches) {
    // Single long no-punctuation blob (common on JS-rendered landing pages where
    // DomCrawler concatenates nav into text_content). Previously we returned
    // the raw 280-char slice — bypassing isJunkSentence and pushing chrome
    // (Cookie/Impressum/Skip-Link strings) into about.body. Apply the same
    // junk filter as the punctuated path; return '' when the blob is junk.
    const slice = text.slice(0, 280).trim();
    return isJunkSentence(slice) ? '' : slice;
  }
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
  // Merge the two source lists from the rebuild package:
  //   extracted.images: generic <img> tags vom homepage-Crawl (Schema { src, original_src, alt })
  //   images.gallery:   downloaded gallery-assets vom Scraper (Schema { public_url, src_original, alt, … })
  //
  // Vorher wurde nur `extracted.images` benutzt — bei Drupal-Vereins-Sites
  // mit eigener /bildergalerie Subpage waren die echten Galerie-Bilder
  // dort, aber wurden komplett ignoriert. Lead 12 (Musikverein Puchkirchen)
  // hatte 19 gallery-Items die nie ins rendering kamen.
  const galleryItems = (pkg.images?.gallery ?? [])
    .map((g) => ({
      src: g.public_url ?? '',
      original_src: g.src_original ?? '',
      alt: g.alt ?? '',
    }))
    .filter((g) => g.src !== '');
  const raw = [...(pkg.extracted?.images ?? []), ...galleryItems];
  const logo = pkg.logo_url || undefined;
  const favicon = pkg.favicon_url || undefined;

  const seen = new Set<string>();
  if (logo) seen.add(logo);

  // Lower threshold from 50 to 30: real Verein-pages often only have a handful
  // of borderline-keyword images (Stiftungsfeier-202x.jpg, IMG_1234.jpg). The
  // strict 50-threshold caused completely empty galleries on multiple
  // music-club previews — better to keep one borderline image than render an
  // empty page. SPONSOR_RE etc. inside `scoreImage` still subtract enough
  // for true junk to fall below 30.
  const SCORE_THRESHOLD = 30;
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

  // Hero-Pick mit Größen-Bias: wenn die downloaded gallery items width-Daten
  // haben, bevorzuge große landscape-Fotos (≥ 1200×600) — die sehen als Hero
  // viel besser aus als ein quadratisches 800px-Bild. Score zählt mehr, aber
  // bei Gleichstand entscheidet Auflösung.
  const galleryMeta = new Map<string, { w: number; h: number }>();
  for (const g of (pkg.images?.gallery ?? [])) {
    if (g.public_url && g.width && g.height) {
      galleryMeta.set(g.public_url, { w: g.width, h: g.height });
    }
  }
  for (const h of (pkg.images?.hero ?? [])) {
    if (h.public_url && h.width && h.height) {
      galleryMeta.set(h.public_url, { w: h.width, h: h.height });
    }
  }
  const isHeroSized = (src: string): boolean => {
    const m = galleryMeta.get(src);
    if (!m) return false;
    return m.w >= 1200 && m.h >= 600 && m.w >= m.h; // landscape, full-bleed-tauglich
  };

  // Hero: bevorzuge das erste hero-taugliche Foto (groß + landscape). Wenn
  // keines da ist, normales scored[0].
  let heroIdx = scored.findIndex((s) => isHeroSized(s.src));
  if (heroIdx < 0) heroIdx = 0;
  const heroPick = scored[heroIdx];
  seen.add(heroPick.src);

  // Gallery: von 8 auf 24 hochgesetzt. Templates können selbst entscheiden
  // wie viele sie tatsächlich rendern — aber wenn nur 8 ankommen, gibt es
  // keine Wahl. 24 ist genug für Editorial-Mosaike mit Reserve fürs
  // onerror-Hide-broken-Pattern.
  const gallery = scored
    .filter((_, i) => i !== heroIdx)
    .filter((i) => !seen.has(i.src))
    .map((i) => i.src)
    .slice(0, 24);

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
