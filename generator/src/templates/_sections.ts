/**
 * Premium re-renderer for the prospect's actual page sections.
 *
 * Each scraped section (H2/H3 + paragraphs from their own site) gets a
 * full-width editorial block with oversized serif headline, hairline gold
 * accent, generous whitespace and a left-aligned reading column.
 *
 * The point: the prospect should look at the demo and immediately see
 * "those are MY sections, but redesigned" — not a generic template.
 *
 * Security: callers must pass already-trusted, server-cleaned strings or
 * use `escapeHtml`. This partial does not re-escape.
 */

export interface RedesignedSection {
  title: string;
  body: string;
  level: number;
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/**
 * Split body into 1-3 paragraphs. The extractor joins multiple paragraphs
 * with `\n\n`, so we re-split on that. Falls back to whole-body single
 * paragraph for legacy data.
 */
function paragraphsOf(body: string): string[] {
  const parts = body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return [body.trim()].filter(Boolean);
  return parts.slice(0, 3);
}

/**
 * Returns a CSS block to paste once per page (id-namespaced so it doesn't
 * collide with template-specific styles). Use the matching markup helper
 * `renderRedesignedSections` below.
 */
export const REDESIGNED_SECTIONS_CSS = `
.rd-section { padding: clamp(80px, 12vw, 160px) clamp(24px, 6vw, 80px); position: relative; }
.rd-section + .rd-section { border-top: 1px solid rgba(0, 0, 0, 0.06); }
.rd-section--alt { background: var(--rd-alt-bg, rgba(0, 0, 0, 0.02)); }
.rd-section__inner { max-width: 880px; margin: 0 auto; }
.rd-section__eyebrow {
  font-family: var(--rd-sans, system-ui, sans-serif);
  text-transform: uppercase;
  letter-spacing: 0.28em;
  font-size: 11px;
  color: var(--rd-accent, #c19a3e);
  margin-bottom: 28px;
  display: inline-flex; align-items: center; gap: 14px;
}
.rd-section__eyebrow::before {
  content: ''; width: 36px; height: 1px;
  background: var(--rd-accent, #c19a3e);
}
.rd-section__title {
  font-family: var(--rd-serif, 'Cormorant Garamond', Georgia, serif);
  font-size: clamp(40px, 6vw, 72px);
  line-height: 1.04;
  font-weight: 500;
  letter-spacing: -0.01em;
  margin: 0 0 40px;
  color: var(--rd-fg, #1a1a1a);
  max-width: 720px;
}
.rd-section__body {
  font-family: var(--rd-sans, system-ui, sans-serif);
  font-size: clamp(17px, 1.4vw, 19px);
  line-height: 1.75;
  color: rgba(0, 0, 0, 0.78);
  max-width: 640px;
}
.rd-section__body p { margin: 0 0 1.4em; }
.rd-section__body p:last-child { margin-bottom: 0; }
.rd-section__body p:first-child::first-letter {
  font-family: var(--rd-serif, 'Cormorant Garamond', Georgia, serif);
  font-size: 4em;
  line-height: 0.85;
  float: left;
  margin: 0.08em 0.12em -0.05em 0;
  color: var(--rd-accent, #c19a3e);
  font-weight: 500;
}
.rd-section__divider {
  width: 60px; height: 1px;
  background: var(--rd-accent, #c19a3e);
  margin: 56px 0 0;
  opacity: 0.5;
}
@media (max-width: 720px) {
  .rd-section { padding: 64px 24px; }
  .rd-section__title { font-size: 36px; margin-bottom: 28px; }
  .rd-section__body { font-size: 16px; line-height: 1.7; }
  .rd-section__body p:first-child::first-letter { font-size: 3em; }
}
`.trim();

/**
 * Returns the HTML markup for the section list. Pass a label for the
 * eyebrow (e.g. "Aus Ihrer Webseite — neu interpretiert") so the prospect
 * understands the demo is mirroring their own copy.
 */
export function renderRedesignedSections(
  sections: RedesignedSection[] | undefined,
  eyebrow: string = 'Inhalt aus Ihrer Webseite — neu interpretiert',
): string {
  if (!sections || sections.length === 0) return '';
  const blocks = sections
    .map((s, i) => {
      const paras = paragraphsOf(s.body)
        .map((p) => `<p>${escapeHtml(p)}</p>`)
        .join('');
      const altClass = i % 2 === 1 ? ' rd-section--alt' : '';
      const eyebrowText = i === 0 ? escapeHtml(eyebrow) : escapeHtml('Weiter aus Ihrer Webseite');
      return `
<section class="rd-section${altClass}">
  <div class="rd-section__inner">
    <div class="rd-section__eyebrow">${eyebrowText}</div>
    <h2 class="rd-section__title">${escapeHtml(s.title)}</h2>
    <div class="rd-section__body">${paras}</div>
    <div class="rd-section__divider" aria-hidden="true"></div>
  </div>
</section>`;
    })
    .join('\n');
  return blocks;
}
