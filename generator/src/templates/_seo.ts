/**
 * Shared SEO/AEO head builder for branch templates.
 *
 * Every demo gets:
 * - Canonical title (capped at 60 chars to fit Google + Bing snippets)
 * - Meta description (capped at 160)
 * - OpenGraph + Twitter card tags (so messenger previews render — currently
 *   blank when prospects share the demo link in WhatsApp/Slack)
 * - Branch-specific Schema.org JSON-LD (so prospects opening DevTools see
 *   what real structured-data SEO looks like — even on noindex pages)
 * - `<link rel="icon">` + Apple touch icon when a favicon was scraped
 * - `noindex,nofollow` (demos are unconfirmed redesigns)
 *
 * Why this lives in its own helper: per the SEO audit, every branch template
 * was duplicating its <head> block and most were missing OG/Twitter and
 * JSON-LD entirely. Centralising means any future hardening (e.g. og:image,
 * canonical, hreflang) lands across all templates at once.
 */
import type { SiteSpec } from '../types.js';
import { getFavicon } from './_media.js';

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/**
 * JSON.stringify alone leaves `</script>` and U+2028/U+2029 intact, which
 * lets a string field inside a scraped-data spec break out of the inline
 * <script type="application/ld+json"> block. Always run JSON-LD payloads
 * through this before injecting into HTML.
 */
function safeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export type SchemaKind =
  | 'MusicGroup'
  | 'SportsClub'
  | 'Restaurant'
  | 'MedicalBusiness'
  | 'GolfCourse'
  | 'BeautySalon'
  | 'AutomotiveBusiness'
  | 'LegalService'
  | 'LodgingBusiness'
  | 'HealthAndBeautyBusiness'
  | 'Store'
  | 'ProfessionalService'
  | 'FuneralHome'
  | 'VeterinaryCare'
  | 'LocalBusiness';

export interface SeoOptions {
  slug: string;
  schemaKind?: SchemaKind;
  /** Optional explicit OG image URL. If omitted, we fall back to the scraped hero. */
  ogImage?: string;
}

export function renderSeoHead(spec: SiteSpec, opts: SeoOptions): string {
  const businessName = spec.business_name?.trim() || 'Demo';
  const tagline = spec.tagline?.trim() || '';
  const description = (spec.hero?.subheadline || tagline).trim();
  const fullTitle = tagline ? `${businessName} — ${tagline}` : businessName;
  const title = fullTitle.length > 60 ? fullTitle.slice(0, 59).replace(/\s+\S*$/, '') + '…' : fullTitle;
  const desc = description.length > 160 ? description.slice(0, 159).replace(/\s+\S*$/, '') + '…' : description;
  const themeColor = spec.brand?.primary_color && /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(spec.brand.primary_color)
    ? spec.brand.primary_color
    : '#0f172a';
  const canonical = `https://${opts.slug}.webseiten-werkstatt.at/`;
  const ogImage = opts.ogImage || spec.media?.hero_image || '';
  const fav = getFavicon(spec);

  const out: string[] = [];
  out.push(`<meta charset="UTF-8" />`);
  out.push(`<meta name="viewport" content="width=device-width, initial-scale=1.0" />`);
  // Demos are unconfirmed redesigns — never index.
  out.push(`<meta name="robots" content="noindex, nofollow" />`);
  out.push(`<meta name="theme-color" content="${escapeHtml(themeColor)}" />`);
  out.push(`<title>${escapeHtml(title)}</title>`);
  out.push(`<meta name="description" content="${escapeHtml(desc)}" />`);
  out.push(`<link rel="canonical" href="${escapeHtml(canonical)}" />`);
  // OG/Twitter for messenger previews
  out.push(`<meta property="og:type" content="website" />`);
  out.push(`<meta property="og:locale" content="de_AT" />`);
  out.push(`<meta property="og:title" content="${escapeHtml(title)}" />`);
  out.push(`<meta property="og:description" content="${escapeHtml(desc)}" />`);
  out.push(`<meta property="og:url" content="${escapeHtml(canonical)}" />`);
  if (ogImage) {
    out.push(`<meta property="og:image" content="${escapeHtml(ogImage)}" />`);
    out.push(`<meta name="twitter:card" content="summary_large_image" />`);
    out.push(`<meta name="twitter:image" content="${escapeHtml(ogImage)}" />`);
  } else {
    out.push(`<meta name="twitter:card" content="summary" />`);
  }
  out.push(`<meta name="twitter:title" content="${escapeHtml(title)}" />`);
  out.push(`<meta name="twitter:description" content="${escapeHtml(desc)}" />`);
  if (fav) {
    out.push(`<link rel="icon" href="${escapeHtml(fav)}" />`);
    out.push(`<link rel="apple-touch-icon" href="${escapeHtml(fav)}" />`);
  }
  if (opts.schemaKind) {
    out.push(renderJsonLd(spec, opts.schemaKind, canonical));
  }
  return out.join('\n  ');
}

function renderJsonLd(spec: SiteSpec, kind: SchemaKind, url: string): string {
  const phone = spec.contact?.phone || undefined;
  const email = spec.contact?.email || undefined;
  const address = spec.contact?.address || undefined;
  const hero = spec.media?.hero_image;

  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': kind,
    name: spec.business_name,
    description: spec.hero?.subheadline || spec.tagline,
    url,
  };
  if (phone) data.telephone = phone;
  if (email) data.email = email;
  if (hero) data.image = hero;
  if (address) {
    data.address = {
      '@type': 'PostalAddress',
      streetAddress: address,
    };
  }

  // PR-A9: MusicGroup-Erweiterung für Rich-Results.
  // Google Knowledge Panel rendert member, foundingDate, genre, subOrganization
  // wenn deklariert. Nur für MusicGroup-Templates (verein-musik).
  if (kind === 'MusicGroup') {
    // foundingDate aus spec.team-Daten kann erhärten — wir verlassen uns auf
    // den year-extractor wenn vorhanden (spec.foundedYear gibt's nicht im
    // Schema, also durch spec.about Heuristik). Optional via spec.team[].role
    // === 'Kapellmeister' als Person.
    const team = (spec as any).team as Array<{ name: string; role: string }> | undefined;
    if (team && team.length > 0) {
      // Kapellmeister / Direktor / Conductor → musicalDirector
      const conductor = team.find(m => /^(Kapellmeister|Dirigent|Musikalische?\s+Leitung|Chorleiter|Stabführer)/i.test(m.role));
      if (conductor && !/Stellvertreter|Stv\.?/.test(conductor.role)) {
        data.musicalDirector = { '@type': 'Person', name: conductor.name };
      }
      // Vorstand → member-Liste (max 10, sonst spammt es das Schema)
      data.member = team.slice(0, 10).map(m => ({
        '@type': 'OrganizationRole',
        roleName: m.role,
        member: { '@type': 'Person', name: m.name },
      }));
    }
    // Genre: Blasmusik default für Musikverein/Musikkapelle
    if (/Musikverein|Musikkapelle|Stadtmusik|Bürgerkapelle|Marktmusik|Werkskapelle|TMK|MV\b/i.test(spec.business_name)) {
      data.genre = ['Blasmusik', 'Volksmusik'];
    }
    // FoundingDate via direkter spec-Feld wenn vorhanden (orchestrator
    // könnte es später ableiten)
    const foundingDate = (spec as any).founding_year || (spec as any).founded_year;
    if (foundingDate && Number.isFinite(Number(foundingDate))) {
      data.foundingDate = String(foundingDate);
    }
    // Number of members
    const memberCount = (spec as any).member_count;
    if (memberCount && Number.isFinite(Number(memberCount))) {
      data.numberOfEmployees = { '@type': 'QuantitativeValue', value: Number(memberCount) };
    }
  }

  return `<script type="application/ld+json">${safeJsonLd(data)}</script>`;
}
