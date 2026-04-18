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
    contact?: Record<string, string>;
    services?: string[];
    socials?: Record<string, string>;
    text?: string;
  };
  logo_url?: string;
  brand_colors?: string[];
  screenshots?: Array<{ name: string; path: string; slot: string }>;
  generation_params?: {
    niche?: string;
    tone?: string;
    weaknesses?: string[];
    headline?: string;
    value_prop?: string;
  };
}

export interface SiteSpec {
  business_name: string;
  tagline: string;
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
}

export interface GenerateRequest {
  prototype_version_id: number;
  rebuild_package: RebuildPackage;
  webhook_url: string;
}

export interface BuildRequest {
  prototype_version_id: number;
  astro_project_path: string;
  webhook_url: string;
}
