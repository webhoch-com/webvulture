/**
 * Shared editorial-magazine helpers for the four verein-* templates.
 *
 * Centralises the Phase-3 redesign patterns (marquee, big-number anchors,
 * pull-quote, per-section colour tones, XXL footer wordmark) plus the
 * regex-based content extractors (founded year, board, events) so each
 * branch template only has to import + invoke. Previously these lived
 * inline in verein-musik.ts and would have been copy-pasted 4x across
 * verein-musik/sport/tradition/verein.
 *
 * Convention: every render* function escapes its scraped inputs internally
 * — callers should NEVER pre-escape. Extractors are pure (no side-effects)
 * and return narrowly-typed results that templates can treat as already-
 * validated.
 *
 * Security: helpers that build markup wrap all spec-derived text in
 * `escapeHtml`. Tagline / body / business_name / address are
 * attacker-influenced via the scrape; never reach the DOM raw.
 */

import type { SiteSpec } from '../types.js';

export function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ─── Extractors (pure) ────────────────────────────────────────────────────────

/**
 * Find a founding year in about-body / tagline. Supports both phrasings:
 *   - trigger BEFORE year: "seit 1898", "gegründet im Jahr 1898", "since 1923"
 *   - trigger AFTER year:  "1898 gegründet", "im Jahr 1898 ins Leben gerufen"
 * Year range hard-bounded 1700–current to keep false positives down.
 */
export function extractFoundedYear(spec: SiteSpec): number | null {
  // Scan the RAW excerpt first — the about-body is heavily filtered and may
  // have dropped the founding-year sentence entirely (Block-A audit found
  // Puchkirchen had 'Der MV wurde 1923 gegründet' filtered out together
  // with a contact-line that followed it). raw_text_excerpt preserves all
  // sentences before filtering so we can recover the year directly.
  const text = [
    spec.raw_text_excerpt ?? '',
    spec.about?.body ?? '',
    spec.tagline ?? '',
    ...((spec.redesigned_sections ?? []).map(s => `${s.title}: ${s.body}`)),
  ].filter(Boolean).join(' ');
  const beforeRe = /\b(?:seit|gegründet|gegruendet|gründungsjahr|gruendungsjahr|established|since|von)\s*(?:im\s+jahr\s+)?:?\s*(1[78]\d{2}|19\d{2}|20[0-2]\d)\b/i;
  const afterRe  = /\b(?:im\s+jahr\s+)?(1[78]\d{2}|19\d{2}|20[0-2]\d)\s+(?:gegründet|gegruendet|ins\s+leben|established)\b/i;
  const currentYear = new Date().getFullYear();
  const m = text.match(beforeRe) || text.match(afterRe);
  if (m) {
    const year = parseInt(m[1], 10);
    if (year >= 1700 && year <= currentYear) return year;
  }
  // Fallback: use the oldest milestone year if extractHeritageMilestones
  // found ≥2 history-anchored years. This catches sites like Bruckmühl-
  // Thomasroith where "gegr. 1878" appears but our before/after-regexes
  // don't fire (the trigger word is abbreviated).
  const milestones = extractHeritageMilestones(spec);
  if (milestones.length >= 2) {
    const oldest = milestones.reduce((a, b) => a.year < b.year ? a : b);
    if (oldest.year < currentYear - 5) return oldest.year;
  }
  return null;
}

/**
 * Marquee items from real spec data. Returns at least 4 items by doubling
 * a short source list so the CSS `translateX(-50%)` loop stays seamless;
 * empty array when fewer than 2 distinct items exist (template skips
 * the marquee section instead of rendering a stub).
 */
export function buildMarqueeItems(spec: SiteSpec, foundedYear: number | null): string[] {
  const items: string[] = [];
  if (foundedYear) items.push(`Seit ${foundedYear}`);
  if (spec.contact?.address) {
    // Compound Austrian municipalities (Bad Ischl, Sankt Johann am Wimberg).
    const m = spec.contact.address.match(/\b\d{4,5}\s+([A-ZÄÖÜ][\wäöüÄÖÜß-]+(?:\s+(?:am|im|an|bei|ob|in|der|auf)\s+[A-ZÄÖÜ][\wäöüÄÖÜß-]+|\s+[A-ZÄÖÜ][\wäöüÄÖÜß-]+){0,3})/);
    if (m) items.push(m[1].trim());
  }
  const taglineWords = (spec.tagline || '').match(/\b[A-ZÄÖÜ][a-zäöüß]{3,}\b/g) || [];
  for (const w of taglineWords.slice(0, 4)) {
    if (!items.includes(w)) items.push(w);
  }
  for (const s of (spec.services || []).slice(0, 3)) {
    if (s.name && s.name.length < 24 && !items.includes(s.name)) items.push(s.name);
  }
  if (items.length < 2) return [];
  return [...items, ...items];
}

/**
 * Pick a substantive sentence from about.body that does NOT duplicate the
 * hero subhead. Falls back to the tagline at threshold ≥40 chars so thin
 * Vereinsseiten don't lose the editorial-quote section entirely.
 */
export function pickPullQuote(spec: SiteSpec): string | null {
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
  const subheadN = norm(spec.hero?.subheadline || '');
  const body = spec.about?.body || '';
  const sentences = body.match(/[^.!?]+[.!?]+/g) || [];
  // Score-and-rank rather than first-match: the FIRST decent-length sentence
  // is often the weakest one in scraped text (boilerplate intro line). The
  // strongest editorial sentence usually appears later — characterised by
  // higher word-count, presence of identity-anchors (year, location, member
  // count) and absence of contact/UI vocabulary.
  type Scored = { s: string; score: number };
  const scored: Scored[] = [];
  for (const raw of sentences) {
    const s = raw.trim();
    if (s.length < 50 || s.length > 220) continue;
    if (norm(s) === subheadN) continue;
    if (/zum inhalt|cookie|folgen sie|impressum|zuklappen|aufklappen|save the date/i.test(s)) continue;
    if (looksLikeContactDataSnippet(s)) continue;
    // Bracket-balance check: parenthetical fragments like "1889 als …) und
    // … (gegr." that audit found on Bruckmühl read as broken. Reject any
    // sentence with unbalanced ( ) or [ ] count.
    const open = (s.match(/[(\[]/g) || []).length;
    const close = (s.match(/[)\]]/g) || []).length;
    if (open !== close) continue;
    // Minimum word count to avoid 1-2 word fragments
    const words = (s.match(/\b\w+\b/g) || []).length;
    if (words < 8) continue;
    // Score: longer is better, presence of year/anchor words is better,
    // presence of "ist/sind/wir/uns" (narrative tone) is better.
    let score = words;
    if (/\b(seit|gegründet|gründungsjahr)\s+(1[78]\d{2}|19\d{2}|20[0-2]\d)\b/i.test(s)) score += 8;
    if (/\b(wir|uns|unsere?)\b/i.test(s)) score += 4;
    if (/\b(über \d+|mehr als \d+|\d+ aktiv)/i.test(s)) score += 3;
    // Penalty for sentences that start with a lower-case fragment ("at Kapellmeister")
    if (/^[a-zäöü]/.test(s)) score -= 10;
    scored.push({ s, score });
  }
  if (scored.length > 0) {
    scored.sort((a, b) => b.score - a.score);
    if (scored[0].score >= 8) return scored[0].s;
  }
  const tagline = (spec.tagline || '').trim();
  if (tagline.length >= 40 && norm(tagline) !== subheadN && !looksLikeContactDataSnippet(tagline)) {
    return tagline;
  }
  return null;
}

/**
 * Mirror of `looksLikeContactData` from orchestrator.ts — duplicated here so
 * the _editorial helpers stay independent from the orchestrator. Keep both
 * implementations in sync.
 */
function looksLikeContactDataSnippet(s: string): boolean {
  if (/[\w.+-]+@[\w-]+\.[\w.-]+/.test(s)) return true;
  const digitGroups = (s.match(/\b\d{3,}\b/g) || []).length;
  if (digitGroups >= 2) return true;
  const roleMatches = (s.match(/\b(Obmann|Kapellmeister|Schriftführer|Kassier|Trainer|Vorsitzend|Präsident|Stabführer|Geschäftsführer)\s*[:.-]/gi) || []).length;
  if (roleMatches >= 1) return true;
  if (/^(at|com|de|net|org|info)\b/i.test(s)) return true;
  if (/\bTel\.?\s*[:.]/i.test(s)) return true;
  if (/\b\d{4,5}\s+[A-ZÄÖÜ][\wäöüß-]+/.test(s)) return true;
  return false;
}

/**
 * Find board members in scraped text. Looks for "Role: Name" patterns where
 * Role is a German Vereins-Funktion. Returns up to 6 entries; empty if
 * fewer than 2 valid matches (one match alone reads worse than none).
 * Matches are bounded — Name must be 4–60 chars, alphabet/space/hyphen only.
 */
export function extractBoardMembers(spec: SiteSpec): Array<{ name: string; role: string }> {
  // Prefer spec.team wenn vom orchestrator schon befüllt (neuerer Pfad mit
  // breiterer Rollen-Liste + Separator-toleranter Pattern). Fallback auf die
  // regex-basierte Extraktion aus raw_text_excerpt.
  if (spec.team && spec.team.length > 0) {
    return spec.team.map(m => ({ name: m.name, role: m.role }));
  }

  // Set-based join: raw_text_excerpt already contains about.body and the
  // redesigned_sections, so a list-join would scan the same characters twice.
  // The dedupe set keys on the raw source-string identity (cheapest cap on
  // double-counting); the per-name `seen` set below still handles overlap
  // when separate sources mention the same person.
  const sources = new Set<string>();
  if (spec.raw_text_excerpt) sources.add(spec.raw_text_excerpt);
  if (spec.about?.body) sources.add(spec.about.body);
  if (spec.tagline) sources.add(spec.tagline);
  for (const s of (spec.redesigned_sections ?? [])) {
    sources.add(`${s.title}: ${s.body}`);
  }
  const text = Array.from(sources).join('\n');

  // Use matchAll instead of stateful .exec() — same result, no shared state risk.
  const ROLE_RE = /\b(Obmann(?:[-\s]?Stellvertreter)?|Obfrau(?:[-\s]?Stellvertreter)?|Kapellmeister(?:[-\s]?Stellvertreter)?|Vorsitzender?|Vorstand|Schriftführer(?:in)?|Kassier(?:in)?|Trainer(?:in)?|Präsident(?:in)?|Stabführer(?:in)?|Jugendreferent(?:in)?)\b\s*[:\-—]\s*([A-ZÄÖÜ][a-zäöüß]+(?:[\s-][A-ZÄÖÜ][a-zäöüß]+){1,3})/g;

  const seen = new Set<string>();
  const out: Array<{ name: string; role: string }> = [];
  for (const m of text.matchAll(ROLE_RE)) {
    const role = m[1].trim();
    const name = m[2].trim();
    if (name.length < 4 || name.length > 60) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name, role });
    if (out.length >= 6) break;
  }
  // A single match is usually a false positive ("Kontakt: Webagentur") — only
  // surface when at least two distinct people line up. Log when we found
  // exactly one so operators can spot "should have rendered" patterns and
  // tune the regex if it's a real Verein with only one named officer.
  if (out.length === 1) {
    // eslint-disable-next-line no-console
    console.warn('[editorial.extractor] board_suppressed_below_threshold', JSON.stringify({
      role: out[0].role, name_initial: out[0].name[0],
    }));
    return [];
  }
  return out;
}

/**
 * Find dated events in scraped text. Looks for German date patterns followed
 * by event title context. Returns up to 4. Defensive: rejects past years,
 * rejects items where the context is obviously chrome ("Stand vom", "Geändert
 * am"), keeps the dedupe strict so the same fest doesn't show 3x.
 */
export function extractEvents(spec: SiteSpec): Array<{ date: string; title: string; description?: string }> {
  // Dedupe sources before regex: raw_text_excerpt already contains the page
  // body, and redesigned_sections are derived from the same upstream pool, so
  // joining all four would scan many bytes twice. Set-based join keeps the
  // single-pass match-cost down without losing any unique text.
  const sources = new Set<string>();
  if (spec.raw_text_excerpt) sources.add(spec.raw_text_excerpt);
  if (spec.about?.body) sources.add(spec.about.body);
  for (const s of (spec.redesigned_sections ?? [])) {
    sources.add(`${s.title}\n${s.body}`);
  }
  const text = Array.from(sources).join('\n');

  // DD.MM.YYYY or DD.MM. with optional title context after a colon/dash/newline.
  // We deliberately don't try to handle written-out month names — too many
  // false positives ("am 15. Geburtstag", "im 23. Jahrhundert").
  const DATE_RE = /\b(\d{1,2})\.(\d{1,2})\.(\d{2,4})?(?:[\s,;:.\-—]+)([^.\n!?]{8,80})/g;

  const currentYear = new Date().getFullYear();
  const seen = new Set<string>();
  const out: Array<{ date: string; title: string; description?: string }> = [];
  // Counters so operators see "we found 14 dates, kept 0" patterns and can
  // tell whether the regex / filter is too aggressive on a particular site.
  let droppedYearless = 0;
  let droppedOutOfRange = 0;
  let droppedChrome = 0;
  for (const m of text.matchAll(DATE_RE)) {
    const day = parseInt(m[1], 10);
    const month = parseInt(m[2], 10);
    if (day < 1 || day > 31 || month < 1 || month > 12) continue;
    // Year handling: REQUIRED — the "DD.MM. <title>" shape (no year) was
    // surfacing as "upcoming" events even when the source page was years
    // stale, because we had no anchor to filter against. Skipping yearless
    // matches removes that whole class of false-future events. The
    // 6000-char text_content always carries enough context for years on
    // real Vereinsseiten; the trade-off is acceptable.
    if (!m[3]) { droppedYearless += 1; continue; }
    let year = parseInt(m[3], 10);
    if (year < 100) year += 2000;
    if (year < currentYear - 1 || year > currentYear + 3) { droppedOutOfRange += 1; continue; }
    const rawTitle = m[4].trim().replace(/\s+/g, ' ');
    if (/stand vom|geändert|datenschutz|impressum|cookie|copyright|©/i.test(rawTitle)) { droppedChrome += 1; continue; }
    const title = rawTitle.length > 70 ? rawTitle.slice(0, 70).replace(/\s+\S*$/, '') + '…' : rawTitle;
    const dateStr = `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}.${year}`;
    const key = `${dateStr}|${title.toLowerCase().slice(0, 30)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ date: dateStr, title });
    if (out.length >= 4) break;
  }
  // Only log when the scraper found dates AND we kept none of them — the
  // common "we found 0 dates" case is silent (most Vereine just don't list
  // dated events on their homepage). Pattern in 1-of-1 case is the same as
  // board: useful for operators tuning the regex.
  const totalDropped = droppedYearless + droppedOutOfRange + droppedChrome;
  if (out.length === 0 && totalDropped > 0) {
    // eslint-disable-next-line no-console
    console.warn('[editorial.extractor] events_all_suppressed', JSON.stringify({
      yearless: droppedYearless, out_of_range: droppedOutOfRange, chrome: droppedChrome,
    }));
  }
  return out;
}

// ─── Renderers (HTML output, all spec data is escaped here) ──────────────────

export function renderMarquee(items: string[]): string {
  if (items.length === 0) return '';
  return `
<div class="marquee" aria-hidden="true">
  <div class="marquee-track">${items.map(i => `<span>${escapeHtml(i)}</span>`).join('')}</div>
</div>
`;
}

export function renderBigNumberAnchor(idx: number, onDark = false): string {
  const padded = String(idx).padStart(2, '0');
  const cls = onDark ? 'section-anchor-wrap on-dark' : 'section-anchor-wrap';
  return `<div class="${cls}"><span class="section-anchor">${padded}</span></div>`;
}

export function renderPullQuote(quote: string | null, byline: string): string {
  if (!quote) return '';
  return `
<section class="pullquote-section">
  <div class="pullquote-inner">
    <div class="pullquote-mark" aria-hidden="true">"</div>
    <blockquote class="pullquote-text">${escapeHtml(quote)}</blockquote>
    <div class="pullquote-byline">${escapeHtml(byline)}</div>
  </div>
</section>
`;
}

export function renderStoriesGrid(sections: Array<{ title: string; body: string }> | undefined): string {
  if (!sections || sections.length === 0) return '';
  const cards = sections.slice(0, 5).map((s, i) => {
    const body = s.body.length > 320
      ? s.body.slice(0, 320).replace(/\s+\S*$/, '') + '…'
      : s.body;
    return `
      <article class="story-card">
        <span class="story-num">${String(i + 1).padStart(2, '0')} / ${String(Math.min(sections.length, 5)).padStart(2, '0')}</span>
        <h3>${escapeHtml(s.title)}</h3>
        <p>${escapeHtml(body)}</p>
      </article>
    `;
  }).join('');
  return `
<section class="stories-section">
  <div class="container">
    <div class="section-head">
      <span class="section-eyebrow">Aus Ihrer Webseite — neu interpretiert</span>
      <h2 class="section-title">Was uns <em>ausmacht</em>.</h2>
    </div>
    <div class="stories-grid">${cards}</div>
  </div>
</section>
`;
}

const SOCIAL_ICONS: Record<string, string> = {
  facebook: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 12c0-5.5-4.5-10-10-10S2 6.5 2 12c0 5 3.7 9.1 8.4 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.4h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.7l-.4 2.9h-2.3v7c4.7-.8 8.5-4.9 8.5-9.9z"/></svg>',
  instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.4A4 4 0 1 1 12.6 8 4 4 0 0 1 16 11.4z"/><line x1="17.5" y1="6.5" x2="17.5" y2="6.5"/></svg>',
  youtube: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23 7.5s-.2-1.6-.9-2.3c-.8-.9-1.8-.9-2.2-1C16.7 4 12 4 12 4s-4.7 0-7.9.2c-.5.1-1.4.1-2.2 1C1.2 5.9 1 7.5 1 7.5S.8 9.4.8 11.3v1.4c0 1.9.2 3.8.2 3.8s.2 1.6.9 2.3c.8.9 1.9.9 2.4 1 1.8.2 7.7.2 7.7.2s4.7 0 7.9-.2c.5-.1 1.4-.1 2.2-1 .7-.7.9-2.3.9-2.3s.2-1.9.2-3.8v-1.4c0-1.9-.2-3.8-.2-3.8zM9.7 14.6V8.2l6.2 3.2-6.2 3.2z"/></svg>',
  tiktok: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.6 6.3A4.85 4.85 0 0 1 17.7 3h-3.3v13.4a2.86 2.86 0 0 1-5.4 1.3 2.85 2.85 0 0 1 4-3.8V10.3a6.16 6.16 0 0 0-7.1 9.5 6.18 6.18 0 0 0 9.8.4 6.4 6.4 0 0 0 1.4-4V8.7a8.16 8.16 0 0 0 4.7 1.5V7a4.79 4.79 0 0 1-2.2-.7z"/></svg>',
  linkedin: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM8.339 18v-8.59H5.667V18zm-1.34-9.764a1.55 1.55 0 1 0 0-3.099 1.55 1.55 0 0 0 0 3.1zM18 18v-4.708c0-2.575-1.395-3.77-3.255-3.77-1.502 0-2.175.825-2.55 1.404V9.41h-2.834c.037.798 0 8.59 0 8.59h2.834v-4.797c0-.255.018-.51.093-.692.205-.51.671-1.037 1.453-1.037 1.026 0 1.435.781 1.435 1.927V18z"/></svg>',
  twitter: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
};

const SOCIAL_PLATFORMS = ['facebook', 'instagram', 'youtube', 'tiktok', 'linkedin', 'twitter'] as const;

export function renderSocialStrip(socials: Record<string, string> | undefined): string {
  if (!socials) return '';
  // Defense-in-depth: even though the orchestrator already restricts socials
  // to known platforms over https://, we re-validate here so a future caller
  // bypassing the orchestrator (tests, direct callers) can't produce
  // javascript: hrefs or attribute-breakout payloads. Scheme allow-list +
  // escapeHtml on the URL itself.
  const safeHrefRe = /^https?:\/\//i;
  const items = Object.entries(socials)
    .filter(([k, v]) =>
      typeof v === 'string'
      && v.length < 512
      && safeHrefRe.test(v)
      && (SOCIAL_PLATFORMS as readonly string[]).includes(k.toLowerCase())
    )
    .map(([k, v]) => ({ platform: k.toLowerCase(), href: v, label: k }));
  if (items.length === 0) return '';
  const links = items
    .filter(i => SOCIAL_ICONS[i.platform])
    .map(i => `<a href="${escapeHtml(i.href)}" target="_blank" rel="noopener nofollow" aria-label="${escapeHtml(i.label)}">${SOCIAL_ICONS[i.platform]}</a>`)
    .join('');
  if (!links) return '';
  return `<div class="vf-socials">${links}</div>`;
}

/**
 * Heritage-Statement: large editorial block right under the hero that
 * makes the club's identity feel rooted before any service-grid begins.
 * Based on research of premium Amateur-Musikvereine (Speckbacher Hall,
 * Algunder, Lana) which all open with a "we are X since Y" anchor.
 *
 * Format: "Wir spielen seit YYYY · stadtname" in display-serif as a
 * single hero-sized statement. Falls back gracefully when founding year
 * isn't extractable.
 */
export function renderHeritageStatement(spec: SiteSpec, foundedYear: number | null): string {
  // Defense-in-depth: TS guarantees `foundedYear: number | null`, but at runtime
  // a caller may have read it from spec JSON (string-typed). Coerce explicitly
  // so we never interpolate a non-numeric value into the HTML output.
  const yr = Number(foundedYear);
  if (!Number.isFinite(yr) || yr < 1700) return '';
  const years = new Date().getFullYear() - yr;
  if (years <= 0) return '';
  foundedYear = yr;  // shadow with the coerced int for the rest of the function
  // Try to extract the city from the address
  let city = '';
  if (spec.contact?.address) {
    const m = spec.contact.address.match(/\b\d{4,5}\s+([A-ZÄÖÜ][\wäöüÄÖÜß-]+(?:\s+(?:am|im|an|bei|ob|in|der|auf)\s+[A-ZÄÖÜ][\wäöüÄÖÜß-]+)?)/);
    if (m) city = m[1].trim().split(/[,\n]/)[0].trim();
  }
  const statement = city
    ? `Seit <em>${foundedYear}</em> in ${escapeHtml(city)}.`
    : `Seit <em>${foundedYear}</em> in der Region.`;
  return `
<section class="heritage-statement reveal">
  <div class="heritage-inner">
    <span class="heritage-kicker"><span class="count-up" data-target="${years}">${years}</span> Jahre Tradition</span>
    <h2 class="heritage-headline">${statement}</h2>
  </div>
</section>`;
}

/**
 * Heritage Milestones: harvest distinct year-anchors from raw text + the
 * surrounding sentence as the milestone label. Returns up to 4 chronologically
 * sorted milestones with the line of context that mentioned each year.
 *
 * Inspired by Bruckmühl-Thomasroith which has 1878 (Bergknappenkapelle
 * gegründet) → 1889 (Feuerwehr-Musikkapelle) → 2024 (Fusion) in its
 * about-text but no current template renders this as a timeline.
 */
export function extractHeritageMilestones(spec: SiteSpec): Array<{ year: number; label: string }> {
  const sources = new Set<string>();
  if (spec.raw_text_excerpt) sources.add(spec.raw_text_excerpt);
  if (spec.about?.body) sources.add(spec.about.body);
  for (const s of (spec.redesigned_sections ?? [])) sources.add(s.body);
  const text = Array.from(sources).join('\n');

  const currentYear = new Date().getFullYear();
  // Anchor on a HISTORY trigger word so we don't mistake event dates or
  // UI-text years for milestones. Pattern: "(gegründet|fusioniert|...)"
  // within ±80 chars of the year. Also accept the inverse — year preceded
  // by "Im Jahr|Anno|Seit".
  const HISTORY_TRIGGER = /(gegr[üu]ndet|gegr\.|gegruendet|entstanden|fusioniert|fusion|gr[üu]ndung|jubil[äa]um|verein\s+wurde|kapelle\s+wurde|geburtsstunde|ins\s+leben|wiederbelebt|erbaut|seit)/i;
  const yearWithContext = /\b(1[78]\d{2}|19\d{2}|20[0-2]\d)\b([^.!?\n]{0,150})/gi;
  const reverseTrigger = /(?:im\s+jahr|anno|seit)\s+\b(1[78]\d{2}|19\d{2}|20[0-2]\d)\b([^.!?\n]{0,150})/gi;
  // UI-junk filter — these strings indicate the year matched event-list
  // or login-widget text, not a heritage statement.
  const UI_JUNK = /(login|passwort|benutzer|iframes?|save\s+the\s+date|registr|cookie|impressum|newsletter|abmelden|anmelden|datenschutz)/i;

  const seen = new Set<number>();
  const out: Array<{ year: number; label: string }> = [];

  function tryAdd(year: number, ctx: string) {
    if (year < 1700 || year > currentYear - 1) return;  // exclude future + current year (= event date)
    if (seen.has(year)) return;
    if (UI_JUNK.test(ctx)) return;
    seen.add(year);
    let label = ctx.trim().replace(/^[\s,;:.)\]>}\-]+/, '');  // strip leading punctuation
    if (label.length > 60) label = label.slice(0, 60).replace(/\s+\S*$/, '') + '…';
    if (label.length < 8) label = 'Bedeutendes Jahr in unserer Geschichte';
    out.push({ year, label });
  }

  for (const m of text.matchAll(yearWithContext)) {
    if (out.length >= 6) break;
    const year = parseInt(m[1], 10);
    const ctx = m[2] || '';
    // Window check — only accept if HISTORY_TRIGGER appears within the 150-char
    // window or in the 60-char window BEFORE the year.
    const beforeIdx = Math.max(0, (m.index ?? 0) - 60);
    const before = text.slice(beforeIdx, m.index);
    if (HISTORY_TRIGGER.test(ctx) || HISTORY_TRIGGER.test(before)) {
      tryAdd(year, ctx);
    }
  }
  for (const m of text.matchAll(reverseTrigger)) {
    if (out.length >= 6) break;
    tryAdd(parseInt(m[1], 10), m[2] || '');
  }

  out.sort((a, b) => a.year - b.year);
  return out.length >= 2 ? out.slice(0, 4) : [];
}

/**
 * Renders a horizontal heritage timeline. Three to four chronological
 * nodes with year + short label. Only emit when extractHeritageMilestones
 * returned ≥2 entries.
 */
export function renderHeritageTimeline(milestones: Array<{ year: number; label: string }>): string {
  if (milestones.length < 2) return '';
  const nodes = milestones.map(m => `
    <li class="ht-node reveal">
      <div class="ht-year">${m.year}</div>
      <div class="ht-label">${escapeHtml(m.label)}</div>
    </li>
  `).join('');
  return `
<section class="heritage-timeline pattern-notes" style="position:relative">
  <div class="container">
    <div class="section-head center reveal">
      <span class="section-eyebrow">Chronik</span>
      <h2 class="section-title">Unser <em>Werdegang</em>.</h2>
    </div>
    <ol class="ht-track stagger-group">${nodes}</ol>
  </div>
</section>`;
}

/**
 * Ensemble extractor — finds sub-band names like Jugendkapelle, Big Band,
 * Bläserklasse that real Vereine often present as separate brand-tiles.
 * Returns at most 5 distinct ensembles. Used by renderEnsembleGrid.
 */
export function extractEnsembles(spec: SiteSpec): Array<{ name: string; context: string }> {
  const sources = new Set<string>();
  if (spec.raw_text_excerpt) sources.add(spec.raw_text_excerpt);
  if (spec.about?.body) sources.add(spec.about.body);
  for (const s of (spec.redesigned_sections ?? [])) sources.add(`${s.title}\n${s.body}`);
  const text = Array.from(sources).join('\n');

  const ENSEMBLE_RE = /\b(Jugendkapelle|Jungbläser|Bläserklasse|Bläserbande|Big[\s-]?Band|Marschformation|Junior[\s-]?Band|Schülerorchester|Hauptkapelle|Stammkapelle|Salonorchester|Brass[\s-]?Ensemble|Holzbläser-?Ensemble|Blechbläser-?Ensemble|Senioren-?Kapelle)\b[^.!?\n]{0,80}/gi;
  const seen = new Set<string>();
  const out: Array<{ name: string; context: string }> = [];
  for (const m of text.matchAll(ENSEMBLE_RE)) {
    const name = m[1].trim();
    const key = name.toLowerCase().replace(/[\s-]/g, '');
    if (seen.has(key)) continue;
    seen.add(key);
    let context = m[0].slice(name.length).replace(/^[\s,;:.-]+/, '').trim();
    if (context.length > 100) context = context.slice(0, 100).replace(/\s+\S*$/, '') + '…';
    out.push({ name, context });
    if (out.length >= 5) break;
  }
  return out;
}

export function renderEnsembleGrid(ensembles: Array<{ name: string; context: string }>): string {
  if (ensembles.length === 0) return '';
  // SVG instrument silhouettes — rotate one per tile so each ensemble has
  // a distinct visual mark. All inline so no extra HTTP requests.
  const ICONS = [
    // Trumpet
    '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 32h36"/><circle cx="44" cy="32" r="6"/><path d="M50 32h10v-6m0 12V32"/><circle cx="14" cy="36" r="2" fill="currentColor" stroke="none"/><circle cx="22" cy="36" r="2" fill="currentColor" stroke="none"/><circle cx="30" cy="36" r="2" fill="currentColor" stroke="none"/></svg>',
    // Music notes
    '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M22 14v32"/><path d="M42 8v32"/><circle cx="18" cy="46" r="4" fill="currentColor"/><circle cx="38" cy="40" r="4" fill="currentColor"/><path d="M22 14h20v6h-20z" fill="currentColor"/></svg>',
    // Drum
    '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.8"><ellipse cx="32" cy="22" rx="22" ry="8"/><path d="M10 22v20a22 8 0 0 0 44 0V22"/><path d="M10 32a22 8 0 0 0 44 0"/></svg>',
    // Conductor baton
    '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="14" cy="14" r="4" fill="currentColor"/><path d="M16 16 L52 52"/><path d="M48 48 L56 52 L52 56 Z" fill="currentColor"/></svg>',
    // Tuba
    '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="34" cy="36" r="18"/><circle cx="34" cy="36" r="10"/><path d="M50 24v-6h8v18"/></svg>',
  ];
  const tiles = ensembles.map((e, i) => `
    <article class="ensemble-card reveal">
      <div class="ensemble-icon" aria-hidden="true">${ICONS[i % ICONS.length]}</div>
      <div class="ensemble-num">${String(i + 1).padStart(2, '0')} / ${String(ensembles.length).padStart(2, '0')}</div>
      <h3>${escapeHtml(e.name)}</h3>
      ${e.context ? `<p>${escapeHtml(e.context)}</p>` : ''}
    </article>
  `).join('');
  return `
<section class="ensemble-grid-section">
  <div class="container">
    <div class="section-head reveal">
      <span class="section-eyebrow">Unsere Klangkörper</span>
      <h2 class="section-title">Vielfalt unter <em>einem Dach</em>.</h2>
    </div>
    <div class="ensemble-grid stagger-group">${tiles}</div>
  </div>
</section>`;
}

/**
 * Künstlerische-Leitung-Card: when board contains a Kapellmeister/Stabführer
 * with a name, surface them in a single tall card with focus emphasis,
 * BEFORE the regular Vorstand-grid. Premium pattern from Algunder (Mozarteum-
 * graduate Kapellmeister profile).
 */
export function renderKuenstlerischeLeitung(board: Array<{ name: string; role: string }>): string {
  // Find the first Kapellmeister-equivalent role
  // Keep this list tight — generic roles like "Trainer" would let a sport-
  // club coach get promoted to a "Künstlerische Leitung"-card with a music-
  // specific blurb. Only roles that unambiguously imply musical leadership.
  const LEITER_RE = /^(Kapellmeister|Musikalische?\s+Leitung|Dirigent|Chorleiter|Stabführer|Stabfuehrer)/i;
  const leiter = board.find(m => LEITER_RE.test(m.role));
  if (!leiter) return '';
  const initials = leiter.name.split(/\s+/).map(w => w[0] || '').slice(0, 2).join('').toUpperCase();
  return `
<section class="leitung-section">
  <div class="container">
    <div class="leitung-inner">
      <div class="leitung-portrait" aria-hidden="true">${escapeHtml(initials)}</div>
      <div class="leitung-body">
        <span class="section-eyebrow">Künstlerische Leitung</span>
        <h2 class="section-title leitung-name">${escapeHtml(leiter.name)}</h2>
        <div class="leitung-role">${escapeHtml(leiter.role)}</div>
        <p class="leitung-blurb">Verantwortlich für die musikalische Ausrichtung und das künstlerische Programm. Probenarbeit, Werkauswahl, klangliche Identität — alles aus einer Hand.</p>
      </div>
    </div>
  </div>
</section>`;
}

export function renderRatingPill(spec: SiteSpec): string {
  // isFinite guard: a scraped rating of NaN or Infinity passes the
  // `typeof === 'number'` check but breaks the >=/< comparisons (NaN
  // arithmetic returns false → silent no-render with no operator signal).
  // Treat non-finite values the same as missing.
  const rawRating = spec.business?.rating;
  const rating = typeof rawRating === 'number' && Number.isFinite(rawRating) ? rawRating : null;
  const rawCount = spec.business?.review_count;
  const reviewCount = typeof rawCount === 'number' && Number.isFinite(rawCount) ? rawCount : 0;
  if (rating === null || rating < 4.0 || reviewCount < 5) return '';
  // Clamp to a valid 1–5 stars range so even garbage values like 12.7
  // produce a defensible label rather than 13 filled stars.
  const full = Math.max(0, Math.min(5, Math.round(rating)));
  const stars = '★'.repeat(full) + '☆'.repeat(5 - full);
  return `
<div class="hero-rating" role="img" aria-label="Google-Bewertung ${rating.toFixed(1)} von 5 Sternen, basierend auf ${reviewCount} Bewertungen">
  <span class="stars" aria-hidden="true">${stars}</span>
  <span class="meta"><strong>${rating.toFixed(1).replace('.', ',')}</strong> · ${reviewCount} Google-Bewertungen</span>
</div>`;
}

export function renderBoardSection(board: Array<{ name: string; role: string }>): string {
  if (board.length === 0) return '';
  const cards = board.map(m => {
    const initials = m.name.split(/\s+/).map(w => w[0] || '').slice(0, 2).join('').toUpperCase();
    return `
      <article class="board-card">
        <div class="board-monogram" aria-hidden="true">${escapeHtml(initials)}</div>
        <h4>${escapeHtml(m.name)}</h4>
        <div class="role">${escapeHtml(m.role)}</div>
      </article>
    `;
  }).join('');
  return `
<section class="section board-section">
  <div class="container">
    <div class="section-head center">
      <span class="section-eyebrow">Wer trägt den Verein</span>
      <h2 class="section-title">Unser <em>Vorstand</em>.</h2>
    </div>
    <div class="board-grid">${cards}</div>
  </div>
</section>
`;
}

/**
 * XXL Wordmark footer — premium pattern from Locomotive / Lando Norris /
 * i-D Magazine. Replaces the conventional "4-spalter mit Logo links + Links
 * rechts" footer with a single huge type-set wordmark plus a single CTA
 * and minimal link row. Accepts an explicit ctaText so each branch passes
 * its own ("Tisch reservieren", "Erstberatung vereinbaren", etc.).
 *
 * Slots: socials icon-strip is auto-included when spec.socials is set.
 * Defensive: returns empty string if businessName is empty (prevents the
 * "blank giant block" failure mode on totally-broken scrapes).
 */
export function renderQuietFooter(opts: {
  businessName: string;
  tagline?: string;
  ctaText: string;
  ctaHref?: string;
  legalLinks?: Array<{ label: string; href: string }>;
  socials?: Record<string, string>;
  creditText?: string;
}): string {
  if (!opts.businessName) return '';
  const legal = (opts.legalLinks ?? [
    { label: 'Impressum', href: '/impressum' },
    { label: 'Datenschutz', href: '/datenschutz' },
  ]).map(l => `<a href="${escapeHtml(l.href)}">${escapeHtml(l.label)}</a>`).join('<span aria-hidden="true">·</span>');
  return `
<footer class="quiet-footer">
  <div class="quiet-footer-inner">
    <div class="quiet-wordmark" aria-hidden="true">${escapeHtml(opts.businessName)}<span class="qf-dot">.</span></div>
    ${opts.tagline ? `<p class="quiet-tagline">${escapeHtml(opts.tagline)}</p>` : ''}
    <div class="quiet-cta-row">
      <a href="${opts.ctaHref || '#kontakt'}" class="quiet-cta">${escapeHtml(opts.ctaText)} <span aria-hidden="true">→</span></a>
    </div>
    ${renderSocialStrip(opts.socials)}
    <div class="quiet-bottom">
      <div class="quiet-legal">${legal}</div>
      <div class="quiet-credit">© ${new Date().getFullYear()} ${escapeHtml(opts.businessName)} · ${opts.creditText || 'Demo erstellt von <a href="https://webhoch.com" target="_blank" rel="noopener">Webagentur Hochmeir e.U.</a>'}</div>
    </div>
  </div>
</footer>`;
}

/**
 * Trust-bar — quantified stats row (Parsley Health, Modern Animal, Latham &
 * Watkins). Replaces narrative-only about-us blocks with concrete numbers
 * pulled from the orchestrator. Pass between 2-5 stats; the template auto-
 * sizes the grid.
 *
 * Each stat: { value: "20+", label: "Jahre Erfahrung" }. Values are styled
 * as huge display-numerals; labels as small uppercase tracking. Never
 * invent numbers — callers should derive from spec.business.review_count,
 * extractFoundedYear, etc.
 */
export function renderTrustBar(stats: Array<{ value: string; label: string }>): string {
  if (stats.length === 0) return '';
  const items = stats.slice(0, 5).map(s => `
    <div class="trust-stat">
      <div class="trust-value">${escapeHtml(s.value)}</div>
      <div class="trust-label">${escapeHtml(s.label)}</div>
    </div>
  `).join('');
  return `
<section class="trust-bar" aria-label="Eckdaten">
  <div class="trust-bar-inner">${items}</div>
</section>`;
}

/**
 * Newsletter capture — penultimate-section pattern from 9/12 premium hotels
 * and 7/9 healthcare sites. Single email field + subscribe button, never a
 * multi-field form. Optional kicker line above headline.
 */
export function renderNewsletterCTA(opts: {
  kicker?: string;
  headline: string;
  body?: string;
  actionHref?: string;
}): string {
  return `
<section class="newsletter-cta">
  <div class="newsletter-inner">
    ${opts.kicker ? `<span class="nl-kicker">${escapeHtml(opts.kicker)}</span>` : ''}
    <h2 class="nl-headline">${escapeHtml(opts.headline)}</h2>
    ${opts.body ? `<p class="nl-body">${escapeHtml(opts.body)}</p>` : ''}
    <form class="nl-form" action="${opts.actionHref || '#'}" method="post" onsubmit="event.preventDefault(); alert('Im Demo deaktiviert. Anfragen bitte per E-Mail.');">
      <input type="email" name="email" placeholder="ihre@email.at" required aria-label="E-Mail" class="nl-input">
      <button type="submit" class="nl-button">Eintragen</button>
    </form>
  </div>
</section>`;
}

export function renderEventsSection(events: Array<{ date: string; title: string; description?: string }>): string {
  if (events.length === 0) return '';
  const rows = events.map(ev => `
    <article class="event-row">
      <div class="when">${escapeHtml(ev.date)}</div>
      <div class="what">${escapeHtml(ev.title)}</div>
    </article>
  `).join('');
  return `
<section class="section events-section">
  <div class="container">
    <div class="section-head center">
      <span class="section-eyebrow">Termine</span>
      <h2 class="section-title">Wann Sie uns <em>erleben können</em>.</h2>
    </div>
    <div class="events-extracted-list">${rows}</div>
  </div>
</section>
`;
}

// ─── Shared editorial CSS (paste once per page) ──────────────────────────────

/**
 * One block of CSS that defines all editorial widgets (tone-switches,
 * section-anchor numbers, marquee, pull-quote, stories-grid, vf-wordmark,
 * board cards, events list, rating pill, social strip).
 *
 * Variables consumed: --primary, --primary-deep, --accent, --ink, --rule,
 *                     --bg, --display, --serif.
 * Each verein-* host template declares these — fallbacks are baked in for
 * defensive rendering should a variable ever be missing.
 *
 * SECURITY ASSUMPTION: every caller of this block MUST guarantee that the
 * values landing in --primary / --accent / --secondary are normalised hex
 * strings produced by `normalizeHex` in the orchestrator. CSS `color-mix()`
 * happily parses anything — a raw scraped value like `red; background:
 * url(javascript:…)` interpolated into `var(--primary)` would land inside
 * the `color-mix(in oklch, var(--primary) 8%, white)` expressions below
 * and could break out via CSS-property injection. The orchestrator
 * `normalizeHex` (see orchestrator.ts) enforces /^#([0-9a-f]{3,6})$/i;
 * keep that contract or this block becomes a CSSi sink.
 */
export const EDITORIAL_CSS = `
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

.section-anchor-wrap {
  max-width: 1400px; margin: 0 auto;
  padding: clamp(2rem, 4vw, 3.5rem) clamp(1.5rem, 5vw, 5rem) 0;
  pointer-events: none; overflow: hidden;
}
.section-anchor {
  display: block;
  font-family: var(--display, Georgia, serif); font-weight: 700;
  font-size: clamp(6rem, 18vw, 16rem);
  line-height: 0.85; letter-spacing: -0.04em;
  -webkit-text-stroke: 1px var(--accent, #b8893d);
  color: transparent;
  opacity: 0.45;
}
.section-anchor-wrap.on-dark .section-anchor {
  -webkit-text-stroke-color: rgba(255,255,255,0.35);
}

.marquee {
  background: var(--primary-deep, #1c2f1f); color: var(--accent, #b8893d);
  padding: 1.1rem 0; overflow: hidden; position: relative;
  border-top: 1px solid color-mix(in oklch, var(--accent, #b8893d) 30%, transparent);
  border-bottom: 1px solid color-mix(in oklch, var(--accent, #b8893d) 30%, transparent);
}
.marquee-track {
  display: inline-flex; gap: 3rem; padding-left: 3rem;
  white-space: nowrap; animation: wv-marquee 36s linear infinite;
  font-family: var(--display, Georgia, serif); font-weight: 500;
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

.pullquote-section {
  background: linear-gradient(135deg, var(--primary, #2d4a32) 0%, var(--primary-deep, #1c2f1f) 100%);
  color: #fff; padding: clamp(5rem, 10vw, 9rem) 1.5rem;
  border-top: 4px solid var(--accent, #b8893d);
  border-bottom: 4px solid var(--accent, #b8893d);
  position: relative;
}
.pullquote-inner { max-width: 1100px; margin: 0 auto; }
.pullquote-mark {
  font-family: var(--display, Georgia, serif); font-weight: 700;
  font-size: clamp(6rem, 12vw, 10rem); line-height: 0.7;
  color: var(--accent, #b8893d); opacity: 0.85;
  margin-bottom: 1rem;
}
.pullquote-text {
  font-family: var(--display, Georgia, serif); font-style: italic; font-weight: 400;
  font-size: clamp(1.7rem, 4vw, 3.4rem);
  line-height: 1.22; letter-spacing: -0.015em;
  color: #fff; max-width: 28ch; text-wrap: balance;
}
.pullquote-byline {
  margin-top: 2rem; display: inline-flex; align-items: center; gap: 1rem;
  font-family: var(--display, Georgia, serif); font-size: 0.92rem;
  letter-spacing: 0.16em; text-transform: uppercase;
  color: var(--accent, #b8893d); font-weight: 600;
}
.pullquote-byline::before { content: ""; width: 36px; height: 1.5px; background: var(--accent, #b8893d); }

.stories-section { padding: clamp(5rem, 9vw, 8rem) 1.5rem; background: var(--bg, #fff); }
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
  padding-bottom: 2rem; border-bottom: 1px solid var(--rule, rgba(0,0,0,0.1));
}
.story-card .story-num {
  font-family: var(--display, Georgia, serif); font-size: 0.82rem;
  color: var(--accent, #b8893d); letter-spacing: 0.22em;
  text-transform: uppercase; font-weight: 600;
}
.story-card h3 {
  font-family: var(--display, Georgia, serif); font-weight: 500;
  font-size: clamp(1.8rem, 3.4vw, 2.6rem);
  line-height: 1.1; letter-spacing: -0.015em;
  color: var(--ink, #1f1a14);
}
.story-card h3 em { color: var(--primary, #2d4a32); font-style: italic; }
.story-card p {
  color: var(--ink-2, #4a4030); font-size: 1.02rem; line-height: 1.75;
  font-family: var(--serif, Georgia, serif);
}

.vf-wordmark {
  font-family: var(--display, Georgia, serif); font-weight: 600;
  font-size: clamp(3rem, 12vw, 11rem); line-height: 0.92;
  letter-spacing: -0.04em; color: #fff;
  padding-bottom: clamp(2rem, 4vw, 3rem);
  border-bottom: 1px solid rgba(255,255,255,0.10);
  margin-bottom: clamp(2.5rem, 5vw, 4rem);
  max-width: 100%; word-break: break-word;
}
.vf-wordmark .accent { color: var(--accent, #b8893d); }

.hero-rating {
  display: inline-flex; align-items: center; gap: 0.7rem;
  margin-top: 1.5rem; padding: 0.45rem 1rem;
  background: rgba(255,255,255,0.10); border: 1px solid rgba(255,255,255,0.18);
  border-radius: 999px; backdrop-filter: blur(8px);
  font-family: var(--display, Georgia, serif); font-size: 0.85rem; color: #fff;
}
.hero-rating .stars { color: var(--accent, #b8893d); letter-spacing: 0.04em; font-size: 0.95rem; }
.hero-rating .meta { color: rgba(255,255,255,0.75); font-weight: 500; }
.hero-rating .meta strong { color: #fff; font-weight: 600; }

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
.vf-socials a:hover { background: var(--accent, #b8893d); color: var(--ink, #1f1a14); transform: translateY(-2px); }
.vf-socials svg { width: 18px; height: 18px; }

.board-section { padding: clamp(5rem, 9vw, 8rem) 1.5rem; }
.board-grid {
  max-width: 1200px; margin: 4rem auto 0;
  display: grid; gap: 2.5rem;
  grid-template-columns: repeat(auto-fit, minmax(min(200px, 100%), 1fr));
}
.board-card { text-align: center; }
.board-monogram {
  width: clamp(80px, 12vw, 120px); height: clamp(80px, 12vw, 120px);
  margin: 0 auto 1.5rem;
  border-radius: 50%;
  background: color-mix(in oklch, var(--primary, #2d4a32) 18%, white);
  color: var(--primary, #2d4a32);
  display: grid; place-items: center;
  font-family: var(--display, Georgia, serif); font-weight: 600;
  font-size: clamp(1.8rem, 3vw, 2.4rem);
  letter-spacing: 0.04em;
  border: 2px solid var(--primary, #2d4a32);
}
.board-card h4 {
  font-family: var(--display, Georgia, serif); font-weight: 500;
  font-size: 1.2rem; margin-bottom: 0.3rem;
}
.board-card .role {
  font-family: var(--display, Georgia, serif); font-size: 0.78rem;
  letter-spacing: 0.16em; text-transform: uppercase;
  color: var(--accent, #b8893d); font-weight: 600;
}

/* All event-row rules are scoped to .events-extracted-list so they don't
   collide with verein-sport's / verein-tradition's existing dark "Spielplan"
   rows that use the same class name on a dark surface. */
.events-extracted-list {
  max-width: 1000px; margin: 4rem auto 0;
  display: flex; flex-direction: column; gap: 1rem;
}
.events-extracted-list .event-row {
  display: grid; gap: 1.5rem; align-items: center;
  grid-template-columns: 1fr;
  padding: 1.5rem 1.75rem;
  background: var(--surface, #fff);
  border: 1px solid var(--rule, rgba(0,0,0,0.08));
  border-left: 3px solid var(--accent, #b8893d);
  border-radius: 6px;
  transition: transform .2s, box-shadow .2s;
}
@media (min-width: 720px) {
  .events-extracted-list .event-row { grid-template-columns: 110px 1fr; }
}
.events-extracted-list .event-row:hover { transform: translateY(-2px); box-shadow: 0 12px 32px -18px rgba(0,0,0,0.18); }
.events-extracted-list .event-row .when {
  font-family: var(--display, Georgia, serif); font-weight: 600;
  font-size: clamp(1.1rem, 2vw, 1.4rem);
  color: var(--primary, #2d4a32); line-height: 1.1;
  letter-spacing: -0.01em;
}
.events-extracted-list .event-row .what {
  font-family: var(--serif, Georgia, serif); font-size: 1rem;
  line-height: 1.5; color: var(--ink-2, #4a4030);
}

/* ─── Quiet Footer (premium XXL-wordmark pattern) ─────────────────────── */
.quiet-footer {
  background: linear-gradient(180deg, var(--primary-deep, #1c2f1f) 0%, #0c1410 100%);
  color: rgba(255,255,255,0.75);
  padding: clamp(4rem, 8vw, 7rem) 1.5rem clamp(2rem, 3vw, 3rem);
  border-top: 4px solid var(--accent, #b8893d);
}
.quiet-footer-inner {
  max-width: 1400px; margin: 0 auto;
}
.quiet-wordmark {
  font-family: var(--display, Georgia, serif); font-weight: 500;
  font-size: clamp(3rem, 14vw, 12rem);
  line-height: 0.92; letter-spacing: -0.045em;
  color: #fff; word-break: break-word;
  margin: 0 0 1rem;
}
.quiet-wordmark .qf-dot { color: var(--accent, #b8893d); }
.quiet-tagline {
  font-family: var(--serif, Georgia, serif); font-style: italic;
  font-size: clamp(1.05rem, 1.6vw, 1.35rem); line-height: 1.5;
  max-width: 48ch; color: rgba(255,255,255,0.65);
  margin: 0 0 2.5rem;
}
.quiet-cta-row { margin: 0 0 3rem; }
.quiet-cta {
  display: inline-flex; align-items: center; gap: 0.85rem;
  font-family: var(--display, Georgia, serif); font-weight: 600;
  font-size: clamp(1.15rem, 2vw, 1.6rem); letter-spacing: -0.005em;
  color: #fff; padding: 0.85rem 0 0.85rem 0;
  border-bottom: 2px solid var(--accent, #b8893d);
  transition: gap .25s ease, color .2s ease;
}
.quiet-cta:hover { gap: 1.4rem; color: var(--accent, #b8893d); }
.quiet-bottom {
  display: flex; justify-content: space-between; align-items: flex-end;
  flex-wrap: wrap; gap: 1.5rem;
  padding-top: 2rem; margin-top: 2rem;
  border-top: 1px solid rgba(255,255,255,0.08);
  font-size: 0.86rem; color: rgba(255,255,255,0.45);
}
.quiet-legal { display: flex; gap: 1.25rem; flex-wrap: wrap; align-items: center; }
.quiet-legal a {
  color: rgba(255,255,255,0.65); border-bottom: 1px solid rgba(255,255,255,0.18);
  transition: color .2s, border-color .2s;
}
.quiet-legal a:hover { color: var(--accent, #b8893d); border-color: var(--accent, #b8893d); }
.quiet-legal span { color: rgba(255,255,255,0.3); }
.quiet-credit a { color: rgba(255,255,255,0.55); border-bottom: 1px solid rgba(255,255,255,0.16); }
.quiet-credit a:hover { color: var(--accent, #b8893d); border-color: var(--accent, #b8893d); }

/* Trust-bar */
.trust-bar {
  background: var(--bg, #fff); padding: clamp(3rem, 5vw, 4.5rem) 1.5rem;
  border-top: 1px solid var(--rule, rgba(0,0,0,0.08));
  border-bottom: 1px solid var(--rule, rgba(0,0,0,0.08));
}
.trust-bar-inner {
  max-width: 1300px; margin: 0 auto;
  display: grid; gap: 2rem;
  grid-template-columns: repeat(auto-fit, minmax(min(180px, 100%), 1fr));
}
.trust-stat {
  text-align: center; padding: 0 1rem;
}
.trust-stat .trust-value {
  font-family: var(--display, Georgia, serif); font-weight: 500;
  font-size: clamp(2.2rem, 4.5vw, 3.6rem); line-height: 0.95;
  letter-spacing: -0.02em; color: var(--primary, #1a1a1a);
}
.trust-stat .trust-label {
  font-family: var(--display, Georgia, serif); font-weight: 600;
  font-size: 0.78rem; letter-spacing: 0.16em; text-transform: uppercase;
  color: var(--ink-3, var(--ink-2, #4a4030));
  margin-top: 0.75rem;
}

/* Newsletter CTA */
.newsletter-cta {
  background: color-mix(in oklch, var(--primary, #1a1a1a) 6%, white);
  padding: clamp(4rem, 8vw, 7rem) 1.5rem;
  border-top: 1px solid var(--rule, rgba(0,0,0,0.08));
}
.newsletter-inner { max-width: 760px; margin: 0 auto; text-align: center; }
.newsletter-inner .nl-kicker {
  display: inline-block; font-family: var(--display, Georgia, serif);
  font-size: 0.82rem; letter-spacing: 0.22em; text-transform: uppercase;
  color: var(--accent, #b8893d); font-weight: 600;
  padding-bottom: 1rem; margin-bottom: 0.5rem;
}
.newsletter-inner .nl-headline {
  font-family: var(--display, Georgia, serif); font-weight: 500;
  font-size: clamp(2rem, 5vw, 3.5rem); line-height: 1.1;
  letter-spacing: -0.02em; color: var(--ink, #1f1a14);
  max-width: 22ch; margin: 0 auto 1.25rem;
}
.newsletter-inner .nl-body {
  font-family: var(--serif, Georgia, serif); color: var(--ink-2, #4a4030);
  font-size: 1.05rem; line-height: 1.7; max-width: 48ch; margin: 0 auto 2.5rem;
}
.newsletter-cta .nl-form {
  display: flex; gap: 0.75rem; max-width: 480px; margin: 0 auto;
  flex-wrap: wrap; justify-content: center;
}
.nl-input {
  flex: 1 1 240px; min-width: 0; padding: 1rem 1.25rem;
  font-family: var(--serif, Georgia, serif); font-size: 1rem;
  background: #fff; color: var(--ink, #1f1a14);
  border: 1px solid var(--rule, rgba(0,0,0,0.18)); border-radius: 4px;
  transition: border-color .2s;
}
.nl-input:focus { outline: none; border-color: var(--accent, #b8893d); }
.nl-button {
  padding: 1rem 2rem; cursor: pointer;
  font-family: var(--display, Georgia, serif); font-weight: 600;
  font-size: 0.95rem; letter-spacing: 0.03em;
  background: var(--primary, #1a1a1a); color: #fff; border: 0; border-radius: 4px;
  transition: background .2s, transform .2s;
}
.nl-button:hover { background: var(--primary-deep, #000); transform: translateY(-2px); }

/* Heritage-Statement (Algunder/Speckbacher pattern). Tall block right
   after hero. Big italic-year as the rooted anchor. */
.heritage-statement {
  padding: clamp(5rem, 10vw, 8rem) 1.5rem;
  text-align: center;
  background: var(--bg, #fff);
}
.heritage-inner { max-width: 1100px; margin: 0 auto; }
.heritage-kicker {
  display: inline-block; font-family: var(--display, Georgia, serif);
  font-size: 0.82rem; letter-spacing: 0.22em; text-transform: uppercase;
  color: var(--accent, #b8893d); font-weight: 600;
  margin-bottom: 1.5rem;
  padding: 0.4rem 1rem; border: 1px solid var(--accent, #b8893d);
  border-radius: 999px;
}
.heritage-headline {
  font-family: var(--display, Georgia, serif); font-weight: 500;
  font-size: clamp(2.5rem, 7vw, 6rem); line-height: 1.05;
  letter-spacing: -0.025em; color: var(--ink, #1a1a1a);
  max-width: 22ch; margin: 0 auto;
}
.heritage-headline em { font-style: italic; color: var(--primary, #2d4a32); font-weight: 500; }

/* Heritage-Timeline (horizontal chronik with 3-4 nodes) — Bruckmühl pattern */
.heritage-timeline {
  padding: clamp(5rem, 9vw, 7rem) 1.5rem;
  background: color-mix(in oklch, var(--primary, #2d4a32) 6%, white);
}
.heritage-timeline .container { max-width: 1200px; margin: 0 auto; }
.heritage-timeline .ht-track {
  list-style: none; padding: 0; margin: 4rem 0 0;
  display: grid; gap: 2.5rem;
  grid-template-columns: 1fr;
  position: relative;
}
@media (min-width: 760px) {
  .heritage-timeline .ht-track {
    grid-auto-flow: column; grid-auto-columns: 1fr;
    gap: 0; padding-top: 3rem;
  }
  .heritage-timeline .ht-track::before {
    content: ''; position: absolute; top: 1.5rem; left: 5%; right: 5%;
    height: 1px; background: var(--accent, #b8893d); opacity: 0.4;
  }
}
.ht-node {
  position: relative; text-align: center; padding: 0 0.5rem;
}
@media (min-width: 760px) {
  .ht-node::before {
    content: ''; position: absolute; top: -1.55rem; left: 50%; transform: translateX(-50%);
    width: 14px; height: 14px; border-radius: 50%;
    background: var(--accent, #b8893d);
    border: 3px solid color-mix(in oklch, var(--primary, #2d4a32) 6%, white);
  }
}
.ht-year {
  font-family: var(--display, Georgia, serif); font-weight: 500;
  font-size: clamp(2.4rem, 5vw, 4rem); line-height: 0.95;
  letter-spacing: -0.02em; color: var(--primary, #2d4a32);
  margin-bottom: 1rem;
}
.ht-label {
  font-family: var(--serif, Georgia, serif); font-size: 0.96rem;
  color: var(--ink-2, #4a4030); line-height: 1.6;
}

/* Ensemble-Grid — sub-bands as 3-4 brand tiles (Brixen/Eppingen pattern) */
.ensemble-grid-section {
  padding: clamp(5rem, 9vw, 8rem) 1.5rem;
  background: var(--bg, #fff);
}
.ensemble-grid-section .container { max-width: 1300px; margin: 0 auto; }
.ensemble-grid {
  display: grid; gap: 1.5rem; margin-top: 3rem;
  grid-template-columns: 1fr;
}
@media (min-width: 720px) { .ensemble-grid { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 1000px) { .ensemble-grid { grid-template-columns: repeat(3, 1fr); } }
.ensemble-card {
  position: relative;
  background: var(--surface, #fff);
  border: 1px solid var(--rule, rgba(0,0,0,0.08));
  border-top: 3px solid var(--accent, #b8893d);
  padding: 2.5rem 2rem;
  transition: transform .25s ease, box-shadow .25s ease;
  overflow: hidden;
}
.ensemble-card:hover { transform: translateY(-4px); box-shadow: 0 18px 36px -16px rgba(0,0,0,0.12); }
.ensemble-card .ensemble-icon {
  position: absolute; top: 1.5rem; right: 1.5rem;
  width: 56px; height: 56px;
  color: color-mix(in oklch, var(--accent, #b8893d) 35%, transparent);
  opacity: 0.85;
  transition: transform .4s cubic-bezier(0.34, 1.56, 0.64, 1), color .25s;
}
.ensemble-card:hover .ensemble-icon {
  transform: rotate(-8deg) scale(1.1);
  color: color-mix(in oklch, var(--accent, #b8893d) 65%, transparent);
}
.ensemble-card .ensemble-icon svg { width: 100%; height: 100%; }
.ensemble-card .ensemble-num {
  font-family: var(--display, Georgia, serif); font-size: 0.78rem;
  letter-spacing: 0.22em; text-transform: uppercase;
  color: var(--accent, #b8893d); font-weight: 600;
  margin-bottom: 1.25rem;
}
.ensemble-card h3 {
  font-family: var(--display, Georgia, serif); font-weight: 500;
  font-size: clamp(1.4rem, 2.5vw, 1.85rem); line-height: 1.15;
  color: var(--ink, #1a1a1a); margin-bottom: 0.9rem;
}
.ensemble-card p {
  font-family: var(--serif, Georgia, serif); font-size: 0.98rem;
  line-height: 1.7; color: var(--ink-2, #4a4030);
}

/* Künstlerische-Leitung-Card — single tall card before Vorstand-grid */
.leitung-section {
  padding: clamp(5rem, 9vw, 8rem) 1.5rem;
  background: color-mix(in oklch, var(--primary, #2d4a32) 4%, white);
}
.leitung-section .container { max-width: 1200px; margin: 0 auto; }
.leitung-inner {
  display: grid; gap: 3rem;
  grid-template-columns: 1fr; align-items: center;
}
@media (min-width: 760px) { .leitung-inner { grid-template-columns: 240px 1fr; gap: 4rem; } }
.leitung-portrait {
  width: clamp(180px, 28vw, 240px); height: clamp(180px, 28vw, 240px);
  margin: 0 auto;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary, #2d4a32) 0%, var(--primary-deep, #1c2f1f) 100%);
  display: grid; place-items: center;
  font-family: var(--display, Georgia, serif); font-weight: 500;
  font-size: clamp(3.5rem, 6vw, 5rem); color: var(--accent, #b8893d);
  letter-spacing: 0.04em;
  border: 4px solid var(--accent, #b8893d);
  box-shadow: 0 24px 60px -24px rgba(0,0,0,0.4);
}
.leitung-body .leitung-name {
  margin-top: 0.4rem; margin-bottom: 0.5rem;
}
.leitung-body .leitung-role {
  font-family: var(--display, Georgia, serif); font-size: 0.86rem;
  letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--accent, #b8893d); font-weight: 600;
  margin-bottom: 1.5rem;
}
.leitung-body .leitung-blurb {
  font-family: var(--serif, Georgia, serif); font-size: 1.1rem;
  line-height: 1.75; color: var(--ink-2, #4a4030);
  max-width: 56ch;
}
`;
