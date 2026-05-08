/**
 * Bestattung template — quiet, dignified, refined.
 * Inspired by funeral-home sites that prioritise calm typography over imagery.
 * Single-column read flow, very minimal accents, no dynamic motion,
 * generous whitespace. Cream background, soft graphite text, minimal navigation.
 */

import type { SiteSpec } from '../types.js';

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function renderBestattungPage(spec: SiteSpec, _slug: string): string {
  const businessName = escapeHtml(spec.business_name);
  const tagline = escapeHtml(spec.tagline);
  const headline = escapeHtml(spec.hero.headline);
  const subhead = escapeHtml(spec.hero.subheadline);

  const services = spec.services && spec.services.length >= 3 ? spec.services : [
    { name: 'Erstversorgung', description: '24-Stunden-Erreichbarkeit. Wir kommen zu Ihnen, wann immer es nötig ist.' },
    { name: 'Trauerfeier-Gestaltung', description: 'Kirchlich, weltlich oder im Familienkreis — ganz nach Ihrem Wunsch.' },
    { name: 'Erd- und Feuerbestattung', description: 'Sämtliche Bestattungsformen, einschließlich naturnaher Alternativen.' },
    { name: 'Vorsorge', description: 'Bestattungsvorsorge zu Lebzeiten — Klarheit für die Familie, Selbstbestimmung für Sie.' },
    { name: 'Behördengänge', description: 'Wir nehmen Ihnen die Formalitäten ab — Standesamt, Versicherungen, Renten.' },
    { name: 'Trauerbegleitung', description: 'Auch nach der Trauerfeier sind wir für Sie und Ihre Familie da.' },
  ];

  const phone = spec.contact.phone ? escapeHtml(spec.contact.phone) : '';
  const email = spec.contact.email ? escapeHtml(spec.contact.email) : '';
  const address = spec.contact.address ? escapeHtml(spec.contact.address) : '';

  return `---
const spec = ${JSON.stringify(spec, null, 2)};
---
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${businessName} — ${tagline}</title>
  <meta name="description" content="${tagline}" />
  <meta name="robots" content="noindex, nofollow" />
  <meta name="theme-color" content="#5d6b7c" />
  <link rel="preconnect" href="https://fonts.bunny.net" crossorigin>
  <link href="https://fonts.bunny.net/css?family=cormorant-garamond:400,500,600|inter:400,500&display=swap" rel="stylesheet">
  <style>
    :root {
      --paper: #f8f7f3;          /* warm parchment */
      --paper-2: #efece5;
      --ink: #2d3138;            /* soft graphite (not black) */
      --ink-2: #5a6068;
      --ink-3: #8b9097;
      --rule: rgba(45,49,56,0.10);
      --accent: #788392;         /* dusty blue-grey */
      --serif: 'Cormorant Garamond', 'Garamond', 'Times New Roman', serif;
      --sans: 'Inter', system-ui, sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body { background: var(--paper); color: var(--ink); font-family: var(--sans); font-size: 17px; line-height: 1.75; -webkit-font-smoothing: antialiased; overflow-x: hidden; }
    img { display: block; max-width: 100%; }
    a { color: inherit; text-decoration: none; }

    .demo-banner {
      background: #1e1a17; color:#fff; padding:0.55rem 1rem; font-size:0.82rem;
      position: relative; z-index: 200;
    }
    .demo-banner-inner { max-width: 1280px; margin: 0 auto; display: flex; align-items: center; gap: 0.85rem; flex-wrap: wrap; justify-content: center; }
    .demo-banner-tag {
      font-size: 0.7rem; letter-spacing: 0.16em; text-transform: uppercase;
      padding: 0.18rem 0.55rem; border-radius: 999px;
      background: rgba(236,101,186,0.22); border: 1px solid rgba(236,101,186,0.5);
      color: #ffd6ee; font-weight: 700; white-space: nowrap;
    }
    .demo-banner a { color: #ffb3df; font-weight: 700; border-bottom: 1px solid rgba(255,179,223,0.45); }

    /* ─── Notruf-Bar (24h) ───────────────────────────────── */
    .notruf {
      background: var(--ink); color: var(--paper);
      padding: 1rem 1.5rem; text-align: center; font-size: 0.95rem;
    }
    .notruf strong { color: #fff; letter-spacing: 0.04em; }
    .notruf a { color: #fff; border-bottom: 1px dotted rgba(255,255,255,0.5); padding-bottom: 1px; font-weight: 600; }

    /* ─── Header ─────────────────────────────────────────── */
    .site-header { background: var(--paper); border-bottom: 1px solid var(--rule); position: relative; }
    .header-inner {
      max-width: 1100px; margin: 0 auto; padding: 1.6rem 1.5rem;
      display: flex; align-items: center; justify-content: space-between; gap: 2rem;
    }
    .brand-mark {
      font-family: var(--serif); font-weight: 500; font-size: 1.6rem; line-height: 1;
      letter-spacing: 0.02em;
    }
    .main-nav { display: none; gap: 2.5rem; font-size: 0.9rem; font-weight: 400; }
    .main-nav a { color: var(--ink-2); transition: color .3s; }
    .main-nav a:hover { color: var(--ink); }
    @media (min-width: 880px) { .main-nav { display: flex; } }
    /* ─── Mobile burger menu ─────────────────────────────── */
    .nav-toggle {
      position: absolute; width: 1px; height: 1px;
      overflow: hidden; clip: rect(0,0,0,0);
      white-space: nowrap; border: 0;
    }
    .nav-toggle:focus-visible ~ .nav-burger { outline: 2px solid currentColor; outline-offset: 3px; }
    .nav-burger {
      display: none; cursor: pointer;
      width: 44px; height: 44px;
      align-items: center; justify-content: center;
      border-radius: 8px; background: transparent;
      border: 1px solid var(--rule, rgba(0,0,0,0.1));
      flex-shrink: 0;
      transition: background .2s, border-color .2s;
    }
    .nav-burger:hover { background: rgba(0,0,0,0.04); }
    .nav-burger span {
      display: block; width: 18px; height: 2px;
      background: currentColor; border-radius: 2px;
      position: relative; transition: transform .25s ease, background .2s ease;
    }
    .nav-burger span::before, .nav-burger span::after {
      content: ""; position: absolute; left: 0;
      width: 18px; height: 2px;
      background: currentColor; border-radius: 2px;
      transition: transform .25s ease, top .25s ease;
    }
    .nav-burger span::before { top: -6px; }
    .nav-burger span::after  { top:  6px; }
    .nav-toggle:checked ~ .nav-burger span { background: transparent; }
    .nav-toggle:checked ~ .nav-burger span::before { top: 0; transform: rotate(45deg); }
    .nav-toggle:checked ~ .nav-burger span::after  { top: 0; transform: rotate(-45deg); }
    @media (max-width: 879px) {
      .nav-burger { display: inline-flex; }
      .main-nav {
        position: absolute; top: 100%; left: 0; right: 0;
        display: flex; flex-direction: column; gap: 0;
        background: var(--paper);
        border-bottom: 1px solid var(--rule, rgba(0,0,0,0.1));
        box-shadow: 0 14px 30px -16px rgba(0,0,0,0.18);
        padding: 0.25rem 1.5rem 1rem;
        transform: translateY(-12px); opacity: 0; pointer-events: none;
        transition: transform .25s ease, opacity .25s ease;
      }
      .main-nav a {
        padding: 0.95rem 0;
        border-bottom: 1px solid var(--rule, rgba(0,0,0,0.1));
        font-size: 1rem;
        min-height: 44px;
        display: flex; align-items: center;
      }
      .main-nav a:last-child { border-bottom: none; }
      .nav-toggle:checked ~ .main-nav {
        transform: translateY(0); opacity: 1; pointer-events: auto;
      }
    }

    /* ─── Hero — sehr ruhig ──────────────────────────────── */
    .hero {
      max-width: 800px; margin: 0 auto;
      padding: clamp(5rem, 10vw, 9rem) 1.5rem clamp(4rem, 7vw, 7rem);
      text-align: center;
    }
    .hero-mark {
      width: 1px; height: 80px; background: var(--accent); margin: 0 auto 2.5rem;
    }
    .hero h1 {
      font-family: var(--serif); font-weight: 400;
      font-size: clamp(2.25rem, 5vw, 3.75rem); line-height: 1.2; letter-spacing: -0.005em;
      color: var(--ink); margin-bottom: 1.75rem;
    }
    .hero h1 em { font-style: italic; color: var(--accent); }
    .hero-sub {
      color: var(--ink-2); font-size: 1.1rem; line-height: 1.8;
      max-width: 560px; margin: 0 auto;
    }

    /* ─── Section base ──────────────────────────────────── */
    .section { padding: clamp(4rem, 7vw, 7rem) 1.5rem; }
    .container { max-width: 1000px; margin: 0 auto; }
    .col-narrow { max-width: 680px; margin: 0 auto; }
    .section-eyebrow {
      font-size: 0.74rem; letter-spacing: 0.22em; text-transform: uppercase;
      color: var(--accent); font-weight: 500; margin-bottom: 1.25rem;
    }
    .section-title {
      font-family: var(--serif); font-weight: 400;
      font-size: clamp(1.85rem, 3.5vw, 2.75rem); line-height: 1.2;
      letter-spacing: -0.01em; margin-bottom: 1.5rem;
    }
    .section-lead { color: var(--ink-2); font-size: 1.05rem; line-height: 1.85; }

    /* ─── Services — single column list ────────────────── */
    .services-list {
      max-width: 720px; margin: 3rem auto 0;
    }
    .service {
      padding: 2rem 0; border-bottom: 1px solid var(--rule);
      display: grid; gap: 0.85rem;
    }
    .service:last-child { border-bottom: none; }
    .service h3 {
      font-family: var(--serif); font-weight: 500; font-size: 1.45rem;
      letter-spacing: -0.005em; line-height: 1.3;
    }
    .service p { color: var(--ink-2); line-height: 1.75; font-size: 1rem; }

    /* ─── Quote / verse block ───────────────────────────── */
    .verse {
      background: var(--paper-2); padding: clamp(4rem, 8vw, 7rem) 1.5rem;
      text-align: center;
    }
    .verse blockquote {
      font-family: var(--serif); font-weight: 400; font-style: italic;
      font-size: clamp(1.5rem, 2.6vw, 2rem); line-height: 1.5;
      max-width: 720px; margin: 0 auto 1.5rem;
      color: var(--ink);
    }
    .verse cite { font-style: normal; color: var(--ink-3); font-size: 0.85rem; letter-spacing: 0.12em; text-transform: uppercase; }

    /* ─── About — single column ─────────────────────────── */
    .about-content { max-width: 680px; margin: 0 auto; }
    .about-content p + p { margin-top: 1.25rem; }

    /* ─── Process / steps ───────────────────────────────── */
    .steps-list { max-width: 720px; margin: 3rem auto 0; }
    .step {
      display: grid; grid-template-columns: auto 1fr; gap: 2rem;
      padding: 1.5rem 0; border-bottom: 1px solid var(--rule);
    }
    .step:last-child { border-bottom: none; }
    .step-num {
      font-family: var(--serif); font-style: italic; font-size: 2rem;
      color: var(--accent); font-weight: 400; line-height: 1;
    }
    .step h4 { font-family: var(--serif); font-weight: 500; font-size: 1.2rem; margin-bottom: 0.4rem; }
    .step p { color: var(--ink-2); }

    /* ─── Contact ───────────────────────────────────────── */
    .contact-section { background: var(--paper-2); }
    .contact-grid {
      max-width: 880px; margin: 3rem auto 0;
      display: grid; gap: 2rem; grid-template-columns: repeat(auto-fit, minmax(min(220px, 100%), 1fr));
    }
    .contact-block { text-align: center; padding: 2rem 1rem; }
    .contact-block .lbl {
      font-size: 0.74rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--ink-3);
      font-weight: 500; margin-bottom: 0.85rem;
    }
    .contact-block .val { font-family: var(--serif); font-size: 1.25rem; line-height: 1.4; }
    .contact-block a:hover { color: var(--accent); }

    /* ─── Footer ────────────────────────────────────────── */
    footer { background: var(--paper); color: var(--ink-3); padding: 3rem 1.5rem; text-align: center; font-size: 0.85rem; border-top: 1px solid var(--rule); }
    footer .brand { font-family: var(--serif); font-size: 1.25rem; color: var(--ink); margin-bottom: 0.4rem; }
    footer .legal { display: flex; gap: 1.5rem; justify-content: center; margin-top: 1rem; flex-wrap: wrap; }
    footer .legal a:hover { color: var(--accent); }

    /* ─── Reveal — very subtle ──────────────────────────── */
    .reveal { opacity: 0; transform: translateY(8px); transition: opacity 1s ease, transform 1s ease; }
    .reveal.is-visible { opacity: 1; transform: translateY(0); }
    @media (prefers-reduced-motion: reduce) { .reveal { opacity: 1 !important; transform: none !important; } }
  </style>
</head>
<body>

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

<div class="notruf" role="contentinfo">
  <strong>Tag und Nacht erreichbar.</strong>
  Notruf 24/7 verfügbar — bitte beachten Sie, dass dies eine Demo-Vorschau ist und die angezeigte Telefonnummer nur als Beispiel dient.
</div>

<header class="site-header">
  <div class="header-inner">
    <a class="brand-mark" href="#">${businessName}</a>
    <input type="checkbox" id="nav-toggle" class="nav-toggle" aria-label="Menü öffnen" />
    <label for="nav-toggle" class="nav-burger" aria-hidden="true"><span></span></label>
    <nav class="main-nav">
      <a href="#begleitung">Begleitung</a>
      <a href="#ablauf">Ablauf</a>
      <a href="#ueber-uns">Über uns</a>
      <a href="#kontakt">Kontakt</a>
    </nav>
  </div>
</header>

<section class="hero">
  <div class="hero-mark" aria-hidden="true"></div>
  <h1>${headline.replace(/(\.|\?)([^.?]*)$/, '<em>$1$2</em>')}</h1>
  <p class="hero-sub">${subhead}</p>
</section>

<section id="begleitung" class="section">
  <div class="container">
    <div class="col-narrow" style="text-align: center;">
      <div class="section-eyebrow">Wie wir begleiten</div>
      <h2 class="section-title">In schweren Stunden steht Klarheit an erster Stelle.</h2>
      <p class="section-lead">Wir nehmen Ihnen ab, was Sie nicht selbst tragen müssen. Diskret, transparent und mit der Zeit, die Sie brauchen.</p>
    </div>
    <div class="services-list">
      ${services.map(s => `
        <article class="service reveal">
          <h3>${escapeHtml(s.name)}</h3>
          <p>${escapeHtml(s.description)}</p>
        </article>
      `).join('')}
    </div>
  </div>
</section>

<section class="verse" aria-label="Zur Erinnerung">
  <blockquote>„Was wir gemeinsam erlebt haben, kann uns niemand mehr nehmen."</blockquote>
  <cite>— gewidmet allen, die loslassen müssen</cite>
</section>

<section id="ablauf" class="section">
  <div class="container">
    <div class="col-narrow" style="text-align: center;">
      <div class="section-eyebrow">Ablauf</div>
      <h2 class="section-title">Schritt für Schritt — in Ihrem Tempo.</h2>
    </div>
    <div class="steps-list">
      <article class="step reveal">
        <div class="step-num">i</div>
        <div>
          <h4>Erstkontakt</h4>
          <p>Sie rufen uns an oder kommen persönlich vorbei. Wir hören zu, ohne Druck. Auf Wunsch besuchen wir Sie auch zu Hause.</p>
        </div>
      </article>
      <article class="step reveal">
        <div class="step-num">ii</div>
        <div>
          <h4>Persönliche Beratung</h4>
          <p>Wir besprechen Ihre Wünsche und die Möglichkeiten — Bestattungsform, Trauerfeier, Erinnerungsstücke. Alles ohne Eile.</p>
        </div>
      </article>
      <article class="step reveal">
        <div class="step-num">iii</div>
        <div>
          <h4>Organisation</h4>
          <p>Wir kümmern uns um alle Behördengänge, Zeremonien und Details. Sie behalten den Überblick, ohne es allein tun zu müssen.</p>
        </div>
      </article>
      <article class="step reveal">
        <div class="step-num">iv</div>
        <div>
          <h4>Trauerfeier</h4>
          <p>Würdige Gestaltung — kirchlich, weltlich oder im engsten Kreis. So, wie es Ihren Werten entspricht.</p>
        </div>
      </article>
      <article class="step reveal">
        <div class="step-num">v</div>
        <div>
          <h4>Nachsorge</h4>
          <p>Auch nach der Bestattung sind wir für Sie da — bei Behörden, Versicherungen oder einfach im Gespräch.</p>
        </div>
      </article>
    </div>
  </div>
</section>

<section id="ueber-uns" class="section" style="background: var(--paper-2);">
  <div class="container">
    <div class="about-content reveal">
      <div class="section-eyebrow">Über uns</div>
      <h2 class="section-title">Persönlich. Diskret. Mit Zeit für jeden Menschen.</h2>
      <p class="section-lead">${escapeHtml(spec.about.body)}</p>
      <p class="section-lead">Wir sind kein Konzern, keine Kette. Sondern ein Familienbetrieb, der seit Jahrzehnten Menschen in der Region begleitet — über Generationen hinweg, in der gleichen Sorgfalt.</p>
    </div>
  </div>
</section>

<section id="kontakt" class="section contact-section">
  <div class="container">
    <div class="col-narrow" style="text-align: center;">
      <div class="section-eyebrow">Kontakt</div>
      <h2 class="section-title">Sie erreichen uns rund um die Uhr.</h2>
      <p class="section-lead">In dringenden Fällen — auch nachts und an Wochenenden.</p>
    </div>
    <div class="contact-grid">
      ${phone ? `<div class="contact-block reveal">
        <div class="lbl">Telefon — 24h</div>
        <div class="val"><a href="tel:${phone.replace(/\s/g, '')}">${phone}</a></div>
      </div>` : ''}
      ${email ? `<div class="contact-block reveal">
        <div class="lbl">E-Mail</div>
        <div class="val"><a href="mailto:${email}">${email}</a></div>
      </div>` : ''}
      ${address ? `<div class="contact-block reveal">
        <div class="lbl">Anschrift</div>
        <div class="val">${address}</div>
      </div>` : ''}
    </div>
  </div>
</section>

<footer>
  <div class="brand">${businessName}</div>
  <div>${tagline}</div>
  <div class="legal">
    <a href="/impressum">Impressum</a>
    <a href="/datenschutz">Datenschutz</a>
  </div>
</footer>

<script>
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('is-visible'); });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px' });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
</script>
</body>
</html>
`;
}
