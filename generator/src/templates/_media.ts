/**
 * Image helpers for templates.
 *
 * Goal: prefer real, scraped images from the prospect's existing site
 * (provided in spec.media by the orchestrator) over generic picsum
 * placeholders. Templates call getHeroImage/getGalleryImage and never
 * touch picsum directly.
 *
 * Security: scraped URLs are attacker-influenced (any prospect site can
 * craft an `<img src=…>` value that survives DomCrawler). All exits from
 * this module pass through `safeUrl()` which enforces a strict
 * `https?://` or absolute-path scheme allowlist and percent-encodes the
 * characters that would otherwise break out of an HTML attribute or
 * CSS `url(...)` context — closing both XSS and CSS-injection sinks
 * for every template at once.
 */

import type { SiteSpec } from '../types.js';

const SAFE_URL_SHAPE = /^(https?:\/\/|\/)[^\s"'<>`]*$/i;

function safeUrl(raw: string | undefined, fallback: string): string {
  if (!raw || typeof raw !== 'string') return fallback;
  if (raw.length > 2048) return fallback;
  if (!SAFE_URL_SHAPE.test(raw)) return fallback;
  return raw
    .replace(/"/g, '%22')
    .replace(/'/g, '%27')
    .replace(/</g, '%3C')
    .replace(/>/g, '%3E')
    .replace(/\\/g, '%5C')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29');
}

/**
 * Returns a real scraped hero image URL, or an empty string if none exists.
 * Templates MUST check the return value and switch to a CSS-only hero when
 * empty — never substitute a stock photo. Showing a generic stock image on
 * a Musikverein page is worse than showing none at all.
 */
export function getHeroImage(spec: SiteSpec, _slug: string, _w = 1600, _h = 900): string {
  return safeUrl(spec.media?.hero_image, '');
}

/**
 * Returns a real scraped gallery image at the given slot, or empty string
 * if no real image exists. Templates MUST gate gallery rendering on
 * `hasGalleryImages()` and not iterate beyond `galleryCount()`.
 */
export function getGalleryImage(
  spec: SiteSpec,
  _slug: string,
  idx: number,
  _w = 800,
  _h = 600,
): string {
  const gallery = spec.media?.gallery ?? [];
  if (gallery.length === 0) return '';
  // Hard cap: never repeat. If idx >= gallery.length, return empty.
  if (idx >= gallery.length) return '';
  return safeUrl(gallery[idx] as string, '');
}

export function hasHeroImage(spec: SiteSpec): boolean {
  return Boolean(spec.media?.hero_image && safeUrl(spec.media.hero_image, ''));
}

export function hasGalleryImages(spec: SiteSpec): boolean {
  return (spec.media?.gallery?.length ?? 0) > 0;
}

export function galleryCount(spec: SiteSpec): number {
  return spec.media?.gallery?.length ?? 0;
}

export function hasRealMedia(spec: SiteSpec): boolean {
  return hasHeroImage(spec) || hasGalleryImages(spec);
}

export function getLogo(spec: SiteSpec): string | undefined {
  if (!spec.media?.logo) return undefined;
  const sanitized = safeUrl(spec.media.logo, '');
  return sanitized || undefined;
}

/**
 * Same allowlist treatment as logo. Templates must use this helper rather
 * than reading spec.media.favicon directly — escapeHtml does not enforce
 * scheme, and a scraped `javascript:` or `data:image/svg+xml,<svg onload=...>`
 * URL would otherwise survive into `<link rel="icon">`.
 */
export function getFavicon(spec: SiteSpec): string | undefined {
  if (!spec.media?.favicon) return undefined;
  const sanitized = safeUrl(spec.media.favicon, '');
  return sanitized || undefined;
}
