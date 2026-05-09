export type LayoutKind =
  | 'standard'
  | 'restaurant'
  | 'friseur'
  | 'handwerk'
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
  screenshots?: Array<{ name: string; path: string; slot: string }>;
  generation_params?: {
    niche?: string;
    tone?: string;
    weaknesses?: string[];
    headline?: string;
    value_prop?: string;
  };
  layout_kind?: LayoutKind;
}

export interface SiteSpec {
  business_name: string;
  tagline: string;
  layout_kind?: LayoutKind;
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
  footer: {
    tagline: string;
    links?: Array<{ label: string; href: string }>;
  };
  brand: {
    primary_color: string;
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
  };

  /**
   * Premium re-rendering of the prospect's actual site sections.
   * Populated deterministically by the orchestrator from `extracted.sections`.
   * Templates iterate this list and render each entry in editorial typography
   * — same content, completely new design.
   */
  redesigned_sections?: Array<{ title: string; body: string; level: number }>;

  // Branch-specific optional sections (rendered only if layout_kind matches)
  menu?: Array<{ category: string; items: Array<{ name: string; description?: string; price?: string }> }>;
  opening_hours?: Array<{ day: string; hours: string }>;
  emergency?: { available: boolean; phone?: string; note?: string };
  events?: Array<{ date: string; title: string; description?: string }>;
  membership?: { cta: string; description: string };
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
