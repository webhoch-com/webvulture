<?php

use App\Jobs\RequestPrototypeGenerationJob;
use App\Models\Lead;
use App\Models\Prototype;
use Livewire\Volt\Component;
use Mary\Traits\Toast;

new class extends Component {
    use Toast;

    public Lead $lead;

    public ?Prototype $prototype = null;

    public function mount(Lead $lead): void
    {
        $this->lead = $lead;
        $this->prototype = Prototype::with(['currentVersion', 'versions' => fn ($q) => $q->latest('version')])
            ->where('lead_id', $lead->id)
            ->first();
    }

    public function regenerate(): void
    {
        RequestPrototypeGenerationJob::dispatch($this->lead->id)->onQueue('generation');
        $this->success('In Warteschlange', 'Neu-Erzeugung gestartet.');
        $this->prototype = $this->prototype?->fresh(['currentVersion', 'versions']);
    }

    public function approve(): void
    {
        if (! $this->prototype?->currentVersion) {
            $this->error('Keine Version', 'Keine veröffentlichte Version zum Freigeben.');
            return;
        }
        $this->lead->update(['status' => \App\Support\Enums\LeadStatus::Approved]);
        $this->success('Freigegeben', 'Lead als freigegeben markiert.');
        $this->lead->refresh();
    }
}; ?>

@php
    $statusLabel = function ($s) {
        return match ($s) {
            'generating' => 'Wird erzeugt',
            'deployed'   => 'Veröffentlicht',
            'failed'     => 'Fehlgeschlagen',
            'pending'    => 'Wartend',
            'queued'     => 'In Warteschlange',
            'building'   => 'Wird gebaut',
            default      => (string) ($s ?? '—'),
        };
    };
    $statusKey = $prototype?->status ?? 'pending';
@endphp

<div class="rev-page">
    <header class="rev-hero">
        <div class="rev-hero-meta">
            <a href="{{ route('leads.show', $lead) }}" class="rev-back">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                Zurück zum Lead
            </a>
            <span class="rev-eyebrow">
                <span class="dot"></span>
                Prototyp-Review · {{ $lead->city ?? '—' }}
            </span>
            <h1 class="rev-title">{{ $lead->name }}</h1>
            @if($prototype)
                <div class="rev-meta-strip">
                    <span class="rev-status rev-status-{{ $statusKey }}">{{ $statusLabel($statusKey) }}</span>
                    <span class="rev-slug">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                        {{ $prototype->slug }}
                    </span>
                </div>
            @endif
        </div>

        <div class="rev-hero-actions">
            <button wire:click="regenerate" class="rev-btn rev-btn-ghost" wire:loading.attr="disabled" wire:target="regenerate">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                <span wire:loading.remove wire:target="regenerate">Neu erzeugen</span>
                <span wire:loading wire:target="regenerate">Wird erzeugt …</span>
            </button>
            @if($prototype?->status === 'deployed')
                <button wire:click="approve" class="rev-btn rev-btn-approve" wire:loading.attr="disabled" wire:target="approve">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    Freigeben
                </button>
            @endif
        </div>
    </header>

    @if(!$prototype)
        <section class="rev-empty">
            <div class="rev-empty-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </div>
            <h2>Noch kein Prototyp</h2>
            <p>Lassen Sie WebVulture die Demo-Webseite generieren — dauert in der Regel 60–90 Sekunden.</p>
            <button wire:click="regenerate" class="rev-btn rev-btn-primary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                Jetzt erzeugen
            </button>
        </section>
    @else
        @if($prototype->currentVersion)
            @php $v = $prototype->currentVersion; @endphp
            <section class="rev-grid">
                <div class="rev-preview">
                    <div class="rev-card-head">
                        <span class="rev-card-eyebrow">Live-Vorschau</span>
                        @if($v->preview_url && \Illuminate\Support\Str::startsWith($v->preview_url, ['http://','https://']))
                            <a href="{{ $v->preview_url }}" target="_blank" rel="noopener noreferrer" class="rev-open-link">
                                In neuem Tab öffnen
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17l9.2-9.2M17 17V7H7"/></svg>
                            </a>
                        @endif
                    </div>

                    @if($v->preview_url && \Illuminate\Support\Str::startsWith($v->preview_url, ['http://','https://']))
                        <div class="rev-iframe-wrap">
                            <iframe src="{{ $v->preview_url }}" title="Prototyp-Vorschau" loading="lazy"
                                referrerpolicy="no-referrer"
                                sandbox="allow-same-origin allow-scripts allow-popups allow-popups-to-escape-sandbox"></iframe>
                        </div>
                    @elseif($v->screenshot_path)
                        <img src="{{ Storage::url($v->screenshot_path) }}" alt="Prototyp-Screenshot" class="rev-screenshot" />
                    @else
                        <div class="rev-placeholder">
                            @if(in_array($prototype->status, ['generating', 'building', 'queued']))
                                <div class="rev-spinner">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" class="rev-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                                </div>
                                <p>Wird gebaut …</p>
                                <small>Astro-Build läuft, in Kürze hier sichtbar.</small>
                            @else
                                Keine Vorschau verfügbar
                            @endif
                        </div>
                    @endif
                </div>

                <aside class="rev-side">
                    <article class="rev-side-card">
                        <span class="rev-card-eyebrow">Aktuelle Version</span>
                        <dl class="rev-meta">
                            <div><dt>Version</dt><dd>v{{ $v->version }}</dd></div>
                            <div><dt>Status</dt><dd>{{ $statusLabel($v->status) }}</dd></div>
                            <div><dt>Hash</dt><dd>{{ $v->artifact_hash ? substr($v->artifact_hash, 0, 10).'…' : '—' }}</dd></div>
                            <div><dt>Erstellt</dt><dd>{{ $v->created_at?->diffForHumans() ?? '—' }}</dd></div>
                        </dl>
                    </article>

                    @if($prototype->versions->count() > 1)
                        <article class="rev-side-card">
                            <span class="rev-card-eyebrow">Versions-Verlauf</span>
                            <ul class="rev-versions">
                                @foreach($prototype->versions as $ver)
                                    <li>
                                        <span class="rev-version-num">v{{ $ver->version }}</span>
                                        <span class="rev-version-status rev-status-{{ $ver->status }}">{{ $statusLabel($ver->status) }}</span>
                                        <time>{{ $ver->created_at->diffForHumans() }}</time>
                                    </li>
                                @endforeach
                            </ul>
                        </article>
                    @endif
                </aside>
            </section>
        @elseif(in_array($prototype->status, ['generating', 'building', 'queued']))
            <section class="rev-building">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" class="rev-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                <h2>Wird gebaut …</h2>
                <p>Astro generiert die Demo-Seite. Dauer: 60–90 Sekunden.</p>
                <button wire:click="$refresh" class="rev-btn rev-btn-ghost">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                    Status aktualisieren
                </button>
            </section>
        @endif
    @endif
</div>

<style>
    .rev-page { display: flex; flex-direction: column; gap: 1.5rem; padding-bottom: 2rem; }

    /* ─── Hero ──────────────────────────────────────────────── */
    .rev-hero {
        position: relative;
        padding: clamp(1.5rem, 3vw, 2.25rem);
        border-radius: 20px;
        background:
            radial-gradient(circle at 0% 0%, rgba(124,58,237,0.18) 0%, transparent 50%),
            radial-gradient(circle at 100% 0%, rgba(236,101,186,0.18) 0%, transparent 50%),
            linear-gradient(135deg, #ffffff 0%, #f5f5f7 100%);
        border: 1px solid rgba(0,0,0,0.06);
        display: grid; gap: 1.5rem; align-items: end;
        grid-template-columns: 1fr;
    }
    @media (min-width: 720px) { .rev-hero { grid-template-columns: 1fr auto; } }

    .rev-back {
        display: inline-flex; align-items: center; gap: 0.4rem;
        font-size: 0.84rem; font-weight: 500;
        color: rgba(10,10,10,0.55);
        text-decoration: none;
        margin-bottom: 1rem;
        transition: color .2s, gap .2s;
    }
    .rev-back:hover { color: #ec65ba; gap: 0.6rem; }
    .rev-eyebrow {
        display: inline-flex; align-items: center; gap: 0.55rem;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.72rem; letter-spacing: 0.14em; text-transform: uppercase;
        color: #c084fc;
        padding: 0.35rem 0.85rem;
        background: rgba(192,132,252,0.08);
        border: 1px solid rgba(192,132,252,0.22);
        border-radius: 999px;
        font-weight: 600;
    }
    .rev-eyebrow .dot {
        width: 6px; height: 6px; border-radius: 50%;
        background: #c084fc;
        animation: pulse-dot 2.4s ease-in-out infinite;
    }
    @keyframes pulse-dot {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.4; transform: scale(0.7); }
    }
    .rev-title {
        font-family: 'Fraunces', Georgia, serif;
        font-size: clamp(1.85rem, 3.5vw, 2.6rem);
        font-weight: 500; letter-spacing: -0.025em; line-height: 1.1;
        color: #0a0a0a;
        margin: 1rem 0 0;
    }
    .rev-meta-strip {
        display: flex; gap: 0.75rem; align-items: center;
        margin-top: 1rem; flex-wrap: wrap;
    }
    .rev-status {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.7rem; letter-spacing: 0.1em; text-transform: uppercase;
        font-weight: 700;
        padding: 0.35rem 0.75rem;
        border-radius: 999px;
    }
    /* Status chips — darkened text colors to pass WCAG AA on white. */
    .rev-status-deployed { background: rgba(16,185,129,0.18); color: #047857; border: 1px solid rgba(16,185,129,0.35); }
    .rev-status-generating, .rev-status-building, .rev-status-queued { background: rgba(245,158,11,0.18); color: #b45309; border: 1px solid rgba(245,158,11,0.35); }
    .rev-status-failed { background: rgba(239,68,68,0.18); color: #b91c1c; border: 1px solid rgba(239,68,68,0.35); }
    .rev-status-pending { background: rgba(0,0,0,0.05); color: rgba(10,10,10,0.7); border: 1px solid rgba(0,0,0,0.12); }
    .rev-slug {
        display: inline-flex; align-items: center; gap: 0.35rem;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.78rem;
        color: rgba(10,10,10,0.5);
    }

    .rev-hero-actions { display: flex; gap: 0.6rem; flex-wrap: wrap; }
    .rev-btn {
        display: inline-flex; align-items: center; gap: 0.5rem;
        padding: 0.7rem 1.2rem;
        border-radius: 9px;
        font-weight: 600; font-size: 0.86rem;
        text-decoration: none;
        cursor: pointer;
        transition: all .2s;
        border: none;
        font-family: inherit;
    }
    .rev-btn-primary {
        background: linear-gradient(135deg, #ec65ba, #7c3aed);
        color: #fff;
        box-shadow: 0 6px 18px -8px rgba(236,101,186,0.5);
    }
    .rev-btn-primary:hover { transform: translateY(-1px); }
    .rev-btn-ghost {
        background: rgba(0,0,0,0.04);
        color: rgba(10,10,10,0.85);
        border: 1px solid rgba(0,0,0,0.1);
    }
    .rev-btn-ghost:hover { background: rgba(0,0,0,0.08); }
    .rev-btn-approve {
        background: linear-gradient(135deg, #10b981, #059669);
        color: #fff;
        box-shadow: 0 6px 18px -8px rgba(16,185,129,0.5);
    }
    .rev-btn-approve:hover { transform: translateY(-1px); }
    .rev-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none !important; }

    /* ─── Grid layout ───────────────────────────────────────── */
    .rev-grid {
        display: grid; gap: 1.25rem;
        grid-template-columns: 1fr;
    }
    @media (min-width: 1100px) { .rev-grid { grid-template-columns: 1fr 320px; } }

    .rev-preview, .rev-side-card {
        background: linear-gradient(180deg, #ffffff, #fafafa);
        border: 1px solid rgba(0,0,0,0.06);
        border-radius: 16px;
        padding: 1.25rem;
    }
    .rev-side { display: flex; flex-direction: column; gap: 1rem; }

    .rev-card-head {
        display: flex; align-items: center; justify-content: space-between;
        margin-bottom: 1rem;
    }
    .rev-card-eyebrow {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.7rem; letter-spacing: 0.14em; text-transform: uppercase;
        color: rgba(10,10,10,0.5);
        font-weight: 700;
    }
    .rev-open-link {
        display: inline-flex; align-items: center; gap: 0.35rem;
        font-size: 0.84rem; font-weight: 600;
        color: #ec65ba;
        text-decoration: none;
        transition: gap .2s;
    }
    .rev-open-link:hover { gap: 0.55rem; }

    .rev-iframe-wrap {
        height: 80vh; min-height: 600px;
        border-radius: 10px;
        overflow: hidden;
        border: 1px solid rgba(0,0,0,0.08);
        background: #fff;
    }
    .rev-iframe-wrap iframe { width: 100%; height: 100%; border: none; }
    .rev-screenshot {
        width: 100%; height: auto; border-radius: 10px;
        border: 1px solid rgba(0,0,0,0.08);
    }
    .rev-placeholder {
        aspect-ratio: 16/10;
        background: rgba(0,0,0,0.02);
        border: 1px dashed rgba(255,255,255,0.1);
        border-radius: 10px;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        gap: 0.5rem;
        color: rgba(10,10,10,0.5);
        text-align: center;
        padding: 2rem;
    }
    .rev-placeholder p { margin: 0; font-weight: 500; color: rgba(10,10,10,0.7); }
    .rev-placeholder small { font-size: 0.82rem; color: rgba(10,10,10,0.4); }

    .rev-spinner { color: #c084fc; }
    .rev-spin { animation: spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }

    /* ─── Sidebar meta ───────────────────────────────────────── */
    .rev-meta {
        display: flex; flex-direction: column;
        margin: 1rem 0 0;
    }
    .rev-meta > div {
        display: flex; justify-content: space-between; align-items: baseline;
        padding: 0.6rem 0;
        border-bottom: 1px solid rgba(0,0,0,0.05);
        gap: 1rem;
    }
    .rev-meta > div:last-child { border-bottom: none; }
    .rev-meta dt {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.72rem; letter-spacing: 0.08em; text-transform: uppercase;
        color: rgba(10,10,10,0.45);
        margin: 0;
    }
    .rev-meta dd {
        font-size: 0.92rem; font-weight: 500;
        color: #0a0a0a;
        margin: 0;
        font-family: 'JetBrains Mono', monospace;
        text-align: right;
    }

    .rev-versions {
        list-style: none; padding: 0; margin: 1rem 0 0;
        display: flex; flex-direction: column; gap: 0.5rem;
    }
    .rev-versions li {
        display: flex; align-items: center; gap: 0.65rem;
        padding: 0.55rem 0.75rem;
        background: rgba(0,0,0,0.02);
        border: 1px solid rgba(0,0,0,0.05);
        border-radius: 8px;
    }
    .rev-version-num {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.84rem; font-weight: 600;
        color: #0a0a0a;
    }
    .rev-version-status {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.66rem; letter-spacing: 0.08em; text-transform: uppercase;
        font-weight: 700;
        padding: 0.18rem 0.5rem;
        border-radius: 4px;
        flex-grow: 1;
        text-align: center;
    }
    .rev-versions time {
        font-size: 0.74rem;
        color: rgba(10,10,10,0.4);
        white-space: nowrap;
    }

    /* ─── Empty / Building ───────────────────────────────────── */
    .rev-empty, .rev-building {
        background: linear-gradient(180deg, #ffffff, #fafafa);
        border: 1px solid rgba(0,0,0,0.06);
        border-radius: 16px;
        padding: 4rem 2rem;
        text-align: center;
    }
    .rev-empty-icon, .rev-building > svg {
        width: 64px; height: 64px;
        margin: 0 auto 1.25rem;
        background: rgba(236,101,186,0.1);
        border: 1px solid rgba(236,101,186,0.25);
        border-radius: 50%;
        display: grid; place-items: center;
        color: #ec65ba;
    }
    .rev-building > svg { background: transparent; border: none; color: #c084fc; width: 40px; height: 40px; }
    .rev-empty h2, .rev-building h2 {
        font-family: 'Fraunces', Georgia, serif;
        font-size: 1.5rem; font-weight: 500;
        color: #0a0a0a;
        margin: 0 0 0.5rem;
    }
    .rev-empty p, .rev-building p {
        color: rgba(10,10,10,0.6);
        font-size: 0.95rem;
        margin: 0 0 1.5rem;
        max-width: 480px;
        margin-inline: auto;
    }
    .rev-empty .rev-btn, .rev-building .rev-btn { margin: 0 auto; }
</style>
