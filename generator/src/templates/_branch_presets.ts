/**
 * Per-branch design tokens distilled from the 2026-05-25 reference research
 * across 25+ award-tier websites (Noma, EMP, Aman, 25hours, Parsley Health,
 * One Medical, Latham&Watkins, Modern Animal, Bond Vet, Vitsoe, USM, Boffi,
 * HAY, Fekkai, Buck Mason, Equinox, Barry's, SoulCycle, Polestar, Porsche
 * etc.). Each preset is a starting point for the template's hardcoded
 * defaults — real scraped values from `spec.brand` always win and override
 * these (template wiring uses `spec.brand?.primary_color || PRESET.primary`).
 *
 * Design philosophy (universal across all 25+ references):
 *   - Off-white BG (not pure white) for premium pages
 *   - One accent color, never three
 *   - Display headline 56-96px, body 15-16px line-height 1.55-1.6
 *   - Quiet text-link CTAs + ONE loud booking/sign-up button
 *   - Section BG-toggle cream ↔ off-white ↔ optional dark
 *   - Newsletter as penultimate section, multi-column footer
 *
 * Per-branch overrides specify what makes that vertical distinctive
 * (cuisine: cream+burgundy+humanist-sans; legal: serif-headlines;
 * automotive: brand-accent only in detail-shots; fitness: black+single-pop).
 *
 * NOT in scope: this module deliberately does not emit CSS — it just
 * exposes data. Templates wire it via const PRESET = BRANCH_PRESETS[kind].
 */

import type { LayoutKind } from '../types.js';

export interface BranchPreset {
  /** Page background — off-white tone matching the branch's emotional register. */
  bg: string;
  /** Body text colour, defensible on every BG-tone the template uses. */
  ink: string;
  /** Single accent. Used for hover-states, accent rules, badge BGs. */
  accent: string;
  /** Default primary brand colour when the scrape produced none. */
  primary: string;
  /** Default secondary colour (often = primary so templates degrade safely). */
  secondary: string;
  /** CSS font-family stack for headings — Google-Fonts loaded by template. */
  display_font: string;
  /** Body font-family stack. */
  body_font: string;
  /** Loaded as `<link>` in `<head>` when no scraped font_imports survive. */
  font_imports: string[];
  /**
   * Primary CTA text — the branch-specific verb pair. Restaurant says
   * "Tisch reservieren", Kanzlei "Erstberatung kostenfrei", Fitness
   * "Probetraining buchen". Templates use `spec.hero.cta_text` first;
   * this preset is the fallback when the orchestrator left it empty.
   */
  cta_text: string;
  /**
   * Loud (solid colour, prominent) or quiet (outline / text-link).
   * Premium hospitality + legal + handwerk all run quiet — fitness runs loud.
   */
  cta_style: 'loud' | 'quiet';
  /**
   * Section background sequence (loops). Templates iterate this to alternate
   * `.section.tone-X` classes. 3 tones is the editorial sweet-spot per
   * Awwwards Annual Top-100.
   */
  section_tones: Array<'cream' | 'offwhite' | 'tint' | 'carbon'>;
}

export const BRANCH_PRESETS: Record<LayoutKind, BranchPreset> = {
  // ─── Hospitality ──────────────────────────────────────────────────────────
  restaurant: {
    bg: '#FAFAF8',
    ink: '#1A1A1A',
    accent: '#7A1F2B',         // burgundy from Noma/Mirazur cluster
    primary: '#7A1F2B',
    secondary: '#3D4A2A',      // moss accent for tone-variation
    display_font: "'Cormorant Garamond', 'Playfair Display', Georgia, serif",
    body_font: "'Inter', 'Helvetica Neue', system-ui, sans-serif",
    font_imports: ['https://fonts.bunny.net/css?family=cormorant-garamond:400,500,600|inter:400,500,600&display=swap'],
    cta_text: 'Tisch reservieren',
    cta_style: 'quiet',
    section_tones: ['cream', 'offwhite', 'cream', 'tint', 'cream'],
  },
  hotel: {
    bg: '#F5F2EC',
    ink: '#222222',
    accent: '#C9A876',         // champagne — Aman cluster
    primary: '#84603a',
    secondary: '#C9A876',
    display_font: "'Cormorant Garamond', 'EB Garamond', Georgia, serif",
    body_font: "'Inter', system-ui, sans-serif",
    font_imports: ['https://fonts.bunny.net/css?family=cormorant-garamond:400,500,600|inter:400,500,600&display=swap'],
    cta_text: 'Verfügbarkeit prüfen',
    cta_style: 'quiet',
    section_tones: ['cream', 'offwhite', 'tint', 'carbon', 'cream'],
  },
  // ─── Health/Trust services ────────────────────────────────────────────────
  arzt: {
    bg: '#FAFAF8',
    ink: '#1A1A1A',
    accent: '#0E7490',         // calm teal — Parsley/Forward Health
    primary: '#0E7490',
    secondary: '#F5E6D3',      // warm cream — counters the "cold clinic" feel
    display_font: "'Fraunces', Georgia, serif",
    body_font: "'Inter', system-ui, sans-serif",
    font_imports: ['https://fonts.bunny.net/css?family=fraunces:400,500,600|inter:400,500,600&display=swap'],
    cta_text: 'Termin vereinbaren',
    cta_style: 'quiet',
    section_tones: ['cream', 'offwhite', 'tint', 'cream', 'offwhite'],
  },
  tier: {
    bg: '#FFFFFF',
    ink: '#0F1F1B',
    accent: '#FF6B8A',         // coral — Bond Vet cluster (warmth + urgency)
    primary: '#0E5E5A',        // deep forest — Modern Animal
    secondary: '#FF6B8A',
    display_font: "'Fraunces', Georgia, serif",
    body_font: "'Inter', system-ui, sans-serif",
    font_imports: ['https://fonts.bunny.net/css?family=fraunces:400,500,600|inter:400,500,600&display=swap'],
    cta_text: 'Termin buchen',
    cta_style: 'loud',
    section_tones: ['cream', 'offwhite', 'tint', 'cream', 'offwhite'],
  },
  kanzlei: {
    bg: '#FAFAF8',
    ink: '#1A1A1A',
    accent: '#1e3a8a',         // navy
    primary: '#1e3a8a',
    secondary: '#1e3a8a',
    display_font: "'Cormorant Garamond', 'EB Garamond', Georgia, serif",
    body_font: "'Inter', system-ui, sans-serif",
    font_imports: ['https://fonts.bunny.net/css?family=cormorant-garamond:400,500,600|inter:400,500,600&display=swap'],
    cta_text: 'Erstberatung vereinbaren',
    cta_style: 'quiet',
    section_tones: ['cream', 'offwhite', 'tint', 'carbon', 'cream'],
  },
  bestattung: {
    bg: '#F5F2EC',
    ink: '#3a4859',
    accent: '#84603a',
    primary: '#3a4859',
    secondary: '#84603a',
    display_font: "'Cormorant Garamond', Georgia, serif",
    body_font: "'Inter', system-ui, sans-serif",
    font_imports: ['https://fonts.bunny.net/css?family=cormorant-garamond:400,500,600|inter:400,500,600&display=swap'],
    cta_text: 'Wir sind für Sie da',
    cta_style: 'quiet',
    section_tones: ['cream', 'offwhite', 'cream', 'offwhite'],
  },
  // ─── Beauty / Lifestyle ───────────────────────────────────────────────────
  friseur: {
    bg: '#FAF7F2',
    ink: '#1A1A1A',
    accent: '#B7975A',         // gold — Aman Spa / Fekkai cluster
    primary: '#7c3aed',
    secondary: '#B7975A',
    display_font: "'Cormorant Garamond', 'Playfair Display', Georgia, serif",
    body_font: "'Inter', system-ui, sans-serif",
    font_imports: ['https://fonts.bunny.net/css?family=cormorant-garamond:400,500,600|inter:400,500,600&display=swap'],
    cta_text: 'Termin online buchen',
    cta_style: 'quiet',
    section_tones: ['cream', 'offwhite', 'tint', 'cream', 'offwhite'],
  },
  fitness: {
    bg: '#0c0c0c',             // black-dominant — Equinox/Barry's
    ink: '#FFFFFF',
    accent: '#dc2626',         // red — Barry's
    primary: '#dc2626',
    secondary: '#FFD400',      // yellow accent — SoulCycle
    display_font: "'Bricolage Grotesque', 'Inter', system-ui, sans-serif",
    body_font: "'Inter', system-ui, sans-serif",
    font_imports: ['https://fonts.bunny.net/css?family=bricolage-grotesque:600,700,800|inter:400,500,600&display=swap'],
    cta_text: 'Probetraining buchen',
    cta_style: 'loud',
    section_tones: ['carbon', 'tint', 'carbon', 'tint', 'carbon'],
  },
  einzelhandel: {
    bg: '#FFFFFF',
    ink: '#1A1A1A',
    accent: '#831843',         // boutique-pink
    primary: '#831843',
    secondary: '#831843',
    display_font: "'Cormorant Garamond', Georgia, serif",
    body_font: "'Inter', system-ui, sans-serif",
    font_imports: ['https://fonts.bunny.net/css?family=cormorant-garamond:400,500,600|inter:400,500,600&display=swap'],
    cta_text: 'Im Geschäft entdecken',
    cta_style: 'quiet',
    section_tones: ['offwhite', 'cream', 'offwhite', 'tint'],
  },
  galerie: {
    bg: '#FAFAF8',
    ink: '#171717',
    accent: '#171717',
    primary: '#171717',
    secondary: '#171717',
    display_font: "'Cormorant Garamond', Georgia, serif",
    body_font: "'Inter', system-ui, sans-serif",
    font_imports: ['https://fonts.bunny.net/css?family=cormorant-garamond:400,500|inter:400,500&display=swap'],
    cta_text: 'Anfrage senden',
    cta_style: 'quiet',
    section_tones: ['offwhite', 'cream', 'offwhite'],
  },
  golfclub: {
    bg: '#F5F2EC',
    ink: '#1A1A1A',
    accent: '#23423a',
    primary: '#23423a',
    secondary: '#B7975A',
    display_font: "'Cormorant Garamond', Georgia, serif",
    body_font: "'Inter', system-ui, sans-serif",
    font_imports: ['https://fonts.bunny.net/css?family=cormorant-garamond:400,500,600|inter:400,500,600&display=swap'],
    cta_text: 'Probespiel anfragen',
    cta_style: 'quiet',
    section_tones: ['cream', 'offwhite', 'tint', 'carbon'],
  },
  // ─── Trade / Industrial ───────────────────────────────────────────────────
  handwerk: {
    bg: '#F5F2EC',             // off-white — Vitsoe/USM cluster
    ink: '#1A1A1A',
    accent: '#c2410c',         // burnt-orange
    primary: '#1A1A1A',        // material-theater: ink dominates
    secondary: '#c2410c',
    display_font: "'Cormorant Garamond', 'GT Sectra', Georgia, serif",
    body_font: "'Inter', 'Helvetica Neue', system-ui, sans-serif",
    font_imports: ['https://fonts.bunny.net/css?family=cormorant-garamond:400,500,600|inter:400,500,600&display=swap'],
    cta_text: 'Beratung anfragen',
    cta_style: 'quiet',
    section_tones: ['cream', 'offwhite', 'cream', 'tint', 'cream'],
  },
  autohaus: {
    bg: '#FFFFFF',
    ink: '#0E0E10',
    accent: '#dc2626',
    primary: '#0E0E10',
    secondary: '#dc2626',
    display_font: "'Bricolage Grotesque', 'Inter', system-ui, sans-serif",
    body_font: "'Inter', system-ui, sans-serif",
    font_imports: ['https://fonts.bunny.net/css?family=bricolage-grotesque:600,700,800|inter:400,500,600&display=swap'],
    cta_text: 'Probefahrt vereinbaren',
    cta_style: 'quiet',
    section_tones: ['offwhite', 'cream', 'offwhite', 'tint'],
  },
  energie: {
    bg: '#FAFAF8',
    ink: '#1A1A1A',
    accent: '#ca8a04',
    primary: '#ca8a04',
    secondary: '#1A1A1A',
    display_font: "'Fraunces', Georgia, serif",
    body_font: "'Inter', system-ui, sans-serif",
    font_imports: ['https://fonts.bunny.net/css?family=fraunces:400,500,600|inter:400,500,600&display=swap'],
    cta_text: 'Kostenlose Beratung',
    cta_style: 'quiet',
    section_tones: ['cream', 'offwhite', 'tint', 'cream'],
  },
  // ─── Generic / fallback ───────────────────────────────────────────────────
  standard: {
    bg: '#FAFAF8',
    ink: '#1A1A1A',
    accent: '#0f172a',
    primary: '#0f172a',
    secondary: '#0f172a',
    display_font: "'Cormorant Garamond', Georgia, serif",
    body_font: "'Inter', system-ui, sans-serif",
    font_imports: ['https://fonts.bunny.net/css?family=cormorant-garamond:400,500,600|inter:400,500,600&display=swap'],
    cta_text: 'Kontakt aufnehmen',
    cta_style: 'quiet',
    section_tones: ['cream', 'offwhite', 'tint', 'cream'],
  },
  // ─── Verein cluster — already wired in Phase 1-5 with overrides ──────────
  // Kept here for completeness so any future shell that picks the preset by
  // layout_kind has a defensible fallback when it walks an unknown verein-X.
  verein: {
    bg: '#fbf7ee',
    ink: '#1f1a14',
    accent: '#b8893d',
    primary: '#2d4a32',
    secondary: '#b8893d',
    display_font: "'Fraunces', Georgia, serif",
    body_font: "'Lora', Georgia, serif",
    font_imports: ['https://fonts.bunny.net/css?family=fraunces:400,500,600,700|lora:400,500,600,700&display=swap'],
    cta_text: 'Mitglied werden',
    cta_style: 'loud',
    section_tones: ['cream', 'tint', 'cream', 'carbon', 'cream'],
  },
  verein_musik: {
    bg: '#fbf7ee',
    ink: '#1f1a14',
    accent: '#b8893d',
    primary: '#2d4a32',
    secondary: '#b8893d',
    display_font: "'Fraunces', Georgia, serif",
    body_font: "'Lora', Georgia, serif",
    font_imports: ['https://fonts.bunny.net/css?family=fraunces:400,500,600,700|lora:400,500,600,700&display=swap'],
    cta_text: 'Probe besuchen',
    cta_style: 'loud',
    section_tones: ['cream', 'tint', 'cream', 'carbon', 'cream'],
  },
  verein_sport: {
    bg: '#f8fafc',
    ink: '#0f172a',
    accent: '#facc15',
    primary: '#15803d',
    secondary: '#facc15',
    display_font: "'Bricolage Grotesque', system-ui, sans-serif",
    body_font: "'Inter', system-ui, sans-serif",
    font_imports: ['https://fonts.bunny.net/css?family=bricolage-grotesque:500,600,700,800|inter:400,500,600,700&display=swap'],
    cta_text: 'Probetraining',
    cta_style: 'loud',
    section_tones: ['cream', 'tint', 'cream', 'carbon', 'cream'],
  },
  verein_tradition: {
    bg: '#faf6ed',
    ink: '#1f1410',
    accent: '#b89968',
    primary: '#7c2d12',
    secondary: '#b89968',
    display_font: "'Cinzel', 'Times New Roman', serif",
    body_font: "'Lora', Georgia, serif",
    font_imports: ['https://fonts.bunny.net/css?family=cinzel:400,500,600,700|lora:400,500,600,700&display=swap'],
    cta_text: 'Beitreten',
    cta_style: 'quiet',
    section_tones: ['cream', 'tint', 'cream', 'carbon', 'cream'],
  },
};

/**
 * Pick the preset for a given layout kind with a defensible standard
 * fallback. The orchestrator already validates layout_kind against
 * LayoutKind, but callers consuming arbitrary string input (e.g. from
 * scraped meta-tags in a future enrichment path) get the fallback rather
 * than crashing.
 */
export function getBranchPreset(kind: string | undefined): BranchPreset {
  if (kind && (kind in BRANCH_PRESETS)) {
    return BRANCH_PRESETS[kind as LayoutKind];
  }
  return BRANCH_PRESETS.standard;
}
