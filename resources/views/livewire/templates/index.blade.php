<?php

use App\Models\Prototype;
use App\Support\Enums\LayoutKind;
use Livewire\Volt\Component;

new class extends Component {
    public function with(): array
    {
        $previewDomain = config('services.preview_host.root_domain', 'webseiten-werkstatt.at');
        $previewScheme = config('services.preview_host.scheme', 'https');

        // Real-leads-only filter for the visible counter and the example grid.
        // Bare-template seeds (built by build-demos.ts) have NO lead_id, so
        // gating on `whereNotNull('lead_id')` cleanly separates them from
        // real prospect demos — both groups carry a `demo-` slug prefix today,
        // so a slug-pattern filter would wipe out everything.
        $realDemos = Prototype::query()
            ->whereNotNull('slug')
            ->whereNotNull('lead_id')
            ->where('status', '!=', 'failed')
            ->with('lead:id,name,city,category');

        $examplesByLayout = (clone $realDemos)
            ->latest('id')
            ->get()
            ->groupBy('layout_kind')
            ->map(fn ($group) => $group->take(3))
            ->all();

        // Honest active-count: counts every real prospect demo, NOT the
        // take(3)-truncated example grid above.
        $totalActive = (clone $realDemos)->count();

        return [
            'layouts' => LayoutKind::cases(),
            'examplesByLayout' => $examplesByLayout,
            'previewBase' => "{$previewScheme}://__SLUG__.{$previewDomain}",
            'totalActive' => $totalActive,
        ];
    }
}; ?>

@php
    /** Branche → Akzentfarbe für Karten (Hex). */
    $brancheColors = [
        'restaurant' => '#c2410c',
        'kanzlei' => '#1e3a8a',
        'bestattung' => '#788392',
        'galerie' => '#e8c97a',
        'friseur' => '#ec4899',
        'arzt' => '#0e7490',
        'hotel' => '#b08d57',
        'handwerk' => '#c2410c',
        'fitness' => '#d4ff00',
        'einzelhandel' => '#c08778',
        'autohaus' => '#c8a45c',
        'energie' => '#3a5a40',
        'tier' => '#c0633e',
        'verein' => '#2d4a32',
        'standard' => '#4f46e5',
    ];
@endphp

<div class="tpl-page">
    <header class="tpl-hero">
        <span class="tpl-eyebrow">
            <span class="dot"></span>
            {{ count($layouts) }} Branchen-Templates · alle live
        </span>
        <h1 class="tpl-title">
            Design-<em>Vorlagen</em>.
        </h1>
        <p class="tpl-lead">
            Für jede Branche ein eigenes, professionelles Layout — automatisch passend zum Lead.
            Klicken Sie auf eine Karte und sehen Sie die Demo-Webseite.
        </p>
    </header>

    <section class="tpl-stat-strip">
        <div class="tpl-stat">
            <strong>{{ count($layouts) }}</strong>
            <span>Branchen-Templates</span>
        </div>
        <div class="tpl-stat">
            <strong>{{ $totalActive }}</strong>
            <span>Aktive Lead-Demos</span>
        </div>
    </section>

    <section class="tpl-grid">
        @foreach($layouts as $layout)
            @php
                $examples = $examplesByLayout[$layout->value] ?? collect();
                $count = is_countable($examples) ? count($examples) : 0;
                // DNS hostnames disallow underscores. The build-demos.ts pipeline
                // converts `verein_musik` → `verein-musik` when writing demo
                // directories, so the URL must use the same hyphen form.
                $demoSlug = 'demo-'.str_replace('_', '-', $layout->value);
                $demoUrl = str_replace('__SLUG__', $demoSlug, $previewBase);
                $accent = $brancheColors[$layout->value] ?? '#ec65ba';
            @endphp
            <article class="tpl-card" style="--accent: {{ $accent }};">
                <div class="tpl-card-glow" aria-hidden="true"></div>

                <header class="tpl-card-head">
                    <div class="tpl-card-emoji">{{ $layout->emoji() }}</div>
                    <div class="tpl-card-title">
                        <h3>{{ $layout->label() }}</h3>
                        <code>{{ $layout->value }}</code>
                    </div>
                    @if($count > 0)
                        <span class="tpl-card-badge">{{ $count }} live</span>
                    @endif
                </header>

                <p class="tpl-card-desc">{{ $layout->description() }}</p>

                <a href="{{ $demoUrl }}" target="_blank" rel="noopener noreferrer" class="tpl-card-cta">
                    <span>
                        <strong>Leere Vorlage ansehen</strong>
                        <small>Demo mit branchen-typischen Platzhaltern</small>
                    </span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17l9.2-9.2M17 17V7H7"/></svg>
                </a>

                @if($count > 0)
                    <div class="tpl-card-examples">
                        <div class="tpl-card-examples-title">Live-Beispiele · echte Leads</div>
                        @foreach($examples as $proto)
                            @php $url = str_replace('__SLUG__', $proto->slug, $previewBase); @endphp
                            <a href="{{ $url }}" target="_blank" rel="noopener noreferrer" class="tpl-card-example">
                                <div>
                                    <div class="ex-name">{{ $proto->lead->name ?? $proto->slug }}</div>
                                    <div class="ex-meta">{{ $proto->lead->city ?? '' }}{{ $proto->lead->category ? ' · '.$proto->lead->category : '' }}</div>
                                </div>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17l9.2-9.2M17 17V7H7"/></svg>
                            </a>
                        @endforeach
                    </div>
                @endif
            </article>
        @endforeach
    </section>

    <aside class="tpl-tip">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-7 7c0 3 2 5 3 6 .5.5 1 1.5 1 3h6c0-1.5.5-2.5 1-3 1-1 3-3 3-6a7 7 0 0 0-7-7z"/></svg>
        <div>
            <strong>Tipp:</strong> Die Demo-Vorlagen werden serverseitig vor-gerendert
            <code>generator/src/build-demos.ts</code>. Bei Server-Reset neu bauen mit
            <code>cd generator &amp;&amp; node dist/build-demos.js &lt;branche&gt;</code>.
        </div>
    </aside>
</div>

<style>
    .tpl-page { display: flex; flex-direction: column; gap: 2rem; padding-bottom: 2rem; }

    /* ─── Hero ──────────────────────────────────────────────── */
    .tpl-hero { text-align: center; padding-top: 0.5rem; }
    .tpl-eyebrow {
        display: inline-flex; align-items: center; gap: 0.55rem;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.72rem; letter-spacing: 0.14em; text-transform: uppercase;
        color: #ec65ba;
        padding: 0.4rem 0.95rem;
        background: rgba(236,101,186,0.08);
        border: 1px solid rgba(236,101,186,0.22);
        border-radius: 999px;
        font-weight: 600;
        margin-bottom: 1.5rem;
    }
    .tpl-eyebrow .dot {
        width: 6px; height: 6px; border-radius: 50%;
        background: #ec65ba;
        animation: pulse-dot 2.4s ease-in-out infinite;
    }
    @keyframes pulse-dot {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.4; transform: scale(0.7); }
    }
    .tpl-title {
        font-family: 'Fraunces', Georgia, serif;
        font-size: clamp(2.5rem, 5vw, 3.85rem);
        font-weight: 500; letter-spacing: -0.03em; line-height: 1;
        margin: 0 0 1rem; color: #0a0a0a;
    }
    .tpl-title em {
        font-style: italic;
        background: linear-gradient(120deg, #ec65ba 0%, #c084fc 50%, #7c3aed 100%);
        -webkit-background-clip: text; background-clip: text;
        color: transparent; font-weight: 500;
    }
    .tpl-lead {
        color: rgba(10,10,10,0.65);
        font-size: 1.05rem; line-height: 1.65;
        margin: 0 auto; max-width: 60ch;
    }

    /* ─── Stat strip ────────────────────────────────────────── */
    .tpl-stat-strip {
        display: grid; gap: 1rem;
        grid-template-columns: repeat(3, 1fr);
        background: linear-gradient(180deg, #ffffff, #fafafa);
        border: 1px solid rgba(0,0,0,0.06);
        border-radius: 16px;
        padding: 1.5rem;
    }
    .tpl-stat { text-align: center; }
    .tpl-stat strong {
        display: block;
        font-family: 'Fraunces', Georgia, serif;
        font-size: clamp(1.6rem, 3vw, 2.2rem);
        font-weight: 500; line-height: 1;
        color: #0a0a0a; letter-spacing: -0.02em;
        background: linear-gradient(120deg, #1f1147, #7c3aed);
        -webkit-background-clip: text; background-clip: text;
        color: transparent;
    }
    .tpl-stat span {
        display: block;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.7rem; letter-spacing: 0.12em; text-transform: uppercase;
        color: rgba(10,10,10,0.5);
        margin-top: 0.5rem;
    }

    /* ─── Card grid ─────────────────────────────────────────── */
    .tpl-grid {
        display: grid; gap: 1.25rem;
        grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 1fr));
    }
    @media (min-width: 1100px) { .tpl-grid { grid-template-columns: repeat(3, 1fr); } }

    .tpl-card {
        position: relative;
        background: linear-gradient(180deg, #ffffff, #fafafa);
        border: 1px solid rgba(0,0,0,0.06);
        border-radius: 18px;
        padding: 1.5rem 1.5rem 1.25rem;
        display: flex; flex-direction: column;
        transition: transform .25s, border-color .25s, box-shadow .25s;
        overflow: hidden;
    }
    .tpl-card::before {
        content: ""; position: absolute; top: 0; left: 0; right: 0; height: 3px;
        background: var(--accent); opacity: 0.85;
    }
    .tpl-card-glow {
        position: absolute; top: -60px; right: -60px;
        width: 200px; height: 200px; border-radius: 50%;
        background: radial-gradient(circle, var(--accent) 0%, transparent 65%);
        opacity: 0.1; pointer-events: none;
    }
    .tpl-card:hover {
        transform: translateY(-3px);
        border-color: color-mix(in oklch, var(--accent) 35%, rgba(255,255,255,0.1));
        box-shadow: 0 20px 40px -16px rgba(0,0,0,0.4);
    }
    .tpl-card:hover .tpl-card-glow { opacity: 0.18; }

    .tpl-card-head {
        display: flex; align-items: flex-start; gap: 0.85rem;
        margin-bottom: 1rem;
    }
    .tpl-card-emoji {
        font-size: 1.9rem;
        line-height: 1;
        flex-shrink: 0;
        filter: saturate(1.1);
    }
    .tpl-card-title { flex: 1; min-width: 0; }
    .tpl-card-title h3 {
        font-family: 'Fraunces', Georgia, serif;
        font-size: 1.15rem;
        font-weight: 500;
        color: #0a0a0a;
        margin: 0 0 0.15rem;
        letter-spacing: -0.01em;
        line-height: 1.2;
    }
    .tpl-card-title code {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.7rem;
        color: rgba(10,10,10,0.4);
        background: rgba(0,0,0,0.04);
        padding: 0.15rem 0.45rem;
        border-radius: 4px;
    }
    .tpl-card-badge {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.65rem; letter-spacing: 0.1em; text-transform: uppercase;
        font-weight: 700;
        color: #34d399;
        background: rgba(16,185,129,0.12);
        border: 1px solid rgba(16,185,129,0.3);
        padding: 0.3rem 0.55rem;
        border-radius: 999px;
        white-space: nowrap;
    }

    .tpl-card-desc {
        color: rgba(10,10,10,0.65);
        font-size: 0.9rem;
        line-height: 1.6;
        margin: 0 0 1.25rem;
        flex-grow: 1;
    }

    .tpl-card-cta {
        display: flex; align-items: center; justify-content: space-between;
        gap: 0.85rem;
        padding: 0.85rem 1rem;
        background: color-mix(in oklch, var(--accent) 14%, transparent);
        border: 1px solid color-mix(in oklch, var(--accent) 35%, transparent);
        border-radius: 10px;
        text-decoration: none;
        color: var(--accent);
        transition: all .2s;
        margin-bottom: 0.5rem;
    }
    .tpl-card-cta:hover {
        background: color-mix(in oklch, var(--accent) 22%, transparent);
        border-color: var(--accent);
        transform: translateX(2px);
    }
    .tpl-card-cta strong {
        display: block;
        font-size: 0.92rem; font-weight: 600;
        margin-bottom: 0.1rem;
    }
    .tpl-card-cta small {
        display: block;
        font-size: 0.78rem;
        color: color-mix(in oklch, var(--accent) 75%, white);
        opacity: 0.85;
    }
    .tpl-card-cta svg { flex-shrink: 0; }

    .tpl-card-examples {
        margin-top: 0.85rem; padding-top: 0.85rem;
        border-top: 1px solid rgba(0,0,0,0.06);
        display: flex; flex-direction: column; gap: 0.4rem;
    }
    .tpl-card-examples-title {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.62rem; letter-spacing: 0.14em; text-transform: uppercase;
        color: rgba(10,10,10,0.4);
        font-weight: 700;
        margin-bottom: 0.4rem;
    }
    .tpl-card-example {
        display: flex; align-items: center; justify-content: space-between;
        gap: 0.75rem;
        padding: 0.5rem 0.75rem;
        border-radius: 6px;
        background: rgba(0,0,0,0.02);
        text-decoration: none;
        transition: all .2s;
    }
    .tpl-card-example:hover {
        background: rgba(0,0,0,0.05);
        color: var(--accent);
    }
    .tpl-card-example .ex-name {
        font-size: 0.85rem; font-weight: 500;
        color: rgba(10,10,10,0.85);
        line-height: 1.2;
    }
    .tpl-card-example .ex-meta {
        font-size: 0.74rem;
        color: rgba(10,10,10,0.45);
        margin-top: 0.15rem;
    }
    .tpl-card-example svg {
        color: rgba(10,10,10,0.3);
        flex-shrink: 0;
        transition: color .2s;
    }
    .tpl-card-example:hover svg { color: var(--accent); }

    /* ─── Tip card ───────────────────────────────────────────── */
    .tpl-tip {
        display: flex; gap: 1rem;
        background: rgba(245,158,11,0.05);
        border: 1px solid rgba(245,158,11,0.2);
        border-radius: 14px;
        padding: 1.25rem 1.5rem;
        align-items: flex-start;
    }
    .tpl-tip svg { color: #f59e0b; flex-shrink: 0; margin-top: 0.1rem; }
    .tpl-tip > div {
        font-size: 0.92rem;
        color: rgba(10,10,10,0.7);
        line-height: 1.65;
    }
    .tpl-tip strong { color: #0a0a0a; font-weight: 600; }
    .tpl-tip code {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.82rem;
        background: rgba(0,0,0,0.05);
        padding: 0.1rem 0.4rem;
        border-radius: 4px;
        color: #fbbf24;
    }
</style>
