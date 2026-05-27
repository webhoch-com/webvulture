import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { SiteSpec } from './types.js';
import { getGalleryImage } from './templates/_media.js';

const PROJECTS_DIR = process.env.PROJECTS_DIR ?? '/tmp/wv-projects';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Convert any hex/rgb to OKLCH-like derived shades.
 * We just provide CSS custom properties; the browser handles color-mix.
 */
/**
 * Strict hex validation. The previous `startsWith('#')` check let
 * `#abc; } body { display:none } /*` through and would have allowed CSS
 * injection if `primary_color` ever bypassed the orchestrator's
 * `pickPrimaryColor` (e.g. via webhook tampering or future code paths
 * that set the spec directly). Allow only #RGB and #RRGGBB.
 */
const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function brandPalette(primary: string): string {
  const safe = HEX_COLOR_RE.test(primary) ? primary : '#6366f1';
  return `--primary: ${safe};
    --primary-50: color-mix(in oklch, ${safe} 8%, white);
    --primary-100: color-mix(in oklch, ${safe} 16%, white);
    --primary-200: color-mix(in oklch, ${safe} 30%, white);
    --primary-500: ${safe};
    --primary-700: color-mix(in oklch, ${safe} 80%, black);
    --primary-900: color-mix(in oklch, ${safe} 65%, black);
    --on-primary: color-mix(in oklch, ${safe} 5%, white);`;
}

/**
 * Initials avatar fallback for testimonials. Returns an inline SVG data-url.
 */
function avatarSvg(name: string, primary: string): string {
  const initials = name
    .split(/\s+/)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="48" height="48"><circle cx="32" cy="32" r="32" fill="${primary}"/><text x="32" y="40" text-anchor="middle" fill="white" font-family="Inter,sans-serif" font-weight="700" font-size="22">${escapeHtml(initials || '?')}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function defaultProcessSteps(layoutKind: string): Array<{ title: string; body: string }> {
  const generic = [
    { title: 'Erstgespräch', body: 'Wir hören zu — kostenlos, unverbindlich. 20 Minuten reichen, um Ihren Bedarf zu verstehen.' },
    { title: 'Angebot', body: 'Klare, faire Kalkulation auf einem Blatt. Keine versteckten Kosten, keine Stundensätze.' },
    { title: 'Umsetzung', body: 'Wir arbeiten zügig und transparent. Sie sehen jeden Fortschritt, bevor wir live gehen.' },
    { title: 'Begleitung', body: 'Auch nach Abschluss bleiben wir Ansprechpartner. Schnelle Reaktion, ehrliche Beratung.' },
  ];
  const presets: Record<string, Array<{ title: string; body: string }>> = {
    arzt: [
      { title: 'Termin vereinbaren', body: 'Online über das Formular oder telefonisch. Wir bestätigen innerhalb eines Werktags.' },
      { title: 'Anamnese', body: 'In Ruhe besprechen wir Ihre Beschwerden und bisherige Befunde.' },
      { title: 'Untersuchung', body: 'Sorgfältige Diagnostik mit moderner Ausstattung. Wir erklären jeden Schritt.' },
      { title: 'Behandlung & Nachsorge', body: 'Klarer Behandlungsplan, persönliche Begleitung — auch zwischen den Terminen.' },
    ],
    handwerk: [
      { title: 'Vor-Ort-Termin', body: 'Wir kommen kostenlos zu Ihnen, schauen uns alles an und beraten ehrlich.' },
      { title: 'Festpreis-Angebot', body: 'Schriftlich, transparent — Sie wissen vorher, was es kostet.' },
      { title: 'Sauberes Arbeiten', body: 'Pünktlich, freundlich, mit Respekt vor Ihren Räumen.' },
      { title: 'Garantie & Service', body: 'Ein Anruf — und wir sind wieder da. Auch Jahre später.' },
    ],
    kanzlei: [
      { title: 'Erstgespräch', body: 'In vertraulichem Rahmen klären wir Ihre Situation und mögliche Wege.' },
      { title: 'Strategie', body: 'Wir empfehlen den effizientesten Weg — auch wenn das gegen ein Mandat spricht.' },
      { title: 'Umsetzung', body: 'Sorgfältige Bearbeitung, klare Dokumentation, kalkulierte Schritte.' },
      { title: 'Abschluss', body: 'Vollständige Übergabe aller Unterlagen, Nachbetreuung bei Folgefragen.' },
    ],
    restaurant: [
      { title: 'Reservieren', body: 'Online oder per Telefon — auch für größere Gruppen und Feste.' },
      { title: 'Ankommen', body: 'Persönliche Begrüßung, Empfehlung des Tages, gemütliche Atmosphäre.' },
      { title: 'Genießen', body: 'Frische Küche aus regionalen Zutaten, sorgsam zubereitet.' },
      { title: 'Wiederkommen', body: 'Stammgäste-Vorteile, saisonale Specials, persönliche Einladungen.' },
    ],
    verein: [
      { title: 'Probe besuchen', body: 'Schnuppern Sie unverbindlich — Mittwoch ab 19:30 Uhr im Probelokal.' },
      { title: 'Kennenlernen', body: 'Lernen Sie unseren Vorstand und das Vereinsleben kennen.' },
      { title: 'Beitritt', body: 'Förder- oder aktive Mitgliedschaft — Sie wählen, wie viel Zeit Sie einbringen wollen.' },
      { title: 'Dabei sein', body: 'Konzerte, Feste, Ausflüge — Tradition und Gemeinschaft das ganze Jahr.' },
    ],
    bestattung: [
      { title: 'Erstkontakt', body: '24 Stunden erreichbar. Wir kommen zu Ihnen, wann immer Sie uns brauchen.' },
      { title: 'Begleitung', body: 'Wir nehmen Behördengänge, Organisation und Formalitäten ab.' },
      { title: 'Würdige Gestaltung', body: 'Persönliche Trauerfeier nach Ihren Wünschen und Werten.' },
      { title: 'Nachsorge', body: 'Auch nach der Trauerfeier sind wir für Sie da. Auf Wunsch über Monate hinweg.' },
    ],
  };
  return presets[layoutKind] ?? generic;
}

function defaultFaqs(layoutKind: string): Array<{ question: string; answer: string }> {
  const generic = [
    { question: 'Was kostet eine Erstberatung?', answer: 'Das Erstgespräch ist immer kostenlos und unverbindlich. Wir nehmen uns Zeit, Ihren Bedarf zu verstehen, bevor irgendwelche Kosten entstehen.' },
    { question: 'Wie schnell bekomme ich eine Antwort?', answer: 'Anfragen über das Formular oder per E-Mail beantworten wir in der Regel binnen eines Werktags, oft schneller.' },
    { question: 'Sind die Preise transparent?', answer: 'Ja. Wir arbeiten mit Festpreisen oder klar kommunizierten Aufwandsschätzungen. Keine versteckten Zusatzkosten.' },
    { question: 'Gibt es eine Geld-zurück-Garantie?', answer: 'Wenn Sie mit dem Ergebnis nicht zufrieden sind, finden wir gemeinsam eine faire Lösung. Ihre Empfehlung ist uns wichtiger als ein einzelner Auftrag.' },
    { question: 'Wo finde ich Referenzen?', answer: 'Auf Anfrage stellen wir Ihnen gerne Kontakt zu zufriedenen Kundinnen und Kunden her — direkter als jede Online-Bewertung.' },
  ];
  return generic;
}

function defaultTrustFacts(layoutKind: string): Array<{ label: string; value: string }> {
  const presets: Record<string, Array<{ label: string; value: string }>> = {
    arzt: [
      { value: '20+', label: 'Jahre Praxiserfahrung' },
      { value: '< 7 Tage', label: 'Wartezeit auf Termine' },
      { value: '100%', label: 'Diskretion' },
      { value: 'Kasse + Privat', label: 'Alle Versicherungen' },
    ],
    handwerk: [
      { value: '15+', label: 'Jahre Meisterbetrieb' },
      { value: '500+', label: 'Aufträge realisiert' },
      { value: 'Festpreis', label: 'Garantiert' },
      { value: '5 Jahre', label: 'Gewährleistung' },
    ],
    kanzlei: [
      { value: '20+', label: 'Jahre Erfahrung' },
      { value: 'Erstberatung', label: 'Kostenfrei' },
      { value: 'Diskret', label: 'Mandantenschutz' },
      { value: 'Spezialisiert', label: 'Wirtschaftsrecht' },
    ],
    restaurant: [
      { value: '4,8 ★', label: 'Google-Bewertung' },
      { value: 'Saisonal', label: 'Frische Küche' },
      { value: 'Regional', label: 'Lieferanten' },
      { value: '7 Tage', label: 'Geöffnet' },
    ],
    verein: [
      { value: '100+', label: 'Jahre Tradition' },
      { value: '60+', label: 'Aktive Mitglieder' },
      { value: '12+', label: 'Auftritte pro Jahr' },
      { value: 'Jugend', label: 'Eigene Ausbildung' },
    ],
    bestattung: [
      { value: '24/7', label: 'Erreichbarkeit' },
      { value: '40+', label: 'Jahre Erfahrung' },
      { value: 'Persönlich', label: 'Begleitung' },
      { value: 'Vorsorge', label: 'Beratung' },
    ],
  };
  return presets[layoutKind] ?? [
    { value: '5+', label: 'Jahre Erfahrung' },
    { value: '50+', label: 'Zufriedene Kunden' },
    { value: 'Fair', label: 'Transparente Preise' },
    { value: '< 24h', label: 'Antwortzeit' },
  ];
}

function renderTrustBar(facts: Array<{ label: string; value: string }>): string {
  const icons = ['⊕', '⊕', '⊕', '⊕']; // visual stub — reasonable spacing
  void icons;
  return `
  <section class="trust-bar" aria-label="Zahlen &amp; Fakten">
    <div class="trust-bar-inner">
      ${facts.map(f => `
        <div class="trust-fact">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <span><strong>${escapeHtml(f.value)}</strong> · ${escapeHtml(f.label)}</span>
        </div>
      `).join('')}
    </div>
  </section>`;
}

function renderProcessSection(steps: Array<{ title: string; body: string }>, layoutKind: string): string {
  const head = layoutKind === 'verein' ? 'So werden Sie Teil von uns'
             : layoutKind === 'arzt' ? 'Ihr Weg zu uns'
             : layoutKind === 'bestattung' ? 'Wie wir Sie begleiten'
             : layoutKind === 'kanzlei' ? 'Wie wir arbeiten'
             : layoutKind === 'handwerk' ? 'So läuft Ihr Auftrag ab'
             : 'So arbeiten wir';
  const eyebrow = layoutKind === 'verein' ? 'Mitgliedschaft' : 'Ablauf';
  return `
  <section class="process-section">
    <div class="container">
      <div class="section-head reveal">
        <span class="eyebrow">${escapeHtml(eyebrow)}</span>
        <h2>${escapeHtml(head)}</h2>
      </div>
      <div class="process-grid">
        ${steps.map((s, i) => `
          <article class="process-step reveal" style="animation-delay: ${i * 60}ms">
            <span class="step-num">${i + 1}</span>
            <h4>${escapeHtml(s.title)}</h4>
            <p>${escapeHtml(s.body)}</p>
          </article>
        `).join('')}
      </div>
    </div>
  </section>`;
}

function renderFaqSection(faqs: Array<{ question: string; answer: string }>): string {
  return `
  <section class="faq-section" id="faq">
    <div class="container">
      <div class="section-head reveal">
        <span class="eyebrow">Häufig gefragt</span>
        <h2>Alles, was Sie vorab wissen wollen</h2>
      </div>
      <div class="faq-list">
        ${faqs.map((f, i) => `
          <details class="faq-item reveal" ${i === 0 ? 'open' : ''}>
            <summary>${escapeHtml(f.question)}</summary>
            <div class="faq-body">${escapeHtml(f.answer)}</div>
          </details>
        `).join('')}
      </div>
    </div>
  </section>`;
}

/**
 * Effectively dead code — `layout_kind === 'verein'` now routes through
 * `templates/verein.ts` which uses the strict `getGalleryImage()` helper
 * from `_media.ts`. We keep this stub purely so any orphan `renderAstroPage`
 * call paths don't crash; gallery rendering is delegated to the safe helper.
 *
 * Previously this function inlined `gallery[i]` directly into `<img src>`
 * with no escape, which would have been stored XSS the moment a future
 * code path reactivated it with attacker-controlled `gallery` URLs.
 */
function renderVereinGallery(spec?: SiteSpec, slug?: string): string {
  if (!spec || !slug) return '';
  const count = spec.media?.gallery?.length ?? 0;
  if (count === 0) return '';
  const items: string[] = [];
  for (let i = 0; i < Math.min(count, 6); i++) {
    const src = getGalleryImage(spec, slug, i, 600, 400);
    if (!src) continue;
    items.push(`
    <div class="gallery-item reveal" style="animation-delay: ${i * 60}ms">
      <img src="${src}"
           alt="Vereinsleben — Eindruck ${i + 1}"
           loading="lazy" decoding="async"
           width="600" height="400" />
    </div>`);
  }
  return items.join('\n');
}

function renderTeamSection(team: Array<{ name: string; role: string; seed?: string }>): string {
  if (! team.length) return '';
  return `
  <section id="team" class="section-padded section-alt">
    <div class="container">
      <div class="section-head reveal">
        <span class="eyebrow">Vorstand &amp; Team</span>
        <h2>Die Menschen hinter dem Verein</h2>
      </div>
      <div class="team-grid">
        ${team.map((m, i) => `
          <article class="team-card reveal" style="animation-delay: ${i * 80}ms">
            <div class="team-avatar" aria-hidden="true">
              <img src="https://picsum.photos/seed/${m.seed ?? 'verein-' + (i + 1)}/200/200"
                   alt="" width="120" height="120" loading="lazy" />
            </div>
            <h4>${escapeHtml(m.name)}</h4>
            <p class="team-role">${escapeHtml(m.role)}</p>
          </article>
        `).join('')}
      </div>
    </div>
  </section>`;
}

function renderServiceCard(s: SiteSpec['services'][number], idx: number, layoutKind: string = 'standard'): string {
  const priceTag = s.price
    ? `<div class="service-price">${escapeHtml(s.price)}</div>`
    : '';
  // Verein, Kanzlei, Bestattung: more professional, no emoji, accent dot instead.
  const useDot = ['verein', 'kanzlei', 'bestattung', 'arzt', 'energie'].includes(layoutKind);

  return `
    <article class="service-card reveal" data-reveal-delay="${idx * 80}">
      <div class="service-icon-wrap">
        ${useDot
          ? `<span class="service-dot" aria-hidden="true"></span>`
          : `<span class="service-icon">${s.icon ? escapeHtml(s.icon) : '✦'}</span>`}
      </div>
      <h3>${escapeHtml(s.name)}</h3>
      <p>${escapeHtml(s.description)}</p>
      ${priceTag}
    </article>`;
}

function renderTestimonialCard(t: { quote: string; author: string }, primary: string): string {
  return `
    <figure class="testimonial reveal">
      <div class="quote-mark" aria-hidden="true">"</div>
      <blockquote>${escapeHtml(t.quote)}</blockquote>
      <figcaption>
        <img src="${avatarSvg(t.author, primary)}" alt="" loading="lazy" />
        <span>${escapeHtml(t.author)}</span>
      </figcaption>
    </figure>`;
}

function renderMenuSection(menu: NonNullable<SiteSpec['menu']>): string {
  const cats = menu
    .map(
      (cat, ci) => `
      <div class="menu-category reveal" data-reveal-delay="${ci * 100}">
        <h3>${escapeHtml(cat.category)}</h3>
        <ul class="menu-items">
          ${cat.items
            .map(
              (i) => `
            <li>
              <div class="menu-item-head">
                <strong>${escapeHtml(i.name)}</strong>
                ${i.price ? `<span class="menu-price">${escapeHtml(i.price)}</span>` : ''}
              </div>
              ${i.description ? `<div class="menu-item-desc">${escapeHtml(i.description)}</div>` : ''}
            </li>`,
            )
            .join('')}
        </ul>
      </div>`,
    )
    .join('');
  return `
<section id="speisekarte" class="branch-section section-padded">
  <div class="container">
    <div class="section-head reveal">
      <span class="eyebrow">Genuss</span>
      <h2>Unsere Speisekarte</h2>
    </div>
    <div class="menu-grid">${cats}</div>
  </div>
</section>`;
}

function renderOpeningHoursSection(hours: NonNullable<SiteSpec['opening_hours']>, title = 'Öffnungszeiten'): string {
  const rows = hours
    .map(
      (h, i) => `
      <li class="reveal" data-reveal-delay="${i * 50}">
        <span class="day">${escapeHtml(h.day)}</span>
        <span class="dotted"></span>
        <span class="hours">${escapeHtml(h.hours)}</span>
      </li>`,
    )
    .join('');
  return `
<section id="oeffnungszeiten" class="branch-section section-padded hours-block">
  <div class="container container-narrow">
    <div class="section-head reveal">
      <span class="eyebrow">${title === 'Sprechzeiten' ? 'Erreichbarkeit' : 'Wann wir da sind'}</span>
      <h2>${escapeHtml(title)}</h2>
    </div>
    <ul class="hours-list">${rows}</ul>
  </div>
</section>`;
}

function renderEmergencyBanner(emergency: NonNullable<SiteSpec['emergency']>): string {
  if (!emergency.available) return '';
  return `
<div class="emergency-banner">
  <span class="emergency-pulse" aria-hidden="true"></span>
  <strong>Notdienst</strong>
  ${emergency.note ? `<span class="emergency-note">${escapeHtml(emergency.note)}</span>` : ''}
  ${emergency.phone ? `<a href="tel:${escapeHtml(emergency.phone.replace(/\s/g, ''))}" class="emergency-phone"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>${escapeHtml(emergency.phone)}</a>` : ''}
</div>`;
}

function renderEventsSection(events: NonNullable<SiteSpec['events']>): string {
  const items = events
    .map(
      (e, i) => `
      <li class="event-item reveal" data-reveal-delay="${i * 100}">
        <time>${escapeHtml(e.date)}</time>
        <div class="event-body">
          <strong>${escapeHtml(e.title)}</strong>
          ${e.description ? `<p>${escapeHtml(e.description)}</p>` : ''}
        </div>
        <span class="event-arrow" aria-hidden="true">→</span>
      </li>`,
    )
    .join('');
  return `
<section id="termine" class="branch-section section-padded">
  <div class="container">
    <div class="section-head reveal">
      <span class="eyebrow">Programm</span>
      <h2>Anstehende Termine</h2>
    </div>
    <ul class="events-list">${items}</ul>
  </div>
</section>`;
}

function renderMembershipSection(membership: NonNullable<SiteSpec['membership']>): string {
  return `
<section class="membership-section section-padded">
  <div class="container container-narrow">
    <div class="membership-card reveal">
      <span class="eyebrow">Werden Sie Teil von uns</span>
      <h2>Mitglied werden</h2>
      <p>${escapeHtml(membership.description)}</p>
      <a href="#kontakt" class="btn btn-primary btn-lg">${escapeHtml(membership.cta)} →</a>
    </div>
  </div>
</section>`;
}

function renderAstroPage(spec: SiteSpec, slug: string, previewBaseDomain: string): string {
  const layoutKind = spec.layout_kind ?? 'standard';
  const services = spec.services
    .map((s, i) => renderServiceCard(s, i, layoutKind))
    .join('\n');

  const testimonialCards =
    spec.testimonials
      ?.map((t) => renderTestimonialCard(t, spec.brand.primary_color))
      .join('\n') ?? '';

  const description = spec.tagline
    ? `${spec.business_name} — ${spec.tagline}`
    : spec.hero.subheadline;
  const ogTitle = `${spec.business_name} — ${spec.tagline}`.slice(0, 90);
  const fullUrl = `https://${slug}.${previewBaseDomain}/`;
  const heroSubject = encodeURIComponent(layoutKind === 'restaurant' ? 'restaurant interior' : layoutKind === 'friseur' ? 'hair salon' : layoutKind === 'handwerk' ? 'craftsmanship workshop' : layoutKind === 'arzt' ? 'medical practice' : layoutKind === 'verein' ? 'community gathering' : 'business');

  // Stat block — animates the rating/review counts on scroll
  const stats: Array<{ value: string; label: string; suffix?: string; numeric?: boolean }> = [];
  if (typeof spec === 'object') {
    // We expose business stats via spec.brand.tone hint — but we can use defaults from spec metadata.
    // Hardcoded common stats from rebuild package would be plumbed via spec metadata; fallbacks here.
  }

  const HEADING_MAP: Record<string, { eyebrow: string; heading: string }> = {
    arzt: { eyebrow: 'Medizinische Leistungen', heading: 'Behandlungsschwerpunkte' },
    handwerk: { eyebrow: 'Leistungsspektrum', heading: 'Unsere Leistungen' },
    verein: { eyebrow: 'Was wir machen', heading: 'Vereinsangebote' },
    restaurant: { eyebrow: 'Auf einen Blick', heading: 'Was wir anbieten' },
    friseur: { eyebrow: 'Behandlungen', heading: 'Unsere Leistungen' },
    kanzlei: { eyebrow: 'Beratungsschwerpunkte', heading: 'Rechtsgebiete & Beratung' },
    hotel: { eyebrow: 'Unser Haus', heading: 'Zimmer & Angebote' },
    fitness: { eyebrow: 'Programm', heading: 'Unsere Kurse' },
    einzelhandel: { eyebrow: 'Unser Sortiment', heading: 'Was Sie bei uns finden' },
    galerie: { eyebrow: 'Portfolio', heading: 'Unsere Arbeiten' },
    autohaus: { eyebrow: 'Aktuelle Angebote', heading: 'Unsere Highlights' },
    energie: { eyebrow: 'Lösungen', heading: 'Unsere Leistungen' },
    bestattung: { eyebrow: 'Unsere Leistungen', heading: 'Wir begleiten Sie' },
    tier: { eyebrow: 'Angebote', heading: 'Unsere Leistungen' },
    standard: { eyebrow: 'Was wir bieten', heading: 'Unsere Leistungen' },
  };
  const sectionHeadingLeistungen = HEADING_MAP[layoutKind]?.heading ?? 'Unsere Leistungen';
  const eyebrowLeistungen = HEADING_MAP[layoutKind]?.eyebrow ?? 'Was wir bieten';

  const navLeistungen =
    layoutKind === 'restaurant' ? 'Speisekarte'
    : layoutKind === 'verein' ? 'Termine'
    : layoutKind === 'arzt' ? 'Behandlungen'
    : layoutKind === 'kanzlei' ? 'Rechtsgebiete'
    : layoutKind === 'hotel' ? 'Zimmer'
    : layoutKind === 'fitness' ? 'Kurse'
    : layoutKind === 'einzelhandel' ? 'Sortiment'
    : layoutKind === 'galerie' ? 'Portfolio'
    : layoutKind === 'autohaus' ? 'Angebote'
    : layoutKind === 'bestattung' ? 'Begleitung'
    : 'Leistungen';

  // Bestattung: override colors to muted/calming palette for sensitivity
  const isBestattung = layoutKind === 'bestattung';

  // Tone classification — drives data-tone on <body> and influences typography variants.
  // Classical = centred, refined, calmer motion (legal/medical/community/heritage).
  // Modern = asymmetric, dynamic, gradient-highlight allowed (lifestyle/creative/retail).
  const classicalKinds = new Set(['kanzlei', 'bestattung', 'arzt', 'verein', 'hotel', 'autohaus', 'handwerk']);
  const tone = classicalKinds.has(layoutKind) ? 'classical' : 'modern';

  // Highlight last 1–3 words of the hero headline with gradient (modern tones only).
  const heroHeadlineHtml = (() => {
    const headline = spec.hero.headline.trim();
    if (tone === 'classical') return escapeHtml(headline);
    const words = headline.split(/\s+/);
    if (words.length < 3) return escapeHtml(headline);
    const splitAt = words.length > 6 ? Math.max(words.length - 2, 4) : Math.max(words.length - 1, 2);
    const first = words.slice(0, splitAt).join(' ');
    const last = words.slice(splitAt).join(' ');
    return `${escapeHtml(first)} <em>${escapeHtml(last)}</em>`;
  })();

  return `---
// Auto-generated by Webseiten-Werkstatt — do not edit manually
const spec = ${JSON.stringify(spec, null, 2)};
---
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(spec.business_name)} — ${escapeHtml(spec.tagline)}</title>
  <meta name="description" content="${escapeHtml(description.slice(0, 160))}" />
  <meta name="robots" content="noindex, nofollow" />
  <meta name="generator" content="Webseiten-Werkstatt" />
  <meta name="theme-color" content="${escapeHtml(spec.brand.primary_color)}" />

  <meta property="og:type" content="website" />
  <meta property="og:title" content="${escapeHtml(ogTitle)}" />
  <meta property="og:description" content="${escapeHtml(description.slice(0, 200))}" />
  <meta property="og:url" content="${escapeHtml(fullUrl)}" />
  <meta property="og:locale" content="de_AT" />

  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="${escapeHtml(ogTitle)}" />
  <meta name="twitter:description" content="${escapeHtml(description.slice(0, 200))}" />

  ${spec.media?.favicon
    ? `<link rel="icon" href="${escapeHtml(spec.media.favicon)}" /><link rel="apple-touch-icon" href="${escapeHtml(spec.media.favicon)}" />`
    : `<link rel="icon" href="data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><circle cx='12' cy='12' r='10' fill='${HEX_COLOR_RE.test(spec.brand.primary_color) ? spec.brand.primary_color : '#6366f1'}'/></svg>`)}" />`
  }

  <link rel="preconnect" href="https://fonts.bunny.net" crossorigin>
  <link href="https://fonts.bunny.net/css?family=bricolage-grotesque:400,500,600,700,800|inter:400,500,600,700&display=swap" rel="stylesheet">

  <style>
    :root {
      ${isBestattung ? brandPalette('#5d6b7c') : brandPalette(spec.brand.primary_color)}
      --bg: ${isBestattung ? '#f8f7f5' : '#fafafa'};
      --bg-2: ${isBestattung ? '#eeece8' : '#f3f4f6'};
      --surface: ${isBestattung ? '#ffffff' : '#ffffff'};
      --ink: ${isBestattung ? '#2c2e33' : '#0a0a0a'};
      --ink-2: ${isBestattung ? '#5b6470' : '#4b5563'};
      --ink-3: ${isBestattung ? '#9ca5b3' : '#9ca3af'};
      --border: rgba(10, 10, 10, 0.08);
      --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.04);
      --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
      --shadow-lg: 0 20px 50px -10px rgba(0, 0, 0, 0.15);
      --shadow-xl: 0 30px 80px -15px rgba(0, 0, 0, 0.25);
      --radius-sm: 8px;
      --radius: 16px;
      --radius-lg: 24px;
      --radius-xl: 32px;
      --easing: cubic-bezier(0.16, 1, 0.3, 1);
      --easing-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
      --display: 'Bricolage Grotesque', system-ui, sans-serif;
      --sans: 'Inter', system-ui, -apple-system, sans-serif;
      --container: 1200px;
      --section-padding: clamp(4rem, 8vw, 8rem);
    }

    /* No automatic dark-mode — light is the canonical brand experience for client demos. */
    /* Reduced motion still respected via @media (prefers-reduced-motion). */

    * { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body {
      font-family: var(--sans);
      color: var(--ink);
      background: var(--bg);
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      overflow-x: hidden;
    }

    img { display: block; max-width: 100%; }
    a { color: inherit; text-decoration: none; }

    .container { max-width: var(--container); margin: 0 auto; padding: 0 clamp(1.25rem, 4vw, 2.5rem); }
    .container-narrow { max-width: 760px; }
    .section-padded { padding: var(--section-padding) 0; }

    /* ─── Typography ─────────────────────────────────────── */
    h1, h2, h3, h4 { font-family: var(--display); font-weight: 700; line-height: 1.05; letter-spacing: -0.02em; color: var(--ink); }
    h1 { font-size: clamp(2.5rem, 7vw, 5.5rem); font-weight: 800; letter-spacing: -0.03em; }
    h2 { font-size: clamp(2rem, 4.5vw, 3.5rem); margin-bottom: 1rem; }
    h3 { font-size: clamp(1.1rem, 1.6vw, 1.35rem); margin-bottom: 0.5rem; }
    p { color: var(--ink-2); }
    .lead { font-size: clamp(1.05rem, 1.4vw, 1.25rem); color: var(--ink-2); }

    .eyebrow {
      display: inline-block; font-family: var(--sans); font-weight: 600;
      font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.12em;
      color: var(--primary-700); padding: 0.4rem 0.9rem; border-radius: 999px;
      background: var(--primary-50); margin-bottom: 1.25rem;
      border: 1px solid color-mix(in oklch, var(--primary) 18%, transparent);
    }

    .section-head { text-align: center; max-width: 720px; margin: 0 auto 4rem; }
    .section-head p { font-size: 1.05rem; margin-top: 0.75rem; }

    /* ─── Buttons ────────────────────────────────────────── */
    .btn {
      display: inline-flex; align-items: center; gap: 0.5rem;
      padding: 0.95rem 1.75rem; border-radius: 999px; font-weight: 600; font-size: 0.95rem;
      transition: transform 0.25s var(--easing-spring), box-shadow 0.25s var(--easing), background 0.2s ease;
      cursor: pointer; border: none; font-family: var(--sans);
      will-change: transform;
    }
    .btn-primary {
      background: linear-gradient(135deg, var(--primary), var(--primary-700));
      color: white; box-shadow: 0 10px 25px -8px color-mix(in oklch, var(--primary) 50%, transparent);
    }
    .btn-primary:hover { transform: translateY(-3px) scale(1.02); box-shadow: 0 18px 35px -8px color-mix(in oklch, var(--primary) 60%, transparent); }
    .btn-ghost { background: transparent; color: var(--ink); border: 1.5px solid var(--border); }
    .btn-ghost:hover { background: var(--bg-2); transform: translateY(-2px); }
    .btn-lg { padding: 1.1rem 2.25rem; font-size: 1.05rem; }
    .btn-outline-white {
      background: var(--surface); color: var(--ink); border: 1.5px solid var(--border);
    }
    .btn-outline-white:hover {
      background: color-mix(in oklch, var(--primary) 8%, var(--surface));
      color: var(--primary-700); border-color: color-mix(in oklch, var(--primary) 30%, transparent);
      transform: translateY(-2px);
    }

    /* ─── Hochmeir agency banner (top, non-sticky to avoid z-index conflict with site-nav) ── */
    .demo-banner {
      background: linear-gradient(90deg, #1a0a1f, #2a0d2a, #0a0a1f);
      color: #fff; padding: 0.55rem 1rem; font-size: 0.82rem;
      position: relative; z-index: 200; border-bottom: 1px solid rgba(236,101,186,0.35);
      letter-spacing: 0.01em;
    }
    .demo-banner-inner {
      max-width: 1280px; margin: 0 auto; display: flex; align-items: center; gap: 0.85rem;
      flex-wrap: wrap; justify-content: center; line-height: 1.5;
    }
    .demo-banner-tag {
      display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.7rem;
      letter-spacing: 0.16em; text-transform: uppercase;
      padding: 0.18rem 0.55rem; border-radius: 999px;
      background: rgba(236,101,186,0.22); border: 1px solid rgba(236,101,186,0.5);
      color: #ffd6ee; font-weight: 700; white-space: nowrap;
    }
    .demo-banner-text { color: rgba(255,255,255,0.92); }
    .demo-banner a {
      color: #ffb3df; text-decoration: none; font-weight: 700;
      border-bottom: 1px solid rgba(255,179,223,0.45); padding-bottom: 1px;
      transition: color .2s, border-color .2s;
    }
    .demo-banner a:hover { color: #fff; border-color: #fff; }
    @media (max-width: 640px) {
      .demo-banner { padding: 0.5rem 0.75rem; font-size: 0.74rem; }
      .demo-banner-tag { letter-spacing: 0.1em; }
    }

    /* ─── Nav ────────────────────────────────────────────── */
    nav.site-nav {
      position: sticky; top: 0; z-index: 90; backdrop-filter: blur(16px) saturate(180%);
      background: color-mix(in oklch, var(--bg) 80%, transparent);
      border-bottom: 1px solid transparent; transition: border-color 0.3s ease, background 0.3s ease;
    }
    nav.site-nav.scrolled { border-bottom-color: var(--border); }
    nav.site-nav .inner { display: flex; justify-content: space-between; align-items: center; padding: 1.1rem 0; gap: 2rem; }
    nav.site-nav .brand { font-family: var(--display); font-weight: 700; font-size: 1.2rem; color: var(--ink); display: flex; align-items: center; gap: 0.6rem; }
    nav.site-nav .brand-dot { width: 12px; height: 12px; border-radius: 4px; background: linear-gradient(135deg, var(--primary), var(--primary-700)); }
    nav.site-nav ul { list-style: none; display: flex; gap: 2rem; }
    nav.site-nav ul a { font-size: 0.92rem; font-weight: 500; color: var(--ink-2); transition: color 0.2s ease; }
    nav.site-nav ul a:hover { color: var(--primary); }
    nav.site-nav .nav-cta { display: none; }
    @media (min-width: 768px) { nav.site-nav .nav-cta { display: inline-flex; } nav.site-nav ul { gap: 2.5rem; } }
    @media (max-width: 640px) {
      nav.site-nav ul {
        display: flex; gap: 0.6rem; overflow-x: auto; flex-wrap: nowrap;
        padding: 0.4rem 0; -webkit-overflow-scrolling: touch;
        scrollbar-width: none;
      }
      nav.site-nav ul::-webkit-scrollbar { display: none; }
      nav.site-nav ul li { flex-shrink: 0; }
      nav.site-nav ul a { font-size: 0.85rem; padding: 0.3rem 0.5rem; }
      nav.site-nav .inner { gap: 0.75rem; padding: 0.7rem 0; flex-wrap: wrap; }
      nav.site-nav .brand { font-size: 1.05rem; }
    }

    /* ─── Hero — Light editorial canvas with subtle primary accents ── */
    .hero {
      position: relative; overflow: hidden;
      background: linear-gradient(180deg, var(--bg) 0%, color-mix(in oklch, var(--primary) 4%, var(--bg)) 100%);
      padding: clamp(5rem, 10vw, 9rem) 0 clamp(4rem, 7vw, 7rem);
    }
    .hero-bg {
      position: absolute; inset: 0; z-index: 0; pointer-events: none;
      background:
        radial-gradient(ellipse 60% 50% at 12% 20%, color-mix(in oklch, var(--primary) 14%, transparent) 0%, transparent 60%),
        radial-gradient(ellipse 50% 40% at 88% 80%, color-mix(in oklch, var(--primary-700) 10%, transparent) 0%, transparent 60%);
    }
    .hero-blob {
      position: absolute; border-radius: 50%;
      filter: blur(120px); opacity: 0.35;
      animation: blob-move 24s ease-in-out infinite;
    }
    .hero-blob.b1 { width: 480px; height: 480px; top: -180px; left: -120px; background: var(--primary); }
    .hero-blob.b2 { width: 560px; height: 560px; bottom: -200px; right: -180px; background: color-mix(in oklch, var(--primary-700) 60%, white); animation-delay: -8s; }
    .hero-blob.b3 { display: none; }
    @keyframes blob-move {
      0%, 100% { transform: translate(0, 0) scale(1); }
      50% { transform: translate(40px, -30px) scale(1.08); }
    }
    .hero-noise { display: none; }

    .hero-inner {
      position: relative; z-index: 1;
      max-width: 920px; margin: 0 auto; padding: 0 clamp(1.5rem, 4vw, 2.5rem);
      text-align: center;
    }
    .hero h1 {
      color: var(--ink); margin-bottom: 1.5rem;
      font-size: clamp(2.5rem, 5.5vw, 4.5rem);
      line-height: 1.05; letter-spacing: -0.035em;
      animation: fade-up 1s var(--easing) backwards 0.2s;
    }
    .hero h1 em {
      font-style: normal; color: var(--primary-700);
      background: linear-gradient(135deg, var(--primary), var(--primary-700));
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .hero p {
      color: var(--ink-2); font-size: clamp(1.05rem, 1.4vw, 1.25rem);
      max-width: 680px; margin: 0 auto 2.5rem; line-height: 1.6;
      animation: fade-up 1s var(--easing) backwards 0.4s;
    }
    .hero-cta-row {
      display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;
      animation: fade-up 1s var(--easing) backwards 0.6s;
    }
    @keyframes fade-up {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .hero-eyebrow {
      display: inline-block; padding: 0.42rem 1rem; border-radius: 999px;
      background: color-mix(in oklch, var(--primary) 8%, transparent);
      color: var(--primary-700); font-size: 0.78rem; font-weight: 600;
      letter-spacing: 0.14em; text-transform: uppercase;
      margin-bottom: 1.75rem;
      border: 1px solid color-mix(in oklch, var(--primary) 18%, transparent);
      animation: fade-up 1s var(--easing) backwards 0.05s;
    }

    .hero-scroll-indicator {
      position: absolute; bottom: 1.5rem; left: 50%; transform: translateX(-50%); z-index: 1;
      width: 26px; height: 40px; border: 2px solid color-mix(in oklch, var(--ink) 25%, transparent);
      border-radius: 13px;
      animation: fade-up 1s var(--easing) backwards 1.5s;
    }
    .hero-scroll-indicator::after {
      content: ''; position: absolute; top: 6px; left: 50%; transform: translateX(-50%);
      width: 3px; height: 7px; background: color-mix(in oklch, var(--ink) 40%, transparent); border-radius: 2px;
      animation: scroll-dot 1.8s ease-in-out infinite;
    }
    @keyframes scroll-dot {
      0% { transform: translate(-50%, 0); opacity: 1; }
      80% { transform: translate(-50%, 12px); opacity: 0; }
      100% { transform: translate(-50%, 0); opacity: 0; }
    }

    /* Classical-tone variant (kanzlei, bestattung, arzt, verein, hotel, autohaus, handwerk):
       cleaner, more centred typography, no gradient on h1, calmer blobs. */
    body[data-tone="classical"] .hero h1 em {
      background: none;
      -webkit-text-fill-color: var(--primary-700); color: var(--primary-700);
    }
    body[data-tone="classical"] .hero { padding-top: clamp(6rem, 12vw, 10rem); }
    body[data-tone="classical"] .hero-blob { opacity: 0.18; filter: blur(140px); }

    /* Wave divider between hero and content */
    .wave-divider { position: relative; margin-top: -1px; line-height: 0; }
    .wave-divider svg { width: 100%; height: 80px; display: block; }

    /* ─── Reveal animation system ─────────────────────────── */
    .reveal { opacity: 0; transform: translateY(28px); transition: opacity 0.8s var(--easing), transform 0.8s var(--easing); }
    .reveal.is-visible { opacity: 1; transform: translateY(0); }
    @media (prefers-reduced-motion: reduce) {
      .reveal, .hero h1, .hero p, .hero-cta-row, .hero-eyebrow, .hero-scroll-indicator { opacity: 1 !important; transform: none !important; animation: none !important; }
    }

    /* ─── Stats ──────────────────────────────────────────── */
    .stats-strip {
      background: var(--surface); padding: 3rem 1.5rem;
      border-bottom: 1px solid var(--border);
    }
    .stats-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 2rem; max-width: 1100px; margin: 0 auto; text-align: center;
    }
    .stat .stat-num {
      font-family: var(--display); font-weight: 700; font-size: clamp(2.2rem, 4vw, 3rem);
      background: linear-gradient(135deg, var(--primary), var(--primary-700));
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      background-clip: text; line-height: 1;
    }
    .stat .stat-label { font-size: 0.85rem; color: var(--ink-3); margin-top: 0.5rem; letter-spacing: 0.05em; text-transform: uppercase; font-weight: 500; }

    /* ─── Services ───────────────────────────────────────── */
    .services-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr));
      gap: 1.5rem; max-width: 1200px; margin-inline: auto;
    }
    @media (min-width: 900px) {
      /* Lock to 3 columns at desktop — service count is always 3 or 6 to avoid orphan rows. */
      .services-grid { grid-template-columns: repeat(3, 1fr); }
    }
    .service-card {
      position: relative; background: var(--surface); border-radius: var(--radius-lg);
      padding: 2.25rem 2rem; border: 1px solid var(--border);
      transition: transform 0.4s var(--easing), box-shadow 0.4s var(--easing), border-color 0.3s ease;
      will-change: transform;
    }
    .service-card:hover {
      transform: translateY(-6px);
      box-shadow: var(--shadow-lg);
      border-color: color-mix(in oklch, var(--primary) 25%, transparent);
    }
    .service-icon-wrap {
      width: 56px; height: 56px; border-radius: var(--radius);
      background: linear-gradient(135deg, var(--primary-50), color-mix(in oklch, var(--primary) 25%, white));
      display: flex; align-items: center; justify-content: center; font-size: 1.6rem;
      margin-bottom: 1.25rem;
      transition: transform 0.4s var(--easing-spring);
    }
    .service-card:hover .service-icon-wrap { transform: rotate(-8deg) scale(1.05); }
    .service-card p { font-size: 0.95rem; color: var(--ink-2); }
    .service-price { margin-top: 1.25rem; font-family: var(--display); font-weight: 700; color: var(--primary-700); font-size: 1.05rem; }

    /* Professional service-dot (verein, kanzlei, bestattung, arzt, energie) */
    .service-dot {
      width: 10px; height: 10px; border-radius: 50%;
      background: var(--primary); box-shadow: 0 0 0 4px color-mix(in oklch, var(--primary) 18%, transparent);
      display: inline-block;
    }
    .service-card .service-icon-wrap:has(.service-dot) {
      width: 36px; height: 36px;
      background: transparent; box-shadow: none;
    }

    /* ─── Verein-only: Galerie ───────────────────────────── */
    .gallery-section { background: var(--bg-2); }
    .gallery-grid {
      display: grid; gap: 1rem;
      grid-template-columns: repeat(auto-fit, minmax(min(240px, 100%), 1fr));
      max-width: 1200px; margin: 0 auto;
    }
    @media (min-width: 900px) {
      .gallery-grid { grid-template-columns: repeat(3, 1fr); }
    }
    .gallery-item {
      aspect-ratio: 3 / 2; overflow: hidden; border-radius: var(--radius-lg);
      box-shadow: var(--shadow);
      transition: transform .4s var(--easing);
    }
    .gallery-item img { width: 100%; height: 100%; object-fit: cover; display: block;
      transition: transform .8s ease; }
    .gallery-item:hover { transform: translateY(-4px); }
    .gallery-item:hover img { transform: scale(1.06); }

    /* ─── Verein-only: Vorstand/Team ─────────────────────── */
    .team-grid {
      display: grid; gap: 1.75rem;
      grid-template-columns: repeat(auto-fit, minmax(min(180px, 100%), 1fr));
      max-width: 1100px; margin: 0 auto;
    }
    @media (min-width: 900px) {
      .team-grid { grid-template-columns: repeat(3, 1fr); }
    }
    .team-card {
      text-align: center; padding: 1.5rem 1rem;
      background: var(--surface); border-radius: var(--radius-lg);
      border: 1px solid var(--border);
    }
    .team-avatar { width: 96px; height: 96px; margin: 0 auto 1rem; border-radius: 50%; overflow: hidden;
      box-shadow: 0 0 0 4px color-mix(in oklch, var(--primary) 12%, transparent); }
    .team-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .team-card h4 { font-family: var(--display); font-size: 1.05rem; margin: 0 0 0.25rem 0; }
    .team-role { font-size: 0.85rem; color: var(--ink-3); margin: 0; }

    /* ─── About ──────────────────────────────────────────── */
    .about-section { background: var(--bg-2); position: relative; overflow: hidden; }
    .about-section::before {
      content: ''; position: absolute; right: -200px; top: -200px; width: 500px; height: 500px;
      background: radial-gradient(circle, color-mix(in oklch, var(--primary) 30%, transparent), transparent 70%);
      filter: blur(80px); pointer-events: none;
    }
    .about-grid {
      display: grid; gap: 3rem; align-items: center; position: relative;
    }
    @media (min-width: 900px) {
      .about-grid { grid-template-columns: 1fr 1fr; gap: 5rem; }
    }
    .about-image-wrap {
      aspect-ratio: 4 / 5; border-radius: var(--radius-xl); overflow: hidden; position: relative;
      background: linear-gradient(135deg, var(--primary), var(--primary-700));
      box-shadow: var(--shadow-xl);
    }
    .about-image-wrap::before {
      content: ''; position: absolute; inset: 0;
      background:
        radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.3), transparent 50%),
        radial-gradient(ellipse at 70% 80%, color-mix(in oklch, var(--primary-900) 50%, transparent), transparent 50%);
    }
    .about-image-wrap::after {
      content: '${spec.business_name.charAt(0).toUpperCase()}';
      position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
      font-family: var(--display); font-size: 14rem; font-weight: 800; color: rgba(255,255,255,0.35);
    }
    .about-text p { font-size: 1.05rem; line-height: 1.8; }

    /* ─── Testimonials ───────────────────────────────────── */
    .testimonials-section { position: relative; }
    .testimonials-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(320px, 100%), 1fr)); gap: 1.5rem; }
    .testimonial {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--radius-lg); padding: 2.5rem 2rem; position: relative;
      transition: transform 0.3s var(--easing), box-shadow 0.3s var(--easing);
    }
    .testimonial:hover { transform: translateY(-4px); box-shadow: var(--shadow-lg); }
    .testimonial .quote-mark {
      position: absolute; top: -1.5rem; left: 1.5rem;
      font-family: var(--display); font-size: 5rem; line-height: 1; color: var(--primary);
      opacity: 0.18;
    }
    .testimonial blockquote { font-style: normal; font-size: 1rem; line-height: 1.7; color: var(--ink); margin-bottom: 1.5rem; }
    .testimonial figcaption { display: flex; align-items: center; gap: 0.85rem; padding-top: 1rem; border-top: 1px solid var(--border); }
    .testimonial figcaption img { width: 44px; height: 44px; border-radius: 50%; }
    .testimonial figcaption span { font-weight: 600; color: var(--ink-2); font-size: 0.9rem; }

    /* ─── Branch sections ────────────────────────────────── */
    .branch-section { background: var(--bg); }
    .branch-section:nth-of-type(odd) { background: var(--bg-2); }

    .menu-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(320px, 100%), 1fr)); gap: 2.5rem; }
    .menu-category {
      background: var(--surface); border-radius: var(--radius-lg);
      padding: 2rem; border: 1px solid var(--border);
    }
    .menu-category h3 {
      font-size: 1.5rem; font-weight: 700; margin-bottom: 1.5rem;
      padding-bottom: 0.85rem; border-bottom: 2px solid var(--primary);
      display: flex; justify-content: space-between; align-items: center;
    }
    .menu-items { list-style: none; padding: 0; }
    .menu-items li { padding: 0.85rem 0; border-bottom: 1px dashed var(--border); }
    .menu-items li:last-child { border-bottom: none; }
    .menu-item-head { display: flex; justify-content: space-between; align-items: baseline; gap: 1rem; }
    .menu-item-head strong { font-weight: 600; font-size: 1rem; }
    .menu-price { font-family: var(--display); font-weight: 700; color: var(--primary-700); white-space: nowrap; font-size: 1rem; }
    .menu-item-desc { font-size: 0.85rem; color: var(--ink-3); margin-top: 0.35rem; }

    .hours-block { background: var(--bg-2); }
    .hours-list { list-style: none; padding: 0; max-width: 520px; margin: 0 auto; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); overflow: hidden; }
    .hours-list li { display: flex; align-items: center; gap: 0.5rem; padding: 0.95rem 1.5rem; border-bottom: 1px solid var(--border); font-size: 0.95rem; }
    .hours-list li:last-child { border-bottom: none; }
    .hours-list .day { font-weight: 600; min-width: 110px; }
    .hours-list .dotted { flex: 1; border-bottom: 1px dotted var(--ink-3); height: 1px; opacity: 0.5; }
    .hours-list .hours { color: var(--ink-2); font-variant-numeric: tabular-nums; }

    .emergency-banner {
      background: linear-gradient(90deg, #dc2626, #b91c1c); color: white;
      padding: 0.95rem 1.5rem; text-align: center; display: flex; gap: 1rem;
      justify-content: center; align-items: center; flex-wrap: wrap; font-size: 0.95rem;
      position: relative; overflow: hidden;
    }
    .emergency-pulse { width: 10px; height: 10px; border-radius: 50%; background: white; box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.7); animation: pulse 2s infinite; }
    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.7); }
      70% { box-shadow: 0 0 0 14px rgba(255, 255, 255, 0); }
      100% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); }
    }
    .emergency-banner .emergency-phone { color: white; font-weight: 700; text-decoration: underline; transition: opacity 0.2s; }
    .emergency-banner .emergency-phone:hover { opacity: 0.8; }

    .events-list { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 1rem; max-width: 800px; margin: 0 auto; }
    .event-item {
      background: var(--surface); border-left: 4px solid var(--primary);
      padding: 1.25rem 1.75rem; border-radius: 0 var(--radius) var(--radius) 0;
      display: flex; align-items: center; gap: 1.5rem; flex-wrap: wrap;
      box-shadow: var(--shadow-sm); transition: transform 0.3s var(--easing), box-shadow 0.3s ease;
    }
    .event-item:hover { transform: translateX(6px); box-shadow: var(--shadow); }
    .event-item time {
      font-family: var(--display); font-weight: 700; color: var(--primary-700);
      font-size: 1.05rem; min-width: clamp(80px, 25vw, 110px); flex-shrink: 0;
    }
    @media (max-width: 480px) {
      .event-item { padding: 1rem 1.25rem; gap: 0.75rem; }
      .event-item time { min-width: 0; flex-basis: 100%; font-size: 0.9rem; }
    }
    .event-body { flex: 1; }
    .event-body strong { font-size: 1.05rem; display: block; margin-bottom: 0.2rem; }
    .event-body p { font-size: 0.9rem; color: var(--ink-2); }
    .event-arrow { color: var(--ink-3); font-size: 1.25rem; transition: transform 0.3s ease, color 0.3s ease; }
    .event-item:hover .event-arrow { transform: translateX(4px); color: var(--primary); }

    .membership-section { background: var(--bg-2); }
    .membership-card {
      background: linear-gradient(135deg, var(--primary), var(--primary-700));
      border-radius: var(--radius-xl); padding: clamp(2rem, 4vw, 4rem);
      text-align: center; color: white; position: relative; overflow: hidden;
      box-shadow: var(--shadow-xl);
    }
    .membership-card::before {
      content: ''; position: absolute; inset: 0;
      background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.15), transparent 60%);
      pointer-events: none;
    }
    .membership-card .eyebrow { background: rgba(255,255,255,0.18); color: white; border-color: rgba(255,255,255,0.25); }
    .membership-card h2 { color: white; }
    .membership-card p { color: rgba(255,255,255,0.9); font-size: 1.1rem; max-width: 580px; margin: 0 auto 2rem; }
    .membership-card .btn-primary { background: white; color: var(--primary-700); box-shadow: 0 12px 30px rgba(0,0,0,0.2); }
    .membership-card .btn-primary:hover { background: var(--bg); }

    /* ─── Contact ────────────────────────────────────────── */
    .contact-section {
      background:
        radial-gradient(ellipse at 20% 20%, color-mix(in oklch, var(--primary) 50%, transparent), transparent 60%),
        radial-gradient(ellipse at 80% 80%, color-mix(in oklch, var(--primary-700) 60%, transparent), transparent 60%),
        var(--primary-900);
      color: white; text-align: center; position: relative; overflow: hidden;
    }
    .contact-section h2, .contact-section .eyebrow { color: white; }
    .contact-section .eyebrow { background: rgba(255,255,255,0.12); border-color: rgba(255,255,255,0.2); }
    .contact-grid { display: grid; gap: 1rem; max-width: 540px; margin: 2rem auto 2.5rem; }
    .contact-item {
      display: flex; align-items: center; gap: 0.85rem; padding: 1rem 1.5rem;
      background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15);
      border-radius: var(--radius); backdrop-filter: blur(12px);
      color: white; font-weight: 500; transition: background 0.2s ease, transform 0.2s ease;
    }
    .contact-item:hover { background: rgba(255,255,255,0.14); transform: translateY(-2px); }
    .contact-item .ci-icon { font-size: 1.2rem; }

    /* ─── Footer ─────────────────────────────────────────── */
    footer { background: #0a0a0b; color: rgba(255, 255, 255, 0.7); padding: 3rem 1.5rem; text-align: center; font-size: 0.85rem; }
    footer .footer-brand { font-family: var(--display); font-weight: 700; color: white; font-size: 1.1rem; margin-bottom: 0.5rem; }
    footer .legal { margin-top: 1.5rem; opacity: 0.5; font-size: 0.75rem; }
    footer .legal a { color: rgba(255, 255, 255, 0.8); text-decoration: underline; }
    footer .legal a:hover { color: white; }

    /* ─── Trust-bar (logos / facts strip) ─────────────────── */
    .trust-bar { padding: 2.5rem 0; background: var(--surface); border-bottom: 1px solid var(--border); }
    .trust-bar-inner { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: clamp(1.5rem, 4vw, 4rem); max-width: 1100px; margin: 0 auto; padding: 0 1.5rem; }
    .trust-fact { display: flex; align-items: center; gap: 0.6rem; color: var(--ink-2); font-size: 0.9rem; font-weight: 500; }
    .trust-fact strong { color: var(--ink); font-family: var(--display); font-size: 1.1rem; font-weight: 700; }
    .trust-fact svg { color: var(--primary); flex-shrink: 0; }

    /* ─── Process (4-step) ────────────────────────────────── */
    .process-section { padding: var(--section-padding) 0; background: var(--bg); }
    .process-grid { display: grid; gap: 1.75rem; grid-template-columns: repeat(auto-fit, minmax(min(220px, 100%), 1fr)); margin-top: 3rem; max-width: 1200px; margin-inline: auto; }
    .process-step { position: relative; padding: 2rem 1.5rem 2rem 4.5rem; background: var(--surface); border-radius: var(--radius); border: 1px solid var(--border); transition: transform 0.3s var(--easing), box-shadow 0.3s ease; }
    .process-step:hover { transform: translateY(-3px); box-shadow: var(--shadow); }
    .process-step .step-num {
      position: absolute; top: 1.5rem; left: 1.5rem;
      font-family: var(--display); font-weight: 800; font-size: 1.6rem; line-height: 1;
      width: 2.4rem; height: 2.4rem; display: grid; place-items: center;
      background: linear-gradient(135deg, var(--primary), var(--primary-700));
      color: white; border-radius: 50%;
    }
    body[data-tone="classical"] .process-step .step-num {
      background: var(--primary-700); color: white;
    }
    .process-step h4 { font-family: var(--display); font-size: 1.05rem; margin: 0 0 0.5rem 0; }
    .process-step p { font-size: 0.92rem; color: var(--ink-2); margin: 0; line-height: 1.55; }

    /* ─── FAQ ─────────────────────────────────────────────── */
    .faq-section { padding: var(--section-padding) 0; background: var(--bg-2); }
    .faq-list { max-width: 800px; margin: 3rem auto 0; }
    .faq-item {
      background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);
      margin-bottom: 1rem; overflow: hidden;
      transition: box-shadow 0.3s ease;
    }
    .faq-item[open] { box-shadow: var(--shadow); }
    .faq-item summary {
      cursor: pointer; padding: 1.4rem 1.75rem; font-family: var(--display);
      font-weight: 600; font-size: 1.02rem; color: var(--ink);
      display: flex; align-items: center; justify-content: space-between; gap: 1rem;
      list-style: none; user-select: none;
    }
    .faq-item summary::-webkit-details-marker { display: none; }
    .faq-item summary::after {
      content: '+'; font-size: 1.6rem; line-height: 1; color: var(--primary-700);
      font-weight: 400; transition: transform 0.3s var(--easing);
    }
    .faq-item[open] summary::after { transform: rotate(45deg); }
    .faq-item .faq-body { padding: 0 1.75rem 1.5rem; color: var(--ink-2); font-size: 0.95rem; line-height: 1.7; }
  </style>
</head>
<body data-tone="${tone}">

<div class="demo-banner" role="contentinfo">
  <div class="demo-banner-inner">
    <span class="demo-banner-tag">Demo-Vorschau</span>
    <span class="demo-banner-text">
      Erstellt von
      <a href="https://webhoch.com" target="_blank" rel="noopener">Webagentur Hochmeir e.U.</a>
      ·
      <a href="https://webhoch.com/#contact" target="_blank" rel="noopener">Beratung anfragen</a>
    </span>
  </div>
</div>

${spec.emergency?.available ? renderEmergencyBanner(spec.emergency) : ''}

<nav class="site-nav" id="siteNav">
  <div class="container inner">
    <a class="brand" href="/">
      <span class="brand-dot"></span>
      ${escapeHtml(spec.business_name)}
    </a>
    <ul>
      <li><a href="#leistungen">${escapeHtml(navLeistungen)}</a></li>
      <li><a href="#ueber-uns">Über uns</a></li>
      ${testimonialCards ? `<li><a href="#referenzen">Referenzen</a></li>` : ''}
      <li><a href="#faq">FAQ</a></li>
      <li><a href="#kontakt">Kontakt</a></li>
    </ul>
    <a href="#kontakt" class="btn btn-primary nav-cta" style="padding: 0.7rem 1.4rem; font-size: 0.85rem;">${escapeHtml(spec.hero.cta_text)}</a>
  </div>
</nav>

<section class="hero">
  <div class="hero-bg"></div>
  <div class="hero-blob b1"></div>
  <div class="hero-blob b2"></div>

  <div class="hero-inner">
    <span class="hero-eyebrow">${escapeHtml(spec.tagline.slice(0, 60))}</span>
    <h1>${heroHeadlineHtml}</h1>
    <p>${escapeHtml(spec.hero.subheadline)}</p>
    <div class="hero-cta-row">
      <a href="#kontakt" class="btn btn-primary btn-lg">${escapeHtml(spec.hero.cta_text)} →</a>
      <a href="#leistungen" class="btn btn-outline-white btn-lg">Mehr erfahren</a>
    </div>
  </div>

  <div class="hero-scroll-indicator" aria-hidden="true"></div>
</section>

${renderTrustBar(defaultTrustFacts(layoutKind))}

<section id="leistungen" class="section-padded">
  <div class="container">
    <div class="section-head reveal">
      <span class="eyebrow">${escapeHtml(eyebrowLeistungen)}</span>
      <h2>${escapeHtml(sectionHeadingLeistungen)}</h2>
    </div>
    <div class="services-grid">
      ${services}
    </div>
  </div>
</section>

${spec.menu && spec.menu.length > 0 ? renderMenuSection(spec.menu) : ''}

${spec.events && spec.events.length > 0 ? renderEventsSection(spec.events) : ''}

${layoutKind === 'verein' ? `
<section id="galerie" class="gallery-section section-padded">
  <div class="container">
    <div class="section-head reveal">
      <span class="eyebrow">Eindrücke</span>
      <h2>Vereinsleben in Bildern</h2>
    </div>
    <div class="gallery-grid">
      ${renderVereinGallery(spec, slug)}
    </div>
  </div>
</section>
${(spec as any).team && (spec as any).team.length > 0 ? renderTeamSection((spec as any).team) : ''}
` : ''}

${spec.opening_hours && spec.opening_hours.length > 0 ? renderOpeningHoursSection(spec.opening_hours, layoutKind === 'arzt' ? 'Sprechzeiten' : 'Öffnungszeiten') : ''}

<section id="ueber-uns" class="about-section section-padded">
  <div class="container">
    <div class="about-grid">
      <div class="about-image-wrap reveal" aria-hidden="true"></div>
      <div class="about-text reveal">
        <span class="eyebrow">Über ${layoutKind === 'verein' ? 'unseren Verein' : 'uns'}</span>
        <h2>${layoutKind === 'verein' ? 'Wer wir sind' : 'Persönlich, ehrlich, präzise'}</h2>
        <p>${escapeHtml(spec.about.body)}</p>
      </div>
    </div>
  </div>
</section>

${renderProcessSection(defaultProcessSteps(layoutKind), layoutKind)}

${spec.membership ? renderMembershipSection(spec.membership) : ''}

${
  testimonialCards
    ? `<section id="referenzen" class="testimonials-section section-padded">
  <div class="container">
    <div class="section-head reveal">
      <span class="eyebrow">${layoutKind === 'arzt' ? 'Patientenstimmen' : 'Was Kundinnen und Kunden sagen'}</span>
      <h2>${layoutKind === 'arzt' ? 'Vertrauen, das ankommt' : 'Echte Stimmen, echte Ergebnisse'}</h2>
    </div>
    <div class="testimonials-grid">
      ${testimonialCards}
    </div>
  </div>
</section>`
    : ''
}

${renderFaqSection(defaultFaqs(layoutKind))}

<section id="kontakt" class="contact-section section-padded">
  <div class="container container-narrow reveal">
    <span class="eyebrow">Schreiben Sie uns</span>
    <h2>${layoutKind === 'verein' ? 'Werden Sie aktiv' : layoutKind === 'arzt' ? 'Termin vereinbaren' : 'Lass uns reden'}</h2>
    <div class="contact-grid">
      ${spec.contact.phone ? `<a href="tel:${escapeHtml(spec.contact.phone.replace(/\s/g, ''))}" class="contact-item"><span class="ci-icon" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg></span><span>${escapeHtml(spec.contact.phone)}</span></a>` : ''}
      ${spec.contact.email ? `<a href="mailto:${escapeHtml(spec.contact.email)}?subject=${encodeURIComponent('Anfrage über Vorschau-Webseite')}" class="contact-item"><span class="ci-icon" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></span><span>${escapeHtml(spec.contact.email)}</span></a>` : ''}
      ${spec.contact.address ? `<div class="contact-item"><span class="ci-icon" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></span><span>${escapeHtml(spec.contact.address)}</span></div>` : ''}
    </div>
    ${spec.contact.email ? `<a href="mailto:${escapeHtml(spec.contact.email)}?subject=${encodeURIComponent('Anfrage über Vorschau-Webseite')}" class="btn btn-primary btn-lg">${escapeHtml(spec.contact.cta_text)} →</a>` : ''}
  </div>
</section>

<footer>
  <div class="footer-brand">${escapeHtml(spec.business_name)}</div>
  <div>${escapeHtml(spec.footer.tagline)}</div>
  <div class="legal">
    &copy; ${new Date().getFullYear()} · Unverbindlicher Entwurf erstellt von <a href="https://webhoch.com" target="_blank" rel="noopener">Webagentur Hochmeir e.U.</a> · <a href="/impressum">Impressum</a> · <a href="/datenschutz">Datenschutz</a>
  </div>
</footer>

<script>
  // Scroll-reveal via IntersectionObserver
  (() => {
    const els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window) || !els.length) {
      els.forEach(e => e.classList.add('is-visible'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const delay = parseInt(el.dataset.revealDelay || '0', 10);
          setTimeout(() => el.classList.add('is-visible'), delay);
          io.unobserve(el);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });
    els.forEach(e => io.observe(e));
  })();

  // Sticky nav shadow on scroll
  (() => {
    const nav = document.getElementById('siteNav');
    if (!nav) return;
    const onScroll = () => {
      if (window.scrollY > 20) nav.classList.add('scrolled');
      else nav.classList.remove('scrolled');
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  })();
</script>

</body>
</html>
`;
}

function renderLegalSharedStyles(): string {
  return `
    :root {
      --bg: #fafaf7;
      --surface: #ffffff;
      --ink: #0a0a0a;
      --ink-2: #525252;
      --ink-3: #a3a3a3;
      --primary: #4f46e5;
      --rule: rgba(10,10,10,0.08);
      --warn-bg: #fef2f2;
      --warn-border: #dc2626;
      --warn-ink: #7f1d1d;
      --display: 'Fraunces', Georgia, serif;
      --sans: 'Inter', system-ui, sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: var(--sans); background: var(--bg); color: var(--ink); line-height: 1.7; -webkit-font-smoothing: antialiased; }
    a { color: inherit; }

    .demo-banner { background: #1a0a1f; color:#fff; padding:0.55rem 1rem; font-size:0.82rem; }
    .demo-banner-inner { max-width: 1280px; margin: 0 auto; display: flex; align-items: center; gap: 0.85rem; flex-wrap: wrap; justify-content: center; }
    .demo-banner-tag { font-size: 0.7rem; letter-spacing: 0.16em; text-transform: uppercase; padding: 0.18rem 0.55rem; border-radius: 999px; background: rgba(236,101,186,0.22); border: 1px solid rgba(236,101,186,0.5); color: #ffd6ee; font-weight: 700; white-space: nowrap; }
    .demo-banner a { color: #ffb3df; font-weight: 700; border-bottom: 1px solid rgba(255,179,223,0.45); text-decoration: none; }

    .nav-bar { background: var(--surface); border-bottom: 1px solid var(--rule); }
    .nav-inner { max-width: 980px; margin: 0 auto; padding: 1.1rem 1.5rem; display: flex; align-items: center; justify-content: space-between; }
    .nav-back { color: var(--ink-2); font-size: 0.92rem; font-weight: 500; display: inline-flex; align-items: center; gap: 0.5rem; transition: color .2s; text-decoration: none; }
    .nav-back:hover { color: var(--ink); }
    .nav-credit { color: var(--ink-3); font-size: 0.84rem; }
    .nav-credit a { color: var(--ink-2); font-weight: 600; text-decoration: none; border-bottom: 1px solid var(--rule); transition: border-color .2s; }
    .nav-credit a:hover { border-color: var(--ink-2); }

    .warn {
      max-width: 880px; margin: 2rem auto 0; padding: 1.5rem 1.75rem;
      background: var(--warn-bg); border: 1px solid rgba(220,38,38,0.25); border-left: 4px solid var(--warn-border);
      border-radius: 12px; color: var(--warn-ink);
    }
    .warn-head { display: flex; align-items: center; gap: 0.65rem; font-weight: 700; font-size: 0.92rem; letter-spacing: 0.04em; text-transform: uppercase; margin-bottom: 0.5rem; }
    .warn-head .ic { width: 22px; height: 22px; border-radius: 50%; background: var(--warn-border); color: #fff; display: grid; place-items: center; font-size: 0.85rem; flex-shrink: 0; }
    .warn p { font-size: 0.95rem; line-height: 1.65; color: var(--warn-ink); }
    .warn p + p { margin-top: 0.7rem; }
    .warn strong { font-weight: 700; }

    main { max-width: 880px; margin: 0 auto; padding: 3.5rem 1.5rem 1rem; }
    .lead-eyebrow { font-family: var(--sans); font-size: 0.78rem; letter-spacing: 0.16em; text-transform: uppercase; color: var(--primary); font-weight: 700; margin-bottom: 1rem; }
    h1 { font-family: var(--display); font-size: clamp(2.25rem, 4vw, 3rem); font-weight: 500; letter-spacing: -0.02em; line-height: 1.1; margin-bottom: 1rem; color: var(--ink); }
    .lead-intro { font-size: 1.1rem; color: var(--ink-2); margin-bottom: 3rem; max-width: 60ch; }

    .legal-card {
      background: var(--surface); border: 1px solid var(--rule);
      border-radius: 16px; padding: clamp(1.75rem, 3vw, 2.5rem);
      margin-bottom: 1.25rem;
    }
    .legal-card h2 {
      font-family: var(--display); font-weight: 500; font-size: 1.4rem;
      letter-spacing: -0.01em; margin-bottom: 1rem; color: var(--ink); line-height: 1.3;
    }
    .legal-card .label {
      font-family: var(--sans); font-size: 0.74rem; letter-spacing: 0.14em; text-transform: uppercase;
      color: var(--ink-3); font-weight: 700; margin-bottom: 0.85rem; display: block;
    }
    .legal-card p { color: var(--ink-2); font-size: 1rem; line-height: 1.75; }
    .legal-card p + p { margin-top: 0.85rem; }
    .legal-card a { color: var(--primary); text-decoration: none; border-bottom: 1px solid rgba(79,70,229,0.25); transition: border-color .2s; }
    .legal-card a:hover { border-bottom-color: var(--primary); }
    .legal-card dl { display: grid; gap: 0.65rem 1.5rem; grid-template-columns: max-content 1fr; font-size: 0.97rem; }
    @media (max-width: 580px) { .legal-card dl { grid-template-columns: 1fr; gap: 0.25rem; } .legal-card dl dd { margin-bottom: 0.85rem; } }
    .legal-card dt { color: var(--ink-3); font-size: 0.86rem; padding-top: 0.15rem; }
    .legal-card dd { color: var(--ink); font-weight: 500; }

    .credit-card {
      margin-top: 3rem;
      background: linear-gradient(135deg, #0a0a0a, #1a1a1a); color: rgba(255,255,255,0.85);
      border-radius: 16px; padding: clamp(1.75rem, 3vw, 2.25rem);
      display: grid; gap: 1rem; align-items: center;
    }
    @media (min-width: 720px) { .credit-card { grid-template-columns: 1fr auto; gap: 2rem; } }
    .credit-card h3 { font-family: var(--display); font-weight: 500; font-size: 1.25rem; color: #fff; margin-bottom: 0.4rem; line-height: 1.3; }
    .credit-card p { font-size: 0.94rem; color: rgba(255,255,255,0.7); line-height: 1.6; }
    .credit-card a {
      display: inline-flex; align-items: center; gap: 0.5rem;
      background: #fff; color: #0a0a0a; padding: 0.85rem 1.4rem;
      border-radius: 8px; font-weight: 600; font-size: 0.92rem;
      text-decoration: none; transition: transform .2s;
      white-space: nowrap;
    }
    .credit-card a:hover { transform: translateY(-1px); }

    footer.legal-footer { max-width: 880px; margin: 0 auto; padding: 3rem 1.5rem 4rem; border-top: 1px solid var(--rule); margin-top: 2rem; text-align: center; color: var(--ink-3); font-size: 0.84rem; }
    footer.legal-footer a { color: var(--ink-2); text-decoration: none; border-bottom: 1px solid var(--rule); }
    footer.legal-footer a:hover { color: var(--ink); border-bottom-color: var(--ink-3); }
  `;
}

function renderLegalDemoBanner(): string {
  return `
  <div class="demo-banner" role="contentinfo">
    <div class="demo-banner-inner">
      <span class="demo-banner-tag">Demo-Vorschau</span>
      <span>
        Erstellt von
        <a href="https://webhoch.com" target="_blank" rel="noopener">Webagentur Hochmeir e.U.</a>
        ·
        <a href="https://webhoch.com/#contact" target="_blank" rel="noopener">Beratung anfragen</a>
      </span>
    </div>
  </div>`;
}

function renderLegalNavBar(): string {
  return `
  <nav class="nav-bar">
    <div class="nav-inner">
      <a class="nav-back" href="/">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        Zurück zur Startseite
      </a>
      <span class="nav-credit">erstellt von <a href="https://webhoch.com" target="_blank" rel="noopener">Webagentur Hochmeir e.U.</a></span>
    </div>
  </nav>`;
}

function renderLegalCreditCard(): string {
  return `
  <aside class="credit-card">
    <div>
      <h3>Eigene Webseite gestalten lassen?</h3>
      <p>Diese Vorschau wurde von der Webagentur Hochmeir e.U. erstellt. Wir entwerfen, bauen und betreiben individuelle Webauftritte für Unternehmen, Vereine und Praxen aus Österreich.</p>
    </div>
    <a href="https://webhoch.com" target="_blank" rel="noopener">webhoch.com →</a>
  </aside>`;
}

function renderLegalFooter(spec: SiteSpec): string {
  return `
  <footer class="legal-footer">
    <div>${escapeHtml(spec.business_name)} · Demo-Vorschau · erstellt von <a href="https://webhoch.com" target="_blank" rel="noopener">Webagentur Hochmeir e.U.</a></div>
    <div style="margin-top:0.6rem;">
      <a href="/impressum">Impressum</a>
      &nbsp;·&nbsp;
      <a href="/datenschutz">Datenschutz</a>
    </div>
  </footer>`;
}

function renderImpressumPage(spec: SiteSpec): string {
  return `---
const spec = ${JSON.stringify(spec, null, 2)};
---
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Impressum — ${escapeHtml(spec.business_name)} (Demo-Vorschau)</title>
  <meta name="robots" content="noindex, nofollow" />
  <link rel="preconnect" href="https://fonts.bunny.net" crossorigin>
  <link href="https://fonts.bunny.net/css?family=fraunces:400,500,600|inter:400,500,600,700&display=swap" rel="stylesheet">
  <style>${renderLegalSharedStyles()}</style>
</head>
<body>
${renderLegalDemoBanner()}
${renderLegalNavBar()}

<div class="warn" role="alert">
  <div class="warn-head"><span class="ic">!</span>Wichtiger Hinweis · Frei erfundene Inhalte</div>
  <p><strong>Diese Webseite ist eine reine Designvorschau.</strong> Sämtliche Inhalte — Firmenname, Anschrift, Telefonnummer, E-Mail-Adresse, Bilder, Texte, Preise und Leistungsbeschreibungen — sind <strong>frei erfunden bzw. Platzhalter</strong> und entsprechen <strong>NICHT</strong> den realen Daten eines tatsächlichen Unternehmens.</p>
  <p>Es werden hier <strong>keinerlei rechtsverbindliche Angaben</strong> gemacht. Diese Seite dient ausschließlich der Demonstration eines möglichen Designs durch die <a href="https://webhoch.com" target="_blank" rel="noopener" style="color: var(--warn-ink); text-decoration: underline;">Webagentur Hochmeir e.U.</a></p>
</div>

<main>
  <span class="lead-eyebrow">Demo · Platzhalter-Inhalte</span>
  <h1>Impressum</h1>
  <p class="lead-intro">Die nachfolgenden Angaben sind <strong>fiktiv und ausschließlich als Beispiel zu verstehen</strong>. Vor jeder Live-Schaltung muss dieser Bereich vom tatsächlichen Inhaber mit echten Daten ergänzt werden.</p>

  <article class="legal-card">
    <span class="label">Demo-Daten · Angaben gemäß § 5 ECG / § 25 MedienG</span>
    <h2>Diensteanbieter (fiktiv)</h2>
    <dl>
      <dt>Bezeichnung:</dt><dd>${escapeHtml(spec.business_name)} (Beispielname)</dd>
      <dt>Anschrift:</dt><dd>${spec.contact.address ? escapeHtml(spec.contact.address) + ' (Beispieladresse)' : 'Beispielstraße 1, 5020 Salzburg'}</dd>
      ${spec.contact.phone ? `<dt>Telefon:</dt><dd>${escapeHtml(spec.contact.phone)} (Beispielnummer)</dd>` : ''}
      ${spec.contact.email ? `<dt>E-Mail:</dt><dd>${escapeHtml(spec.contact.email)} (Beispieladresse)</dd>` : ''}
      <dt>Unternehmenszweck:</dt><dd>${escapeHtml(spec.tagline)}</dd>
    </dl>
  </article>

  <article class="legal-card">
    <h2>Haftungsausschluss für die Demo</h2>
    <p>Diese Vorschau-Webseite wurde von der Webagentur Hochmeir e.U. erstellt. Sie dient ausschließlich Demonstrations- und Beratungszwecken. <strong>Es bestehen keine Geschäftsbeziehungen, keine vertraglichen Verbindlichkeiten und keine Haftungsansprüche</strong> aus den hier dargestellten Inhalten.</p>
    <p>Allfällige Ähnlichkeiten mit real existierenden Unternehmen, Personen oder Marken sind zufällig. Sollten Sie sich oder Ihr Unternehmen in einer Vorschau wiedererkennen und Anpassungen oder Entfernung wünschen, kontaktieren Sie uns bitte unter <a href="mailto:office@webhoch.com">office@webhoch.com</a>.</p>
  </article>

  <article class="legal-card">
    <h2>Verantwortlich für Design &amp; Umsetzung dieser Vorschau</h2>
    <dl>
      <dt>Unternehmen:</dt><dd>Webagentur Hochmeir e.U.</dd>
      <dt>Inhaber:</dt><dd>Jonathan Hochmeir</dd>
      <dt>Tätigkeit:</dt><dd>Webdesign &amp; Webentwicklung</dd>
      <dt>Web:</dt><dd><a href="https://webhoch.com" target="_blank" rel="noopener">webhoch.com</a></dd>
      <dt>Kontakt:</dt><dd><a href="mailto:office@webhoch.com">office@webhoch.com</a></dd>
      <dt>Impressum (Agentur):</dt><dd><a href="https://webhoch.com/impressum" target="_blank" rel="noopener">webhoch.com/impressum</a></dd>
    </dl>
    <p style="margin-top:1.25rem; color: var(--ink-3); font-size: 0.92rem;">Sämtliche rechtsverbindlichen Angaben zur Webagentur Hochmeir e.U. (UID, Firmenbuchnummer, Aufsichtsbehörde) finden Sie auf der offiziellen Agentur-Webseite.</p>
  </article>

  ${renderLegalCreditCard()}
</main>

${renderLegalFooter(spec)}
</body>
</html>
`;
}

function renderDatenschutzPage(spec: SiteSpec): string {
  return `---
const spec = ${JSON.stringify(spec, null, 2)};
---
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Datenschutz — ${escapeHtml(spec.business_name)} (Demo-Vorschau)</title>
  <meta name="robots" content="noindex, nofollow" />
  <link rel="preconnect" href="https://fonts.bunny.net" crossorigin>
  <link href="https://fonts.bunny.net/css?family=fraunces:400,500,600|inter:400,500,600,700&display=swap" rel="stylesheet">
  <style>${renderLegalSharedStyles()}</style>
</head>
<body>
${renderLegalDemoBanner()}
${renderLegalNavBar()}

<div class="warn" role="alert">
  <div class="warn-head"><span class="ic">!</span>Demo-Vorschau · keine echten Daten</div>
  <p><strong>Diese Webseite ist eine Designvorschau und sammelt von sich aus keinerlei personenbezogene Daten.</strong> Es werden weder Cookies gesetzt, noch Tracking-Tools eingesetzt, noch Formulardaten erhoben. Sämtliche dargestellten Firmen-, Kontakt- und Personendaten sind <strong>frei erfunden</strong> bzw. dienen als Platzhalter.</p>
  <p>Vor einer Live-Schaltung muss diese Datenschutzerklärung an die tatsächlich verwendeten Tools (Web-Analytics, Formular-Backends, Newsletter, Cookies) angepasst werden — wir helfen dabei.</p>
</div>

<main>
  <span class="lead-eyebrow">Demo · Beispiel-Datenschutzerklärung</span>
  <h1>Datenschutzerklärung</h1>
  <p class="lead-intro">Die folgenden Angaben sind ein <strong>Muster-Text</strong>. Im Live-Betrieb müssen sie an die tatsächlichen Datenverarbeitungs-Vorgänge des Webseiten-Inhabers angepasst werden.</p>

  <article class="legal-card">
    <span class="label">Demo-Daten · Verantwortlicher</span>
    <h2>Verantwortlicher (fiktiv)</h2>
    <p>${escapeHtml(spec.business_name)} (Beispielname)${spec.contact.email ? `, E-Mail (Beispiel): <a href="mailto:${escapeHtml(spec.contact.email)}">${escapeHtml(spec.contact.email)}</a>` : ''}${spec.contact.address ? `, Anschrift (Beispiel): ${escapeHtml(spec.contact.address)}` : ''}.</p>
    <p>Diese Angaben sind frei erfunden und dienen ausschließlich der Demonstration.</p>
  </article>

  <article class="legal-card">
    <h2>Erhebung und Verarbeitung personenbezogener Daten</h2>
    <p>Diese Demo-Webseite erhebt <strong>keine personenbezogenen Daten</strong>. Es werden weder Cookies gesetzt, noch Web-Analytics-Tools (Google Analytics, Matomo, Plausible o. ä.) eingesetzt, noch werden Formulardaten erfasst.</p>
    <p>Sollten Sie über die angezeigten Kontaktwege (E-Mail, Telefon) Kontakt zu der dargestellten — fiktiven — Person aufnehmen, gehen Ihre Daten nicht ein, weil keine Empfänger-Postfächer für die Demo existieren.</p>
  </article>

  <article class="legal-card">
    <h2>Rechtsgrundlage</h2>
    <p>Soweit überhaupt Daten verarbeitet würden, käme als Rechtsgrundlage Art. 6 Abs. 1 lit. b DSGVO (Vertragsanbahnung / -erfüllung) sowie Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse) zur Anwendung.</p>
  </article>

  <article class="legal-card">
    <h2>Ihre Rechte</h2>
    <p>Im Live-Betrieb hätten Betroffene folgende Rechte: Auskunft (Art. 15), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20) sowie Widerspruch (Art. 21 DSGVO).</p>
    <p>Beschwerden können in Österreich an die <a href="https://www.dsb.gv.at" target="_blank" rel="noopener">Datenschutzbehörde (dsb.gv.at)</a> gerichtet werden.</p>
  </article>

  <article class="legal-card">
    <h2>Hosting der Demo-Vorschau</h2>
    <p>Diese Demo-Vorschau wird auf der Infrastruktur der Webagentur Hochmeir e.U. gehostet (Subdomain unter <code>webseiten-werkstatt.at</code>). Beim Aufruf werden technische Server-Logs (IP-Adresse, Zeitstempel, abgerufene URL, Referrer, User-Agent) für maximal 14 Tage gespeichert. Diese Daten werden ausschließlich zur Sicherstellung des Betriebs verwendet und nicht zu Marketing- oder Analyse-Zwecken ausgewertet.</p>
  </article>

  <article class="legal-card">
    <h2>Verantwortlich für Design &amp; Hosting der Demo</h2>
    <dl>
      <dt>Unternehmen:</dt><dd>Webagentur Hochmeir e.U.</dd>
      <dt>Inhaber:</dt><dd>Jonathan Hochmeir</dd>
      <dt>Web:</dt><dd><a href="https://webhoch.com" target="_blank" rel="noopener">webhoch.com</a></dd>
      <dt>Kontakt:</dt><dd><a href="mailto:office@webhoch.com">office@webhoch.com</a></dd>
      <dt>Datenschutz (Agentur):</dt><dd><a href="https://webhoch.com/datenschutz" target="_blank" rel="noopener">webhoch.com/datenschutz</a></dd>
    </dl>
  </article>

  ${renderLegalCreditCard()}
</main>

${renderLegalFooter(spec)}
</body>
</html>
`;
}

/**
 * PR-A6: Which layout_kinds emit an iCal feed for their events?
 * Verein-templates with extractable concert dates are the primary use-case.
 */
function layoutKindRequiresIcal(layoutKind: string): boolean {
  return layoutKind === 'verein-musik' || layoutKind === 'verein-sport'
      || layoutKind === 'verein-tradition' || layoutKind === 'verein';
}

export async function scaffoldAstroProject(
  prototypeVersionId: number,
  spec: SiteSpec,
  slug: string,
): Promise<string> {
  const projectDir = join(PROJECTS_DIR, `prototype-${prototypeVersionId}`);
  const previewBaseDomain = process.env.PREVIEW_ROOT_DOMAIN ?? 'webseiten-werkstatt.at';

  await mkdir(join(projectDir, 'src', 'pages'), { recursive: true });
  await mkdir(join(projectDir, 'public'), { recursive: true });

  await writeFile(
    join(projectDir, 'package.json'),
    JSON.stringify(
      {
        name: `prototype-${prototypeVersionId}`,
        type: 'module',
        scripts: { build: 'astro build', dev: 'astro dev', preview: 'astro preview' },
        dependencies: { astro: '^5.0.0' },
      },
      null,
      2,
    ),
  );

  await writeFile(
    join(projectDir, 'astro.config.mjs'),
    `import { defineConfig } from 'astro/config';\nexport default defineConfig({ output: 'static' });\n`,
  );

  await writeFile(join(projectDir, 'public', 'robots.txt'), `User-agent: *\nDisallow: /\n`);

  // PR-A6: iCal-Feed unter /termine.ics ablegen wenn Events extrahiert
  // wurden (Verein-Templates). Static file im public/ wird unverändert
  // ausgeliefert — kein Server-Side-Code nötig.
  if (layoutKindRequiresIcal(spec.layout_kind ?? 'standard')) {
    try {
      const { extractEvents, buildIcalFeed } = await import('./templates/_editorial.js');
      const events = (spec.events && spec.events.length > 0)
        ? spec.events.slice(0, 8).map(e => ({ date: (e as any).date || '', title: (e as any).title || (e as any).name || 'Veranstaltung' }))
        : extractEvents(spec);
      if (events.length > 0) {
        const previewUrl = `${previewBaseDomain.startsWith('http') ? '' : 'https://'}${slug}.${previewBaseDomain}/`;
        const ics = buildIcalFeed(events, { businessName: spec.business_name, previewUrl });
        if (ics) {
          await writeFile(join(projectDir, 'public', 'termine.ics'), ics);
        }
      }
    } catch (err) {
      console.warn('[scaffold] iCal-Build failed:', err instanceof Error ? err.message : err);
    }
  }

  // Dispatch to branch-specific template if available, fallback to generic.
  const layoutKind = spec.layout_kind ?? 'standard';
  let indexHtml: string;
  if (layoutKind === 'restaurant') {
    const { renderRestaurantPage } = await import('./templates/restaurant.js');
    indexHtml = renderRestaurantPage(spec, slug);
  } else if (layoutKind === 'kanzlei') {
    const { renderKanzleiPage } = await import('./templates/kanzlei.js');
    indexHtml = renderKanzleiPage(spec, slug);
  } else if (layoutKind === 'bestattung') {
    const { renderBestattungPage } = await import('./templates/bestattung.js');
    indexHtml = renderBestattungPage(spec, slug);
  } else if (layoutKind === 'galerie') {
    const { renderGaleriePage } = await import('./templates/galerie.js');
    indexHtml = renderGaleriePage(spec, slug);
  } else if (layoutKind === 'friseur') {
    const { renderFriseurPage } = await import('./templates/friseur.js');
    indexHtml = renderFriseurPage(spec, slug);
  } else if (layoutKind === 'arzt') {
    const { renderArztPage } = await import('./templates/arzt.js');
    indexHtml = renderArztPage(spec, slug);
  } else if (layoutKind === 'hotel') {
    const { renderHotelPage } = await import('./templates/hotel.js');
    indexHtml = renderHotelPage(spec, slug);
  } else if (layoutKind === 'handwerk') {
    const { renderHandwerkPage } = await import('./templates/handwerk.js');
    indexHtml = renderHandwerkPage(spec, slug);
  } else if (layoutKind === 'fitness') {
    const { renderFitnessPage } = await import('./templates/fitness.js');
    indexHtml = renderFitnessPage(spec, slug);
  } else if (layoutKind === 'einzelhandel') {
    const { renderEinzelhandelPage } = await import('./templates/einzelhandel.js');
    indexHtml = renderEinzelhandelPage(spec, slug);
  } else if (layoutKind === 'autohaus') {
    const { renderAutohausPage } = await import('./templates/autohaus.js');
    indexHtml = renderAutohausPage(spec, slug);
  } else if (layoutKind === 'energie') {
    const { renderEnergiePage } = await import('./templates/energie.js');
    indexHtml = renderEnergiePage(spec, slug);
  } else if (layoutKind === 'tier') {
    const { renderTierPage } = await import('./templates/tier.js');
    indexHtml = renderTierPage(spec, slug);
  } else if (layoutKind === 'golfclub') {
    const { renderGolfclubPage } = await import('./templates/golfclub.js');
    indexHtml = renderGolfclubPage(spec, slug);
  } else if (layoutKind === 'verein_musik') {
    const { renderVereinMusikPage } = await import('./templates/verein-musik.js');
    indexHtml = renderVereinMusikPage(spec, slug);
  } else if (layoutKind === 'verein_sport') {
    const { renderVereinSportPage } = await import('./templates/verein-sport.js');
    indexHtml = renderVereinSportPage(spec, slug);
  } else if (layoutKind === 'verein_tradition') {
    const { renderVereinTraditionPage } = await import('./templates/verein-tradition.js');
    indexHtml = renderVereinTraditionPage(spec, slug);
  } else if (layoutKind === 'verein') {
    const { renderVereinPage } = await import('./templates/verein.js');
    indexHtml = renderVereinPage(spec, slug);
  } else if (layoutKind === 'standard') {
    const { renderStandardPage } = await import('./templates/standard.js');
    indexHtml = renderStandardPage(spec, slug);
  } else {
    indexHtml = renderAstroPage(spec, slug, previewBaseDomain);
  }
  await writeFile(
    join(projectDir, 'src', 'pages', 'index.astro'),
    indexHtml,
  );
  await writeFile(
    join(projectDir, 'src', 'pages', 'impressum.astro'),
    renderImpressumPage(spec),
  );
  await writeFile(
    join(projectDir, 'src', 'pages', 'datenschutz.astro'),
    renderDatenschutzPage(spec),
  );

  await writeFile(join(projectDir, 'site-spec.json'), JSON.stringify(spec, null, 2));

  return projectDir;
}
