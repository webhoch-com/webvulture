export type LayoutKind =
  | 'standard'
  | 'restaurant'
  | 'friseur'
  | 'handwerk'
  | 'bauunternehmen'
  | 'arzt'
  | 'verein'
  | 'verein_musik'
  | 'verein_sport'
  | 'verein_tradition'
  | 'golfclub'
  | 'kanzlei'
  | 'hotel'
  | 'fitness'
  | 'einzelhandel'
  | 'galerie'
  | 'autohaus'
  | 'energie'
  | 'bestattung'
  | 'tier';

export interface RebuildPackage {
  business: {
    name: string;
    category: string;
    city: string;
    address?: string;
    phone?: string;
    website?: string;
    rating?: number;
    review_count?: number;
  };
  extracted: {
    title?: string;
    meta?: string;
    meta_description?: string;
    contact?: Record<string, string>;
    services?: string[];
    socials?: Record<string, string>;
    nav_links?: Array<{ label: string; href: string }>;
    text?: string;
    text_content?: string;
    images?: Array<{ src: string; alt?: string; original_src?: string }>;
    /**
     * Real H1/H2/H3 sections from the prospect's existing site, in source
     * order. Templates render these as a *redesign* of the original page so
     * the prospect immediately recognises their own structure rather than
     * a generic stencil.
     */
    sections?: Array<{ title: string; level: number; body: string }>;
  };
  logo_url?: string;
  favicon_url?: string;
  brand_colors?: string[];
  /**
   * Structured brand block populated by the PHP RebuildPackageBuilder when
   * the website-analysis pipeline has detected real CSS variables, fonts and
   * a downloaded logo asset. Generator templates SHOULD prefer these values
   * over their hardcoded theme defaults so each preview reflects the
   * prospect's actual brand instead of looking template-identical.
   */
  brand?: {
    logo_url?: string;
    logo_public_url?: string;
    primary_color?: string | null;
    secondary_color?: string | null;
    accent_color?: string | null;
    /** Dominant non-neutral hex colour extracted from the scraped logo pixels.
     *  Templates can prefer this over scraped CSS-accent to look "branded to
     *  the company" even when the surrounding website uses a generic accent. */
    logo_color?: string | null;
    heading_font_family?: string | null;
    body_font_family?: string | null;
    /** Raw `<link>`/`@import` URLs to load the original fonts at render time. */
    font_imports?: string[];
  };
  screenshots?: Array<{ name: string; path: string; slot: string }>;
  /**
   * Downloaded assets bucket. Befüllt vom PHP-RebuildPackageBuilder mit den
   * vom AssetDownloader gemirrorten Bildern (hero, gallery, content).
   * Andere Schema-Form als `extracted.images` — public_url statt src,
   * src_original statt original_src — Generator-pickMedia merged beide.
   */
  images?: {
    hero?: Array<{ public_url?: string; src_original?: string; alt?: string; width?: number; height?: number }>;
    gallery?: Array<{ public_url?: string; src_original?: string; alt?: string; width?: number; height?: number }>;
    /** PR-A8: board-member portraits (role='team'), relaxed-filter download. */
    team?: Array<{ public_url?: string; src_original?: string; alt?: string; width?: number; height?: number }>;
    all_local?: unknown[];
    screenshots?: Array<{ name: string; path: string; slot: string }>;
  };
  generation_params?: {
    niche?: string;
    tone?: string;
    weaknesses?: string[];
    headline?: string;
    value_prop?: string;
    /**
     * User-Feedback aus einer Revision-Anfrage. orchestrator.ts wendet
     * Schlüsselwort-Regeln auf das resultierende SiteSpec an
     * ("ohne gallery" → media.gallery=[], "kein vorstand" → hide_vorstand=true).
     */
    user_revision_notes?: string;
  };
  layout_kind?: LayoutKind;
}

export interface SiteSpec {
  business_name: string;
  tagline: string;
  layout_kind?: LayoutKind;
  /**
   * Trust signals harvested from Google Maps / enrichment that templates can
   * surface as social-proof pills (rating stars + review count) in the hero or
   * near the CTA. Omitted when rating is < 4.0 or fewer than 5 reviews — we
   * don't want to display "weak" signals that hurt rather than help.
   */
  business?: {
    rating?: number;
    review_count?: number;
    /** City / Standort, carried through from the lead so templates can render
     *  "in {city}" copy even when no scraped address is available. */
    city?: string;
  };
  hero: {
    headline: string;
    subheadline: string;
    cta_text: string;
  };
  about: {
    body: string;
  };
  services: Array<{
    name: string;
    description: string;
    icon?: string;
    price?: string;
  }>;
  testimonials?: Array<{
    quote: string;
    author: string;
  }>;
  contact: {
    phone?: string;
    email?: string;
    address?: string;
    cta_text: string;
  };
  /** Top-level social handles. Footers render as icon-strip; nav optionally uses them. */
  socials?: Record<string, string>;
  footer: {
    tagline: string;
    links?: Array<{ label: string; href: string }>;
  };
  brand: {
    primary_color: string;
    /**
     * Real-page brand additions. When present, templates SHOULD use them as
     * CSS custom properties so the rendered page mirrors the prospect's
     * actual visual identity instead of the template's hardcoded theme.
     * Falls back to template defaults when null/undefined.
     */
    secondary_color?: string;
    accent_color?: string;
    /** Dominant non-neutral colour extracted from the scraped logo pixels — a
     *  per-demo brand anchor that templates can prefer over CSS-scraped accent
     *  to look more strongly branded to the company. */
    logo_color?: string;
    /** Heading typeface name as detected from `<style>`/`@font-face`. */
    heading_font_family?: string;
    /** Body typeface name. */
    body_font_family?: string;
    /** Raw `<link rel="stylesheet">`/`@import` URLs for the above fonts. */
    font_imports?: string[];
    font_style: 'modern' | 'classic' | 'friendly' | 'bold';
    tone: string;
  };

  /**
   * Real-content media pulled from the prospect's existing website.
   * Templates SHOULD use these where present and fall back to picsum
   * placeholders only when nothing was scraped.
   */
  media?: {
    logo?: string;
    favicon?: string;
    hero_image?: string;
    gallery?: string[];
    /**
     * Internal screenshot URLs of the prospect's actual homepage (desktop,
     * mobile, above-the-fold). Templates may use these as a Gallery-fallback
     * or in a "before / after" comparison block when no real photos exist.
     */
    screenshots?: Array<{ name: string; path: string; slot: string }>;
  };

  /**
   * Premium re-rendering of the prospect's actual site sections.
   * Populated deterministically by the orchestrator from `extracted.sections`.
   * Templates iterate this list and render each entry in editorial typography
   * — same content, completely new design.
   */
  redesigned_sections?: Array<{ title: string; body: string; level: number }>;

  /**
   * Untruncated excerpt (≤6000 chars) of the prospect's scraped text content.
   * Powers regex-based extractors (board members, dated events, founding year)
   * that need MORE than the 3-sentence summary that flows into about.body.
   * Templates SHOULD NOT render this directly — it's an extractor-only source.
   */
  raw_text_excerpt?: string;

  // Branch-specific optional sections (rendered only if layout_kind matches)
  menu?: Array<{ category: string; items: Array<{ name: string; description?: string; price?: string }> }>;
  opening_hours?: Array<{ day: string; hours: string }>;
  emergency?: { available: boolean; phone?: string; note?: string };
  events?: Array<{ date: string; title: string; description?: string }>;
  membership?: { cta: string; description: string };
  /**
   * Vorstand / Team-Mitglieder extrahiert aus der gescrapten Site
   * (typischerweise Kontakt-Subpage). Templates rendern als Personen-
   * Karten — wenn Photo-URL fehlt, mit Initialen-Placeholder.
   */
  team?: Array<{ role: string; name: string; photo?: string }>;
}

export interface GenerateRequest {
  prototype_version_id: number;
  slug: string;
  rebuild_package: RebuildPackage;
  webhook_url: string;
}

export interface BuildRequest {
  prototype_version_id: number;
  slug: string;
  astro_project_path: string;
  webhook_url: string;
}
