<?php

use App\Models\CostLog;
use App\Models\Lead;
use App\Models\SearchRun;
use App\Support\CostGuard;
use Livewire\Volt\Component;

new class extends Component {
    public function with(): array
    {
        // Volt's with() does not auto-resolve DI in its arguments — must
        // pull from the container manually.
        $cost = app(CostGuard::class);
        $costToday = (int) CostLog::whereDate('created_at', today())->sum('cost_cents');
        $capCents = $cost->dailyCapCents();

        return [
            'leadsTotal' => Lead::count(),
            'leadsNoSite' => Lead::where('has_website', false)->count(),
            'runsToday' => SearchRun::whereDate('created_at', today())->count(),
            'costToday' => $costToday,
            'costCapCents' => $capCents,
            'costPercent' => $capCents > 0 ? min(100, (int) round($costToday / $capCents * 100)) : 0,
            'recentRuns' => SearchRun::latest()->limit(5)->get(),
            'leadsApproved' => Lead::whereIn('status', ['approved', 'sent', 'replied'])->count(),
        ];
    }
}; ?>

<div class="dash">
    {{-- Hero header --}}
    <header class="dash-hero">
        <div class="dash-hero-meta">
            <span class="dash-eyebrow">
                <span class="dot"></span>
                Steuerzentrale · {{ now()->format('d. F Y') }}
            </span>
            <h1 class="dash-title">Übersicht.</h1>
            <p class="dash-sub">
                Hallo {{ auth()->user()->email ? explode('@', auth()->user()->email)[0] : 'Team' }} —
                heute laufen <strong>{{ $runsToday }}</strong> Discovery-Jobs,
                Tageskosten <strong>{{ number_format($costToday / 100, 2, ',', '.') }} €</strong>.
            </p>
        </div>

        <div class="dash-hero-actions">
            <a href="{{ route('search') }}" class="dash-btn dash-btn-primary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                Neue Discovery
            </a>
            <a href="{{ route('leads.index') }}" class="dash-btn dash-btn-ghost">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                Leads ansehen
            </a>
        </div>
    </header>

    {{-- KPI grid --}}
    <section class="dash-kpis">
        <article class="kpi kpi-pink">
            <div class="kpi-top">
                <span class="kpi-label">Leads · gesamt</span>
                <svg class="kpi-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/></svg>
            </div>
            <strong class="kpi-value">{{ number_format($leadsTotal, 0, ',', '.') }}</strong>
            <span class="kpi-trend">{{ $leadsApproved }} freigegeben</span>
        </article>

        <article class="kpi kpi-amber">
            <div class="kpi-top">
                <span class="kpi-label">Ohne Webseite</span>
                <svg class="kpi-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            </div>
            <strong class="kpi-value">{{ number_format($leadsNoSite, 0, ',', '.') }}</strong>
            <span class="kpi-trend">Top-Zielgruppe für Demos</span>
        </article>

        <article class="kpi kpi-cyan">
            <div class="kpi-top">
                <span class="kpi-label">Discovery · heute</span>
                <svg class="kpi-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            </div>
            <strong class="kpi-value">{{ number_format($runsToday, 0, ',', '.') }}</strong>
            <span class="kpi-trend">Aktive Jobs in der Queue</span>
        </article>

        <article class="kpi kpi-green">
            <div class="kpi-top">
                <span class="kpi-label">Kosten · heute</span>
                <svg class="kpi-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <strong class="kpi-value">{{ number_format($costToday / 100, 2, ',', '.') }} <span class="kpi-currency">€</span></strong>
            @if ($costCapCents > 0)
                <div class="kpi-progress" role="progressbar" aria-valuenow="{{ $costPercent }}" aria-valuemin="0" aria-valuemax="100"
                     aria-label="{{ number_format($costToday / 100, 2, ',', '.') }} € von {{ number_format($costCapCents / 100, 2, ',', '.') }} € Tages-Cap">
                    <span class="kpi-progress-bar" style="width: {{ $costPercent }}%"></span>
                </div>
                <span class="kpi-trend">{{ number_format($costToday / 100, 2, ',', '.') }} € von {{ number_format($costCapCents / 100, 2, ',', '.') }} € Cap</span>
            @else
                <span class="kpi-trend">API-Aufwand · Tagessumme</span>
            @endif
        </article>
    </section>

    {{-- Activity / recent runs --}}
    <section class="dash-activity">
        <div class="dash-section-head">
            <div>
                <span class="dash-section-eyebrow">Aktivität</span>
                <h2 class="dash-section-title">Letzte Suchläufe</h2>
            </div>
            <a href="{{ route('search') }}" class="dash-section-link">
                Alle ansehen
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
            </a>
        </div>

        @if ($recentRuns->isEmpty())
            <div class="dash-empty">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                <h3>Noch keine Discovery-Läufe.</h3>
                <p>Starten Sie Ihre erste Suche — Stadt + Branche reichen.</p>
                <a href="{{ route('search') }}" class="dash-btn dash-btn-primary">Suche starten →</a>
            </div>
        @else
            <ul class="dash-runs">
                @foreach ($recentRuns as $run)
                    <li class="dash-run">
                        <div class="dash-run-time">
                            <strong>{{ $run->created_at->format('d.m.') }}</strong>
                            <span>{{ $run->created_at->format('H:i') }}</span>
                        </div>
                        <div class="dash-run-info">
                            <h4>{{ $run->city }}</h4>
                            <span class="dash-run-keyword">{{ $run->keyword ?: 'Branche: beliebig' }}</span>
                        </div>
                        <div class="dash-run-meta">
                            <span class="dash-run-stat" title="Gefundene Leads">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="7" r="4"/><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/></svg>
                                {{ $run->leads_count }}
                            </span>
                            <span class="dash-run-stat" title="API-Kosten">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                                {{ number_format($run->cost_cents / 100, 2, ',', '.') }} €
                            </span>
                            <span class="dash-run-status dash-status-{{ $run->status?->value ?? 'queued' }}">
                                {{ $run->status?->label() ?? 'In Warteschlange' }}
                            </span>
                        </div>
                    </li>
                @endforeach
            </ul>
        @endif
    </section>
</div>

<style>
    .dash { display: flex; flex-direction: column; gap: 2rem; padding-bottom: 2rem; }

    /* ─── HERO ─────────────────────────────────────────────── */
    .dash-hero {
        position: relative;
        padding: clamp(1.75rem, 3vw, 2.5rem);
        border-radius: 24px;
        background:
            radial-gradient(circle at 0% 0%, rgba(236,101,186,0.18) 0%, transparent 50%),
            radial-gradient(circle at 100% 100%, rgba(124,58,237,0.18) 0%, transparent 50%),
            linear-gradient(135deg, #ffffff 0%, #f5f5f7 100%);
        border: 1px solid rgba(0,0,0,0.06);
        overflow: hidden;
        display: grid; gap: 2rem; align-items: end;
        grid-template-columns: 1fr;
    }
    @media (min-width: 720px) { .dash-hero { grid-template-columns: 1fr auto; } }
    .dash-hero::before {
        content: ""; position: absolute; inset: 0;
        background-image:
            linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
        background-size: 40px 40px;
        mask-image: radial-gradient(ellipse at center, black 30%, transparent 80%);
        -webkit-mask-image: radial-gradient(ellipse at center, black 30%, transparent 80%);
        pointer-events: none;
    }

    .dash-hero-meta { position: relative; z-index: 1; }
    .dash-eyebrow {
        display: inline-flex; align-items: center; gap: 0.55rem;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.72rem; letter-spacing: 0.14em; text-transform: uppercase;
        color: #be185d;
        padding: 0.35rem 0.85rem;
        background: rgba(236,101,186,0.12);
        border: 1px solid rgba(236,101,186,0.3);
        border-radius: 999px;
        font-weight: 600;
    }
    .dash-eyebrow .dot {
        width: 6px; height: 6px; border-radius: 50%;
        background: #ec65ba;
        animation: pulse-dot 2.4s ease-in-out infinite;
    }
    @keyframes pulse-dot {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.4; transform: scale(0.7); }
    }
    .dash-title {
        font-family: 'Fraunces', Georgia, serif;
        font-size: clamp(2.5rem, 4.5vw, 3.75rem);
        font-weight: 500;
        letter-spacing: -0.03em;
        line-height: 1;
        margin: 1rem 0 0.85rem;
        color: #0a0a0a;
    }
    .dash-sub {
        color: rgba(10,10,10,0.65);
        font-size: 1rem;
        line-height: 1.65;
        margin: 0;
        max-width: 60ch;
    }
    .dash-sub strong { color: #0a0a0a; font-weight: 600; }

    .dash-hero-actions {
        display: flex; gap: 0.75rem; flex-wrap: wrap;
        position: relative; z-index: 1;
    }
    .dash-btn {
        display: inline-flex; align-items: center; gap: 0.55rem;
        padding: 0.85rem 1.4rem;
        border-radius: 10px;
        font-weight: 600; font-size: 0.92rem;
        text-decoration: none;
        transition: all .2s;
        cursor: pointer;
        border: none;
        font-family: inherit;
    }
    .dash-btn-primary {
        background: linear-gradient(135deg, #ec65ba, #7c3aed);
        color: #fff;
        box-shadow: 0 8px 22px -8px rgba(236,101,186,0.5);
    }
    .dash-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 28px -8px rgba(236,101,186,0.65); }
    .dash-btn-ghost {
        background: rgba(0,0,0,0.04);
        color: rgba(10,10,10,0.85);
        border: 1px solid rgba(0,0,0,0.1);
    }
    .dash-btn-ghost:hover { background: rgba(0,0,0,0.08); border-color: rgba(0,0,0,0.18); }

    /* ─── KPI cards ─────────────────────────────────────────── */
    .dash-kpis {
        display: grid; gap: 1rem;
        grid-template-columns: repeat(auto-fit, minmax(min(220px, 100%), 1fr));
    }
    @media (min-width: 720px) { .dash-kpis { grid-template-columns: repeat(4, 1fr); } }
    .kpi {
        position: relative;
        padding: 1.5rem;
        background: linear-gradient(180deg, #ffffff, #fafafa);
        border: 1px solid rgba(0,0,0,0.06);
        border-radius: 16px;
        overflow: hidden;
        transition: transform .25s, border-color .25s, box-shadow .25s;
    }
    .kpi::before {
        content: ""; position: absolute; top: 0; left: 0; right: 0; height: 2px;
        background: var(--kpi-color, #ec65ba);
        opacity: 0.7;
    }
    .kpi::after {
        content: ""; position: absolute; bottom: -40px; right: -40px;
        width: 140px; height: 140px; border-radius: 50%;
        background: radial-gradient(circle, var(--kpi-color, #ec65ba) 0%, transparent 70%);
        opacity: 0.08; pointer-events: none;
    }
    .kpi:hover { transform: translateY(-2px); border-color: rgba(0,0,0,0.12); }
    .kpi-pink  { --kpi-color: #ec65ba; }
    .kpi-amber { --kpi-color: #f59e0b; }
    .kpi-cyan  { --kpi-color: #06b6d4; }
    .kpi-green { --kpi-color: #10b981; }

    .kpi-top {
        display: flex; align-items: center; justify-content: space-between;
        margin-bottom: 1rem;
    }
    .kpi-label {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.7rem; letter-spacing: 0.12em; text-transform: uppercase;
        color: rgba(10,10,10,0.55);
        font-weight: 600;
    }
    .kpi-icon {
        color: var(--kpi-color);
        opacity: 0.9;
    }
    .kpi-value {
        display: block;
        font-family: 'Fraunces', Georgia, serif;
        font-size: clamp(2.2rem, 3.5vw, 2.85rem);
        font-weight: 500;
        line-height: 1;
        color: #0a0a0a;
        letter-spacing: -0.02em;
    }
    .kpi-currency {
        font-size: 0.65em; color: var(--kpi-color);
        font-weight: 500; margin-left: 0.1em;
    }
    .kpi-trend {
        display: block;
        font-size: 0.84rem;
        color: rgba(10,10,10,0.5);
        margin-top: 0.55rem;
    }
    /* Cost-cap progress bar — colour ramps from green → amber → red as
       Tagesausgabe das Cap erreicht. Lets the user see at a glance how
       viel Budget noch verfügbar ist statt erst eine 429-Fehlermeldung
       beim Bulk-Discovery zu sehen. */
    .kpi-progress {
        display: block; height: 6px; width: 100%;
        background: rgba(0,0,0,0.06);
        border-radius: 999px; overflow: hidden;
        margin-top: 0.85rem;
    }
    .kpi-progress-bar {
        display: block; height: 100%;
        background: var(--kpi-color, #047857);
        border-radius: inherit;
        transition: width .4s cubic-bezier(.2,.8,.2,1);
    }
    /* Bei >=80% wird's amber, >=95% rot — visueller Frühwarner */
    .kpi-progress[aria-valuenow="80"] .kpi-progress-bar,
    .kpi-progress[aria-valuenow="81"] .kpi-progress-bar,
    .kpi-progress[aria-valuenow="82"] .kpi-progress-bar,
    .kpi-progress[aria-valuenow="83"] .kpi-progress-bar,
    .kpi-progress[aria-valuenow="84"] .kpi-progress-bar,
    .kpi-progress[aria-valuenow="85"] .kpi-progress-bar,
    .kpi-progress[aria-valuenow="86"] .kpi-progress-bar,
    .kpi-progress[aria-valuenow="87"] .kpi-progress-bar,
    .kpi-progress[aria-valuenow="88"] .kpi-progress-bar,
    .kpi-progress[aria-valuenow="89"] .kpi-progress-bar,
    .kpi-progress[aria-valuenow="90"] .kpi-progress-bar,
    .kpi-progress[aria-valuenow="91"] .kpi-progress-bar,
    .kpi-progress[aria-valuenow="92"] .kpi-progress-bar,
    .kpi-progress[aria-valuenow="93"] .kpi-progress-bar,
    .kpi-progress[aria-valuenow="94"] .kpi-progress-bar { background: #b45309; }
    .kpi-progress[aria-valuenow="95"] .kpi-progress-bar,
    .kpi-progress[aria-valuenow="96"] .kpi-progress-bar,
    .kpi-progress[aria-valuenow="97"] .kpi-progress-bar,
    .kpi-progress[aria-valuenow="98"] .kpi-progress-bar,
    .kpi-progress[aria-valuenow="99"] .kpi-progress-bar,
    .kpi-progress[aria-valuenow="100"] .kpi-progress-bar { background: #b91c1c; }

    /* ─── Activity section ──────────────────────────────────── */
    .dash-activity {
        background: linear-gradient(180deg, #ffffff, #fafafa);
        border: 1px solid rgba(0,0,0,0.06);
        border-radius: 20px;
        padding: clamp(1.5rem, 3vw, 2rem);
    }
    .dash-section-head {
        display: flex; align-items: center; justify-content: space-between;
        margin-bottom: 1.5rem; gap: 1rem; flex-wrap: wrap;
    }
    .dash-section-eyebrow {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.7rem; letter-spacing: 0.14em; text-transform: uppercase;
        color: rgba(10,10,10,0.5);
        font-weight: 600;
        display: block; margin-bottom: 0.4rem;
    }
    .dash-section-title {
        font-family: 'Fraunces', Georgia, serif;
        font-size: 1.6rem;
        font-weight: 500;
        letter-spacing: -0.015em;
        margin: 0;
        color: #0a0a0a;
    }
    .dash-section-link {
        display: inline-flex; align-items: center; gap: 0.4rem;
        color: #ec65ba;
        font-size: 0.88rem; font-weight: 600;
        text-decoration: none;
        transition: gap .2s;
    }
    .dash-section-link:hover { gap: 0.65rem; }

    .dash-runs { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.5rem; }
    .dash-run {
        display: grid; gap: 1rem;
        grid-template-columns: 1fr;
        padding: 1rem 1.25rem;
        background: rgba(0,0,0,0.02);
        border: 1px solid rgba(0,0,0,0.05);
        border-radius: 12px;
        transition: all .2s;
    }
    @media (min-width: 720px) {
        .dash-run { grid-template-columns: 90px 1fr auto; align-items: center; }
    }
    .dash-run:hover {
        background: #ffffff;
        border-color: rgba(236,101,186,0.25);
        transform: translateX(2px);
    }
    .dash-run-time {
        font-family: 'JetBrains Mono', monospace;
        text-align: center;
    }
    .dash-run-time strong {
        display: block;
        font-family: 'Fraunces', Georgia, serif;
        font-size: 1.15rem;
        font-weight: 500;
        color: #0a0a0a;
        line-height: 1.1;
    }
    .dash-run-time span {
        display: block;
        font-size: 0.7rem;
        color: rgba(10,10,10,0.45);
        letter-spacing: 0.05em;
        margin-top: 0.2rem;
    }
    .dash-run-info h4 {
        font-size: 1rem; font-weight: 600;
        color: #0a0a0a;
        margin: 0 0 0.2rem;
        letter-spacing: -0.01em;
    }
    .dash-run-keyword {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.78rem;
        color: rgba(10,10,10,0.55);
    }
    .dash-run-meta {
        display: flex; align-items: center; gap: 0.85rem;
        font-size: 0.85rem;
        flex-wrap: wrap;
    }
    .dash-run-stat {
        display: inline-flex; align-items: center; gap: 0.35rem;
        color: rgba(10,10,10,0.7);
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.8rem;
    }
    .dash-run-status {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.7rem; letter-spacing: 0.1em; text-transform: uppercase;
        font-weight: 600;
        padding: 0.3rem 0.7rem;
        border-radius: 999px;
        white-space: nowrap;
    }
    /* Status chips — darkened text colors to pass WCAG AA on white. */
    .dash-status-done, .dash-status-completed { background: rgba(16,185,129,0.18); color: #047857; border: 1px solid rgba(16,185,129,0.35); }
    .dash-status-running   { background: rgba(6,182,212,0.18);  color: #0e7490; border: 1px solid rgba(6,182,212,0.35); }
    .dash-status-failed    { background: rgba(239,68,68,0.18);  color: #b91c1c; border: 1px solid rgba(239,68,68,0.35); }
    .dash-status-queued, .dash-status-pending { background: rgba(245,158,11,0.18); color: #b45309; border: 1px solid rgba(245,158,11,0.35); }

    /* ─── Empty state ───────────────────────────────────────── */
    .dash-empty {
        text-align: center;
        padding: 3rem 1.5rem;
        color: rgba(10,10,10,0.6);
    }
    .dash-empty svg { color: rgba(236,101,186,0.5); margin: 0 auto 1.25rem; }
    .dash-empty h3 {
        font-family: 'Fraunces', Georgia, serif;
        font-size: 1.4rem; font-weight: 500;
        color: #0a0a0a;
        margin: 0 0 0.5rem;
    }
    .dash-empty p { margin: 0 0 1.5rem; font-size: 0.95rem; }
    .dash-empty .dash-btn { margin: 0 auto; }
</style>
