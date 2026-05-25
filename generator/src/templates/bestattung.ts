/**
 * Bestattung template — würdevoll, ruhig, vertrauenswürdig.
 * Cinematic full-bleed hero, calm dusty-blue + parchment palette,
 * Cormorant editorial serif, multi-section depth: services, first-steps,
 * burial-forms, trauerredner, memoriam-quote, FAQ, trust badges.
 */

import type { SiteSpec } from '../types.js';
import { renderSeoHead } from './_seo.js';
import { getHeroImage, getGalleryImage } from './_media.js';
import { getBranchPreset } from './_branch_presets.js';
import {
  escapeHtml,
  extractFoundedYear,
  buildMarqueeItems,
  pickPullQuote,
  renderMarquee,
  renderPullQuote,
  renderRatingPill,
  renderQuietFooter,
  renderTrustBar,
  EDITORIAL_CSS,
} from './_editorial.js';

function heroPhoto(spec: SiteSpec, slug: string): string {
  return getHeroImage(spec, slug, 1800, 1100);
}

function memoriamPhoto(spec: SiteSpec, slug: string): string {
  return getGalleryImage(spec, slug, 7, 900, 1100);
}

export function renderBestattungPage(spec: SiteSpec, slug: string): string {
  const PRESET = getBranchPreset('bestattung');
  const primary = spec.brand.primary_color || PRESET.primary;
  const secondary = spec.brand.secondary_color || PRESET.secondary;
  const accent = spec.brand.accent_color || PRESET.accent;
  const headingFont = spec.brand.heading_font_family
    ? `'${spec.brand.heading_font_family}', ${PRESET.display_font}`
    : PRESET.display_font;
  const bodyFont = spec.brand.body_font_family
    ? `'${spec.brand.body_font_family}', ${PRESET.body_font}`
    : PRESET.body_font;
  const fontImports = (spec.brand?.font_imports && spec.brand.font_imports.length > 0)
    ? spec.brand.font_imports
    : PRESET.font_imports;
  const fontImportTags = fontImports
    .map(u => `<link rel="stylesheet" href="${escapeHtml(u)}" crossorigin>`).join('\n  ');

  const businessName = escapeHtml(spec.business_name);
  const tagline = spec.tagline;
  const headline = spec.hero.headline;
  const subhead = escapeHtml(spec.hero.subheadline);
  const ctaText = escapeHtml(spec.hero.cta_text || PRESET.cta_text);

  const foundedYear = extractFoundedYear(spec);
  const marqueeItems = buildMarqueeItems(spec, foundedYear);
  const pullQuote = pickPullQuote(spec);

  const trustStats: Array<{ value: string; label: string }> = [];
  if (foundedYear) {
    const years = new Date().getFullYear() - foundedYear;
    if (years > 0) trustStats.push({ value: `${years}+`, label: 'Jahre Erfahrung' });
  }
  if (spec.business?.rating && spec.business?.review_count && spec.business.review_count >= 5) {
    trustStats.push({ value: `${spec.business.rating.toFixed(1).replace('.', ',')} ★`, label: `${spec.business.review_count} Bewertungen` });
  }

  const services = spec.services && spec.services.length >= 4 ? spec.services : [
    { name: 'Erstversorgung', description: 'Zu jeder Tages- und Nachtzeit erreichbar. Wir übernehmen die Überführung in unsere Räume.' },
    { name: 'Trauerfeier', description: 'Kirchlich, weltlich oder im engsten Kreis — würdevolle Gestaltung nach Ihren Vorstellungen.' },
    { name: 'Behördenabwicklung', description: 'Sterbeurkunde, Versicherungen, Renten — wir nehmen Ihnen alle Wege ab.' },
    { name: 'Bestattungsvorsorge', description: 'Selbstbestimmt zu Lebzeiten regeln, was Ihnen wichtig ist — auch finanziell entlastend.' },
    { name: 'Floristik & Trauerdruck', description: 'Sarggestecke, Kränze, Trauerkarten — alles aus einer Hand.' },
    { name: 'Persönliche Begleitung', description: 'Wir bleiben auch nach der Trauerfeier ansprechbar — auf Wunsch über Monate hinweg.' },
  ];

  const phone = spec.contact.phone ? escapeHtml(spec.contact.phone) : '+43 662 123 456';
  const email = spec.contact.email ? escapeHtml(spec.contact.email) : 'kontakt@beispiel.at';
  const address = spec.contact.address ? escapeHtml(spec.contact.address) : 'Musterstraße 1, 5020 Salzburg';

  const burialForms = [
    { icon: '⚱', name: 'Erdbestattung', desc: 'Klassische Erdgrabstätte — Einzel, Doppel oder Familiengrab.' },
    { icon: '🕯', name: 'Feuerbestattung', desc: 'Mit Urnenbeisetzung in Urnengrab, Grab oder Kolumbarium.' },
    { icon: '🌳', name: 'Naturbestattung', desc: 'Im Friedwald, Baumgrab oder Wiesengrab — naturnah und würdevoll.' },
    { icon: '🌊', name: 'Seebestattung', desc: 'Würdevolle Beisetzung der Urne im Meer, mit Trauerschiff-Begleitung.' },
    { icon: '✦', name: 'Anonyme Bestattung', desc: 'Beisetzung ohne Grabstelle, ohne öffentliche Trauerfeier.' },
    { icon: '⚓', name: 'Überführung Ausland', desc: 'Vollständige Abwicklung von Überführungen ins In- und Ausland.' },
  ];

  const firstSteps = [
    { num: '01', title: 'Anrufen — wir kommen zu Ihnen.', body: 'Tag und Nacht erreichbar. Wir übernehmen die Erstversorgung sofort und begleiten Sie ab dem ersten Augenblick.' },
    { num: '02', title: 'Persönliches Gespräch.', body: 'In Ruhe besprechen wir alle Wünsche, Bestattungsform, Trauerfeier und administrative Schritte. Bei Ihnen zuhause oder bei uns.' },
    { num: '03', title: 'Wir kümmern uns um alles.', body: 'Behördengänge, Floristik, Trauerredner, Trauerdruck, Friedhof — wir koordinieren jeden Schritt diskret und zuverlässig.' },
  ];

  const faqs = [
    { q: 'Was muss ich tun, wenn ein Angehöriger verstorben ist?', a: 'Rufen Sie uns an — Tag und Nacht. Wir kommen zu Ihnen, übernehmen die Erstversorgung und begleiten Sie durch alle weiteren Schritte. Sie müssen sich um nichts selbst kümmern.' },
    { q: 'Welche Unterlagen werden benötigt?', a: 'In der Regel Personalausweis, Versicherungskarte, Familienstammbuch, Geburtsurkunde sowie ggf. Heirats- oder Sterbeurkunde des Ehepartners. Wir helfen Ihnen, alles zusammenzustellen.' },
    { q: 'Wie hoch sind die Kosten einer Bestattung?', a: 'Die Gesamtkosten variieren je nach gewählter Bestattungsform, Sarg/Urne, Friedhof und Trauerfeier. Wir erstellen Ihnen ein transparentes Angebot — schriftlich, ohne versteckte Posten.' },
    { q: 'Kann ich eine Bestattung im Voraus regeln?', a: 'Ja. Mit der Bestattungsvorsorge legen Sie zu Lebzeiten fest, wie Ihre Bestattung aussehen soll — und entlasten damit Ihre Angehörigen finanziell und organisatorisch.' },
    { q: 'Begleiten Sie auch bei einer Auslandsüberführung?', a: 'Ja, wir wickeln Überführungen aus dem Ausland nach Österreich oder von Österreich ins Ausland vollständig ab — inklusive aller behördlichen Anforderungen.' },
  ];

  return `---
---
<!DOCTYPE html>
<html lang="de">
<head>
  ${renderSeoHead(spec, { slug, schemaKind: 'FuneralHome' })}
  ${fontImportTags}
  <style is:global>
    :root {
      --bg: ${PRESET.bg};
      --bg-2: #efece5;
      --paper: #fdfdfb;
      --ink: ${PRESET.ink};
      --ink-2: #4a5260;
      --ink-3: #8a8e96;
      --primary: ${escapeHtml(primary)};
      --primary-deep: color-mix(in oklch, ${escapeHtml(primary)} 70%, black);
      --secondary: ${escapeHtml(secondary)};
      --accent: ${escapeHtml(accent)};
      --accent-deep: color-mix(in oklch, ${escapeHtml(accent)} 70%, black);
      --rule: rgba(31,38,48,0.10);
      --display: ${headingFont};
      --serif: ${headingFont};
      --sans: ${bodyFont};
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body { background: var(--bg); color: var(--ink); font-family: var(--sans); font-weight: 300; line-height: 1.7; -webkit-font-smoothing: antialiased; overflow-x: hidden; }
    img { display: block; max-width: 100%; }
    a { color: inherit; text-decoration: none; }

    .demo-banner { background: #1a0a1f; color:#fff; padding:0.55rem 1rem; font-size:0.82rem; position: relative; z-index: 200; border-bottom: 1px solid rgba(236,101,186,0.35); }
    .demo-banner-inner { max-width: 1280px; margin: 0 auto; display: flex; align-items: center; gap: 0.85rem; flex-wrap: wrap; justify-content: center; }
    .demo-banner-tag { font-size: 0.7rem; letter-spacing: 0.16em; text-transform: uppercase; padding: 0.18rem 0.55rem; border-radius: 999px; background: rgba(236,101,186,0.22); border: 1px solid rgba(236,101,186,0.5); color: #ffd6ee; font-weight: 700; white-space: nowrap; }
    .demo-banner a { color: #ffb3df; font-weight: 700; border-bottom: 1px solid rgba(255,179,223,0.45); }

    .notruf-bar {
      background: linear-gradient(90deg, #1f2630 0%, #2a323e 100%); color: #fff;
      padding: 0.7rem 1.5rem; font-size: 0.86rem; text-align: center;
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }
    .notruf-bar strong { letter-spacing: 0.04em; color: var(--accent); margin-right: 0.5rem; }

    /* ─── Header ─── */
    .nav { position: absolute; top: 75px; left: 0; right: 0; z-index: 30; padding: 1.5rem 2rem; }
    .nav-inner { max-width: 1400px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 2rem; }
    .brand-mark { font-family: var(--serif); font-weight: 500; font-size: 1.6rem; letter-spacing: 0.02em; color: #fff; }
    .main-nav { display: none; gap: 2.25rem; font-size: 0.85rem; letter-spacing: 0.06em; text-transform: uppercase; }
    .main-nav a { color: rgba(255,255,255,0.85); transition: color .25s; font-weight: 400; }
    .main-nav a:hover { color: var(--accent); }
    @media (min-width: 880px) { .main-nav { display: flex; } }

    /* ─── Hero ─── */
    .hero { position: relative; min-height: 88vh; display: flex; align-items: center; isolation: isolate; }
    .hero-img { position: absolute; inset: 0; z-index: -2; background-size: cover; background-position: center; filter: brightness(0.55) saturate(0.7); }
    .hero::after { content: ''; position: absolute; inset: 0; z-index: -1; background: linear-gradient(180deg, rgba(31,38,48,0.55) 0%, rgba(31,38,48,0.65) 70%, rgba(31,38,48,0.85) 100%); }
    .hero-text { padding: 6rem 2rem 5rem; max-width: 1400px; margin: 0 auto; width: 100%; color: #fff; }
    .hero-line { width: 1.5px; height: 64px; background: var(--accent); margin-bottom: 2.5rem; }
    .hero-eyebrow { font-size: 0.78rem; letter-spacing: 0.24em; text-transform: uppercase; color: var(--accent); margin-bottom: 1.5rem; font-weight: 500; }
    .hero h1 { font-family: var(--serif); font-weight: 400; font-size: clamp(2.75rem, 6.5vw, 5.5rem); line-height: 1.05; letter-spacing: -0.005em; max-width: 18ch; color: #fff; }
    .hero h1 em { font-style: italic; }
    .hero p.lead { color: rgba(255,255,255,0.75); font-size: 1.15rem; line-height: 1.65; max-width: 580px; margin-top: 2rem; font-weight: 300; }
    .hero-actions { display: flex; gap: 1rem; margin-top: 2.5rem; flex-wrap: wrap; }
    .btn-primary {
      background: var(--accent); color: #fff;
      padding: 1.05rem 2.2rem; border-radius: 0;
      font-weight: 500; font-size: 0.92rem;
      letter-spacing: 0.04em; text-transform: uppercase;
      border: 1px solid var(--accent);
      transition: background .25s, border-color .25s, color .25s;
    }
    .btn-primary:hover { background: transparent; border-color: var(--accent); }
    .btn-outline {
      background: transparent; color: #fff;
      padding: 1.05rem 2.2rem;
      border: 1px solid rgba(255,255,255,0.4);
      font-weight: 500; font-size: 0.92rem; letter-spacing: 0.04em; text-transform: uppercase;
      transition: border-color .25s, background .25s;
    }
    .btn-outline:hover { border-color: #fff; background: rgba(255,255,255,0.06); }

    /* ─── Section base ─── */
    .section { padding: clamp(5rem, 9vw, 8rem) 1.5rem; }
    .container { max-width: 1300px; margin: 0 auto; }
    .container-narrow { max-width: 880px; margin: 0 auto; }
    .section-eyebrow { display: inline-block; font-size: 0.78rem; letter-spacing: 0.22em; text-transform: uppercase; color: var(--accent); font-weight: 600; margin-bottom: 1rem; padding-left: 1.5rem; position: relative; }
    .section-eyebrow::before { content: ''; position: absolute; left: 0; top: 50%; width: 24px; height: 1.5px; background: var(--accent); transform: translateY(-50%); }
    .section-title { font-family: var(--serif); font-weight: 400; font-size: clamp(2.25rem, 4.5vw, 3.5rem); line-height: 1.15; letter-spacing: -0.005em; color: var(--ink); margin-bottom: 1.25rem; }
    .section-title em { font-style: italic; color: var(--accent-deep); }
    .section-lead { color: var(--ink-2); font-size: 1.1rem; line-height: 1.75; max-width: 600px; }
    .section-head.center { text-align: center; }
    .section-head.center .section-eyebrow { padding-left: 0; }
    .section-head.center .section-eyebrow::before { display: none; }
    .section-head.center .section-lead { margin-inline: auto; }

    /* ─── First steps ─── */
    .first-steps { background: var(--bg-2); }
    .steps-grid { display: grid; gap: 1.25rem; margin-top: 4rem; grid-template-columns: 1fr; }
    @media (min-width: 880px) { .steps-grid { grid-template-columns: repeat(3, 1fr); } }
    .step {
      background: var(--paper); padding: 2.5rem 2rem;
      border-top: 2px solid var(--accent);
      transition: transform .3s ease, box-shadow .3s ease;
    }
    .step:hover { transform: translateY(-4px); box-shadow: 0 20px 40px -20px rgba(31,38,48,0.18); }
    .step-num { font-family: var(--serif); font-weight: 500; font-size: 2.5rem; line-height: 1; color: var(--accent); margin-bottom: 1rem; }
    .step h3 { font-family: var(--serif); font-weight: 500; font-size: 1.4rem; line-height: 1.3; margin-bottom: 0.75rem; color: var(--ink); }
    .step p { color: var(--ink-2); font-size: 0.96rem; line-height: 1.7; }

    /* ─── Services list ─── */
    .services-grid { display: grid; gap: 0; margin-top: 4rem; grid-template-columns: 1fr; border-top: 1px solid var(--rule); }
    @media (min-width: 720px) { .services-grid { grid-template-columns: 1fr 1fr; } }
    @media (min-width: 1100px) { .services-grid { grid-template-columns: repeat(3, 1fr); } }
    .service-item {
      padding: 2.5rem 0 2.5rem 2.25rem;
      border-bottom: 1px solid var(--rule);
      border-right: 1px solid var(--rule);
      position: relative;
    }
    .service-item:nth-child(3n) { border-right: none; }
    @media (max-width: 1099px) { .service-item:nth-child(2n) { border-right: none; } .service-item { border-right: 1px solid var(--rule); } }
    @media (max-width: 719px) { .service-item { border-right: none !important; } }
    .service-item::before {
      content: ''; position: absolute; left: 0; top: 2.85rem;
      width: 8px; height: 8px; background: var(--accent); border-radius: 50%;
    }
    .service-item h3 { font-family: var(--serif); font-weight: 500; font-size: 1.4rem; line-height: 1.3; margin-bottom: 0.7rem; color: var(--ink); }
    .service-item p { color: var(--ink-2); font-size: 0.96rem; line-height: 1.7; padding-right: 1.5rem; }

    /* ─── Burial forms ─── */
    .forms { background: var(--ink); color: rgba(255,255,255,0.85); }
    .forms .section-title { color: #fff; }
    .forms .section-eyebrow { color: var(--accent); }
    .forms .section-lead { color: rgba(255,255,255,0.7); }
    .forms-grid { display: grid; gap: 1.25rem; margin-top: 4rem; grid-template-columns: 1fr; }
    @media (min-width: 720px) { .forms-grid { grid-template-columns: 1fr 1fr; } }
    @media (min-width: 1100px) { .forms-grid { grid-template-columns: repeat(3, 1fr); } }
    .form-card {
      padding: 2.25rem;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
      transition: background .3s, border-color .3s;
    }
    .form-card:hover { background: rgba(120,131,146,0.12); border-color: var(--accent); }
    .form-card .icon { font-size: 2rem; line-height: 1; color: var(--accent); margin-bottom: 1rem; }
    .form-card h4 { font-family: var(--serif); font-weight: 500; font-size: 1.3rem; line-height: 1.3; margin-bottom: 0.5rem; color: #fff; }
    .form-card p { color: rgba(255,255,255,0.7); font-size: 0.94rem; line-height: 1.65; }

    /* ─── Memoriam quote with image ─── */
    .memoriam {
      background: var(--bg-2);
      display: grid; gap: 0;
      grid-template-columns: 1fr;
    }
    @media (min-width: 880px) { .memoriam { grid-template-columns: 1fr 1.2fr; } }
    .memoriam-img {
      min-height: 480px;
      background-size: cover; background-position: center;
      filter: grayscale(0.3) brightness(0.92);
    }
    .memoriam-text {
      padding: clamp(3rem, 6vw, 5rem); display: flex; flex-direction: column; justify-content: center;
    }
    .memoriam-quote {
      font-family: var(--serif); font-weight: 400; font-style: italic;
      font-size: clamp(1.5rem, 3.5vw, 2.4rem); line-height: 1.35;
      color: var(--ink); margin-bottom: 1.5rem;
      position: relative; padding-left: 2rem;
    }
    .memoriam-quote::before {
      content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 2px;
      background: var(--accent);
    }
    .memoriam-author { font-size: 0.86rem; letter-spacing: 0.06em; color: var(--ink-3); text-transform: uppercase; }

    /* ─── Trust badges ─── */
    .trust { background: var(--paper); border-top: 1px solid var(--rule); border-bottom: 1px solid var(--rule); padding: 3rem 1.5rem; }
    .trust-inner { max-width: 1100px; margin: 0 auto; display: grid; gap: 2rem; grid-template-columns: repeat(auto-fit, minmax(min(180px, 100%), 1fr)); text-align: center; }
    .trust-item strong { display: block; font-family: var(--serif); font-size: 2.2rem; font-weight: 500; line-height: 1; color: var(--accent-deep); margin-bottom: 0.5rem; }
    .trust-item span { font-size: 0.85rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-3); }

    /* ─── About + values ─── */
    .about-grid { display: grid; gap: 4rem; margin-top: 3rem; grid-template-columns: 1fr; }
    @media (min-width: 880px) { .about-grid { grid-template-columns: 1.1fr 1fr; gap: 5rem; align-items: center; } }
    .about-text p { color: var(--ink-2); font-size: 1.05rem; line-height: 1.85; margin-bottom: 1rem; }
    .values-list { list-style: none; padding: 0; margin: 2rem 0 0; }
    .values-list li {
      padding: 1.25rem 0; border-bottom: 1px solid var(--rule);
      display: flex; align-items: flex-start; gap: 1rem;
    }
    .values-list li:last-child { border-bottom: none; }
    .values-list li::before {
      content: '✦'; color: var(--accent); font-size: 0.95rem;
      flex-shrink: 0; padding-top: 0.15rem;
    }
    .values-list strong { font-family: var(--serif); font-weight: 500; font-size: 1.1rem; color: var(--ink); display: block; margin-bottom: 0.2rem; }
    .values-list span { color: var(--ink-2); font-size: 0.95rem; line-height: 1.65; }

    /* ─── FAQ ─── */
    .faq { background: var(--bg-2); }
    .faq-list { max-width: 880px; margin: 4rem auto 0; }
    .faq-item {
      border-bottom: 1px solid var(--rule); padding: 1.85rem 0;
    }
    .faq-item summary {
      cursor: pointer; list-style: none;
      display: flex; align-items: flex-start; justify-content: space-between; gap: 2rem;
      font-family: var(--serif); font-weight: 500; font-size: 1.25rem; line-height: 1.4;
      color: var(--ink);
    }
    .faq-item summary::-webkit-details-marker { display: none; }
    .faq-item summary::after {
      content: '+'; font-family: var(--sans); font-size: 1.5rem; color: var(--accent);
      transition: transform .3s; flex-shrink: 0; margin-top: -0.15rem;
    }
    .faq-item[open] summary::after { transform: rotate(45deg); }
    .faq-item p { color: var(--ink-2); font-size: 1rem; line-height: 1.8; padding-top: 1rem; max-width: 60ch; }

    /* ─── Contact section ─── */
    .contact-section { background: var(--ink); color: #fff; padding: clamp(5rem, 8vw, 7rem) 1.5rem; }
    .contact-section .section-title { color: #fff; }
    .contact-section .section-eyebrow { color: var(--accent); }
    .contact-section .section-lead { color: rgba(255,255,255,0.7); }
    .contact-grid { display: grid; gap: 1.25rem; margin-top: 3rem; grid-template-columns: 1fr; }
    @media (min-width: 720px) { .contact-grid { grid-template-columns: repeat(3, 1fr); } }
    .contact-card {
      padding: 2rem; background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.1);
      text-align: center; transition: border-color .3s, background .3s;
    }
    .contact-card:hover { border-color: var(--accent); background: rgba(120,131,146,0.1); }
    .contact-card .lbl { font-size: 0.74rem; letter-spacing: 0.18em; text-transform: uppercase; color: var(--accent); margin-bottom: 1rem; font-weight: 600; }
    .contact-card .val { font-family: var(--serif); font-size: 1.3rem; line-height: 1.4; color: #fff; }
    .contact-card a:hover { color: var(--accent); }

    /* ─── Footer multi-col ─── */
    footer.site-footer {
      background: linear-gradient(180deg, #131820 0%, #06080d 100%);
      color: rgba(255,255,255,0.7);
      padding: clamp(3rem, 5vw, 4.5rem) 1.5rem 2rem;
      position: relative; overflow: hidden; isolation: isolate;
    }
    .footer-inner { max-width: 1300px; margin: 0 auto; }
    .footer-grid {
      display: grid; gap: 2.5rem; grid-template-columns: 1fr;
      padding-bottom: 2.5rem; border-bottom: 1px solid rgba(255,255,255,0.08);
    }
    @media (min-width: 720px) { .footer-grid { grid-template-columns: 1.4fr 1fr 1fr 1fr; } }
    .footer-col h4 {
      font-family: var(--sans); font-size: 0.74rem; letter-spacing: 0.18em;
      text-transform: uppercase; font-weight: 600; color: var(--accent);
      margin: 0 0 1.1rem;
    }
    .footer-col ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.6rem; }
    .footer-col a, .footer-col li { color: rgba(255,255,255,0.7); font-size: 0.94rem; line-height: 1.55; transition: color .25s; }
    .footer-col a:hover { color: var(--accent); }
    .footer-brand h3 { font-family: var(--serif); font-weight: 500; font-size: 1.6rem; color: #fff; margin: 0 0 0.65rem; letter-spacing: 0.02em; }
    .footer-brand p { font-size: 0.95rem; line-height: 1.65; max-width: 36ch; margin: 0 0 1.25rem; color: rgba(255,255,255,0.55); }
    .footer-bottom {
      display: flex; flex-wrap: wrap; gap: 1rem; justify-content: space-between; align-items: center;
      padding-top: 2rem; font-size: 0.84rem; color: rgba(255,255,255,0.45);
    }
    .footer-credit a { color: rgba(255,255,255,0.6); font-weight: 500; border-bottom: 1px solid rgba(255,255,255,0.18); transition: all .25s; }
    .footer-credit a:hover { color: var(--accent); border-color: var(--accent); }

    /* Reveal animation */
    .reveal { opacity: 1; transform: none; }
    /* visible by default */
    @media (prefers-reduced-motion: reduce) { .reveal { opacity: 1 !important; transform: none !important; } }

    ${EDITORIAL_CSS}
  </style>
</head>
<body>

<div class="demo-banner" role="contentinfo">
  <div class="demo-banner-inner">
    <span class="demo-banner-tag">Demo-Vorschau</span>
    <span>Erstellt von <a href="https://webhoch.com" target="_blank" rel="noopener">Webagentur Hochmeir e.U.</a> · <a href="https://webhoch.com/#contact" target="_blank" rel="noopener">Beratung anfragen</a></span>
  </div>
</div>

<div class="notruf-bar" role="contentinfo">
  <strong>Tag &amp; Nacht erreichbar.</strong>
  Notruf 24/7 verfügbar — bitte beachten Sie, dass dies eine Demo-Vorschau ist und die angezeigte Telefonnummer nur als Beispiel dient.
</div>

<header class="nav">
  <div class="nav-inner">
    <a class="brand-mark" href="#">${businessName}</a>
    <nav class="main-nav">
      <a href="#begleitung">Begleitung</a>
      <a href="#erste-schritte">Erste Schritte</a>
      <a href="#bestattungsformen">Bestattungsformen</a>
      <a href="#fragen">Fragen</a>
      <a href="#kontakt">Kontakt</a>
    </nav>
  </div>
</header>

<section class="hero">
  <div class="hero-img" style="background-image: url('${heroPhoto(spec, slug)}');"></div>
  <div class="hero-text">
    <div class="hero-line"></div>
    <span class="hero-eyebrow">${escapeHtml(tagline.slice(0, 60))}</span>
    <h1>${escapeHtml(headline.replace(/(\.|!|\?)([^.!?]*)$/, '|$1$2|')).replace(/\|([^|]+)\|/, '<em>$1</em>')}</h1>
    <p class="lead">${subhead}</p>
    ${renderRatingPill(spec)}
    <div class="hero-actions">
      <a href="#kontakt" class="btn-primary">${ctaText}</a>
      <a href="#erste-schritte" class="btn-outline">Erste Schritte ansehen</a>
    </div>
  </div>
</section>

${renderMarquee(marqueeItems)}

${trustStats.length >= 2 ? renderTrustBar(trustStats) : `<section class="trust">
  <div class="trust-inner">
    <div class="trust-item"><strong>24 / 7</strong><span>Erreichbar</span></div>
    <div class="trust-item"><strong>40+ Jahre</strong><span>Erfahrung</span></div>
    <div class="trust-item"><strong>3 Generationen</strong><span>Familienbetrieb</span></div>
    <div class="trust-item"><strong>Mitglied</strong><span>Bestatter-Verband AT</span></div>
  </div>
</section>`}

<section id="erste-schritte" class="section first-steps">
  <div class="container">
    <div class="section-head reveal">
      <span class="section-eyebrow">Erste Schritte</span>
      <h2 class="section-title">Was im <em>Trauerfall</em> zu tun ist.</h2>
      <p class="section-lead">In den ersten Stunden nach einem Trauerfall fühlen sich viele überfordert. Sie müssen nichts allein entscheiden — wir nehmen Ihnen die Last ab.</p>
    </div>
    <div class="steps-grid">
      ${firstSteps.map(s => `
        <article class="step reveal">
          <div class="step-num">${s.num}</div>
          <h3>${escapeHtml(s.title)}</h3>
          <p>${escapeHtml(s.body)}</p>
        </article>
      `).join('')}
    </div>
  </div>
</section>

<section id="begleitung" class="section">
  <div class="container">
    <div class="section-head reveal">
      <span class="section-eyebrow">Wie wir begleiten</span>
      <h2 class="section-title">Persönlich, würdevoll, <em>diskret</em>.</h2>
      <p class="section-lead">Wir nehmen uns Zeit. Für Ihre Wünsche, für Ihre Trauer, für jeden einzelnen Schritt.</p>
    </div>
    <div class="services-grid">
      ${services.map(s => `
        <article class="service-item reveal">
          <h3>${escapeHtml(s.name)}</h3>
          <p>${escapeHtml(s.description)}</p>
        </article>
      `).join('')}
    </div>
  </div>
</section>

<section id="bestattungsformen" class="section forms">
  <div class="container">
    <div class="section-head reveal">
      <span class="section-eyebrow">Bestattungsformen</span>
      <h2 class="section-title">Jede Bestattung ist <em>einzigartig</em>.</h2>
      <p class="section-lead">Vom klassischen Erdgrab bis zur naturnahen Beisetzung — wir beraten Sie offen und ohne Vorgaben.</p>
    </div>
    <div class="forms-grid">
      ${burialForms.map(b => `
        <article class="form-card reveal">
          <div class="icon">${b.icon}</div>
          <h4>${b.name}</h4>
          <p>${b.desc}</p>
        </article>
      `).join('')}
    </div>
  </div>
</section>

<section class="memoriam">
  <div class="memoriam-img" style="background-image: url('${memoriamPhoto(spec, slug)}');"></div>
  <div class="memoriam-text reveal">
    <span class="section-eyebrow" style="padding-left: 0; margin-bottom: 1.25rem;">In Memoriam</span>
    <p class="memoriam-quote">„Was du in Liebe getan hast, wird nie verloren sein. Es lebt weiter — in den Menschen, die du berührt hast."</p>
    <span class="memoriam-author">— Trauerleitspruch</span>
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="about-grid">
      <div class="about-text reveal">
        <span class="section-eyebrow">Über uns</span>
        <h2 class="section-title">Familie, die für <em>Familien</em> da ist.</h2>
        <p>${escapeHtml(spec.about?.body || 'Seit über vier Jahrzehnten begleiten wir Familien in den schwersten Stunden ihres Lebens. Was als kleiner Betrieb begann, wird heute in dritter Generation geführt — mit derselben Sorgfalt, demselben Respekt.')}</p>
        <p>Wir glauben: Eine Bestattung ist mehr als ein Termin. Es ist die letzte Geste der Liebe und Wertschätzung. Diese Geste verdient unsere ganze Aufmerksamkeit.</p>
      </div>
      <div class="reveal">
        <ul class="values-list">
          <li>
            <div>
              <strong>Persönlich, nicht standardisiert</strong>
              <span>Jeder Mensch hat eine einzigartige Geschichte. Jede Trauerfeier sollte das widerspiegeln.</span>
            </div>
          </li>
          <li>
            <div>
              <strong>Transparent in Kosten und Abläufen</strong>
              <span>Keine versteckten Posten, kein Kleingedrucktes. Alles schriftlich, alles fair kalkuliert.</span>
            </div>
          </li>
          <li>
            <div>
              <strong>Diskret und würdevoll</strong>
              <span>Privatsphäre ist nicht verhandelbar. Wir bewegen uns leise im Hintergrund.</span>
            </div>
          </li>
          <li>
            <div>
              <strong>Über die Trauerfeier hinaus</strong>
              <span>Wir bleiben ansprechbar — auch Wochen und Monate danach. Eine kurze Frage, eine Erinnerung — wir sind da.</span>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </div>
</section>

<section id="fragen" class="section faq">
  <div class="container">
    <div class="section-head center reveal">
      <span class="section-eyebrow">Häufige Fragen</span>
      <h2 class="section-title">Was Sie <em>jetzt wissen</em> sollten.</h2>
      <p class="section-lead">Wenn etwas Sie hier nicht beantwortet — rufen Sie uns einfach an. Wir nehmen uns Zeit.</p>
    </div>
    <div class="faq-list">
      ${faqs.map(f => `
        <details class="faq-item reveal">
          <summary>${escapeHtml(f.q)}</summary>
          <p>${escapeHtml(f.a)}</p>
        </details>
      `).join('')}
    </div>
  </div>
</section>

<section id="kontakt" class="contact-section">
  <div class="container">
    <div class="section-head center reveal">
      <span class="section-eyebrow">Kontakt</span>
      <h2 class="section-title">Wir sind <em>für Sie da</em>.</h2>
      <p class="section-lead">Tag und Nacht erreichbar. Persönliche Beratung kostenfrei und unverbindlich.</p>
    </div>
    <div class="contact-grid">
      <div class="contact-card reveal">
        <div class="lbl">Telefon · 24 / 7</div>
        <div class="val">${phone}</div>
      </div>
      <div class="contact-card reveal">
        <div class="lbl">E-Mail</div>
        <div class="val"><a href="mailto:${email}">${email}</a></div>
      </div>
      <div class="contact-card reveal">
        <div class="lbl">Anschrift</div>
        <div class="val">${address}</div>
      </div>
    </div>
  </div>
</section>

${renderPullQuote(pullQuote, spec.business_name)}

${renderQuietFooter({
  businessName: spec.business_name,
  tagline: spec.tagline,
  ctaText,
  ctaHref: '#kontakt',
  socials: spec.socials,
})}

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
