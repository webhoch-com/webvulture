<?php

use App\Jobs\DiscoverLeadsJob;
use App\Livewire\Forms\SearchForm;
use App\Models\SearchRun;
use Livewire\Volt\Component;

new class extends Component {
    public SearchForm $form;

    public function submit(): void
    {
        $this->validate();

        $run = SearchRun::create([
            'city' => $this->form->city,
            'keyword' => $this->form->keyword,
            'limit' => $this->form->limit,
            'filters' => [
                'only_without_website' => $this->form->only_without_website,
                'min_rating' => $this->form->min_rating,
                'min_reviews' => $this->form->min_reviews,
            ],
        ]);

        DiscoverLeadsJob::dispatch($run->id)->onQueue('discovery');

        $this->form->reset('keyword', 'min_rating', 'min_reviews');
        $this->redirectRoute('leads.index', navigate: true);
    }
}; ?>

<div class="search-page">
    <header class="search-hero">
        <span class="search-eyebrow">
            <span class="dot"></span>
            Discovery · Google Places API
        </span>
        <h1 class="search-title">
            Leads <em>aufspüren</em>.
        </h1>
        <p class="search-lead">
            Stadt + Branche eingeben — wir scannen Google Maps, filtern nach Ihren Kriterien
            und legen die Treffer im Leads-Pool ab.
        </p>
    </header>

    <form wire:submit="submit" class="search-card">
        <div class="search-card-glow"></div>

        <div class="search-grid">
            <div class="search-field search-field-wide">
                <label for="search-city">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    Stadt <span class="req">*</span>
                </label>
                <input id="search-city" type="text" wire:model="form.city" placeholder="z. B. Salzburg" required class="search-input" />
                @error('form.city') <span class="search-error">{{ $message }}</span> @enderror
            </div>

            <div class="search-field search-field-wide">
                <label for="search-keyword">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                    Branche · Stichwort
                </label>
                <input id="search-keyword" type="text" wire:model="form.keyword" placeholder="z. B. Zahnarzt, Friseur, Restaurant" class="search-input" />
            </div>

            <div class="search-field">
                <label for="search-limit">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>
                    Ergebnisse · Limit
                </label>
                <input id="search-limit" type="number" min="1" max="20" wire:model="form.limit" class="search-input" />
            </div>

            <div class="search-field">
                <label for="search-rating">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    Min. Bewertung
                </label>
                <input id="search-rating" type="number" step="0.1" min="0" max="5" wire:model="form.min_rating" placeholder="4.0" class="search-input" />
            </div>

            <div class="search-field">
                <label for="search-reviews">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    Min. Rezensionen
                </label>
                <input id="search-reviews" type="number" min="0" wire:model="form.min_reviews" placeholder="20" class="search-input" />
            </div>

            <label class="search-toggle search-field-wide">
                <input type="checkbox" wire:model="form.only_without_website" />
                <span class="search-toggle-pill">
                    <span class="search-toggle-knob"></span>
                </span>
                <span class="search-toggle-text">
                    <strong>Nur Betriebe ohne Website</strong>
                    <small>Top-Zielgruppe für Demo-Sites — die wollen redesignen lassen.</small>
                </span>
            </label>
        </div>

        <div class="search-actions">
            <button type="button" class="search-btn search-btn-ghost" @click="$wire.form.reset()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                Zurücksetzen
            </button>
            <button type="submit" class="search-btn search-btn-primary" wire:loading.attr="disabled" wire:target="submit">
                <span wire:loading.remove wire:target="submit" style="display: inline-flex; align-items: center; gap: 0.55rem;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                    Discovery starten
                </span>
                <span wire:loading.flex wire:target="submit" style="display: none; align-items: center; gap: 0.55rem;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" class="search-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                    Wird gestartet …
                </span>
            </button>
        </div>
    </form>

    <aside class="search-tips">
        <h3>Tipps für bessere Ergebnisse</h3>
        <ul>
            <li><strong>Genaue Stadt</strong> — „Salzburg" liefert besser als „Salzburg-Umgebung". Kleinere Orte mit Postleitzahl ergänzen.</li>
            <li><strong>Stichwort spezifisch</strong> — „Friseur Damen" filtert besser als nur „Friseur".</li>
            <li><strong>Min. 4.0★ + 20 Rezensionen</strong> — etablierte Betriebe mit Budget für Webseiten.</li>
            <li><strong>Ohne Website</strong> ankreuzen — sofortige Demo-Kandidaten, hohe Conversion-Chance.</li>
        </ul>
    </aside>
</div>

<style>
    .search-page {
        max-width: 880px; margin: 0 auto;
        display: flex; flex-direction: column; gap: 2rem;
        padding-bottom: 2rem;
    }

    /* ─── Hero ──────────────────────────────────────────────── */
    .search-hero { text-align: center; padding: 1.5rem 1rem 0.5rem; }
    .search-eyebrow {
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
    .search-eyebrow .dot {
        width: 6px; height: 6px; border-radius: 50%;
        background: #ec65ba;
        animation: pulse-dot 2.4s ease-in-out infinite;
    }
    @keyframes pulse-dot {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.4; transform: scale(0.7); }
    }
    .search-title {
        font-family: 'Fraunces', Georgia, serif;
        font-size: clamp(2.5rem, 5vw, 3.85rem);
        font-weight: 500;
        letter-spacing: -0.03em;
        line-height: 1;
        margin: 0 0 1rem;
        color: #0a0a0a;
    }
    .search-title em {
        font-style: italic;
        background: linear-gradient(120deg, #ec65ba 0%, #c084fc 50%, #7c3aed 100%);
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
        font-weight: 500;
    }
    .search-lead {
        color: rgba(10,10,10,0.65);
        font-size: 1.05rem;
        line-height: 1.65;
        margin: 0 auto;
        max-width: 60ch;
    }

    /* ─── Form Card ─────────────────────────────────────────── */
    .search-card {
        position: relative;
        background: linear-gradient(180deg, #ffffff, #fafafa);
        border: 1px solid rgba(0,0,0,0.08);
        border-radius: 20px;
        padding: clamp(1.75rem, 3vw, 2.5rem);
        overflow: hidden;
    }
    .search-card-glow {
        position: absolute; inset: -1px;
        border-radius: 20px;
        padding: 1px;
        background: linear-gradient(135deg, rgba(236,101,186,0.3), transparent 50%, rgba(124,58,237,0.3));
        -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
        -webkit-mask-composite: xor;
                mask-composite: exclude;
        pointer-events: none;
    }

    .search-grid {
        display: grid; gap: 1.25rem;
        grid-template-columns: 1fr;
    }
    @media (min-width: 720px) { .search-grid { grid-template-columns: 1fr 1fr; } }
    .search-field-wide { grid-column: 1 / -1; }

    .search-field { display: flex; flex-direction: column; gap: 0.5rem; }
    .search-field label {
        display: inline-flex; align-items: center; gap: 0.45rem;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.7rem; letter-spacing: 0.12em; text-transform: uppercase;
        font-weight: 600;
        color: rgba(10,10,10,0.6);
    }
    .search-field label .req { color: #ec65ba; }
    .search-input {
        width: 100%;
        padding: 0.85rem 1.1rem;
        background: rgba(0,0,0,0.025);
        border: 1px solid rgba(0,0,0,0.1);
        border-radius: 10px;
        color: #0a0a0a;
        font-family: 'Inter', system-ui, sans-serif;
        font-size: 1rem;
        line-height: 1.4;
        transition: all .2s;
        outline: none;
    }
    .search-input::placeholder { color: rgba(10,10,10,0.3); }
    .search-input:hover { border-color: rgba(0,0,0,0.18); background: rgba(0,0,0,0.04); }
    .search-input:focus {
        border-color: #ec65ba;
        background: rgba(236,101,186,0.05);
        box-shadow: 0 0 0 4px rgba(236,101,186,0.1);
    }
    .search-error { font-size: 0.84rem; color: #f87171; }

    /* ─── Toggle ─────────────────────────────────────────────── */
    .search-toggle {
        display: flex; align-items: center; gap: 1rem;
        cursor: pointer; user-select: none;
        background: rgba(0,0,0,0.02);
        border: 1px solid rgba(0,0,0,0.08);
        border-radius: 12px;
        padding: 1rem 1.25rem;
        transition: all .2s;
    }
    .search-toggle:hover { background: #ffffff; border-color: rgba(0,0,0,0.15); }
    .search-toggle:focus-within { border-color: #ec65ba; box-shadow: 0 0 0 3px rgba(236,101,186,0.2); }
    .search-toggle input { position: absolute; opacity: 0; pointer-events: none; }
    .search-toggle-pill {
        flex-shrink: 0;
        width: 44px; height: 24px;
        border-radius: 999px;
        background: rgba(0,0,0,0.08);
        position: relative;
        transition: all .25s;
    }
    .search-toggle-knob {
        position: absolute; top: 3px; left: 3px;
        width: 18px; height: 18px; border-radius: 50%;
        background: rgba(255,255,255,0.9);
        transition: all .25s;
    }
    .search-toggle input:checked + .search-toggle-pill {
        background: linear-gradient(135deg, #ec65ba, #7c3aed);
    }
    .search-toggle input:checked + .search-toggle-pill .search-toggle-knob {
        left: 23px;
        background: #fff;
    }
    .search-toggle-text strong {
        display: block;
        font-size: 0.96rem; font-weight: 600;
        color: #0a0a0a;
        margin-bottom: 0.2rem;
    }
    .search-toggle-text small {
        font-size: 0.84rem;
        color: rgba(10,10,10,0.55);
        line-height: 1.5;
    }

    /* ─── Actions ────────────────────────────────────────────── */
    .search-actions {
        margin-top: 2rem;
        padding-top: 1.5rem;
        border-top: 1px solid rgba(0,0,0,0.06);
        display: flex; gap: 0.75rem; justify-content: flex-end;
        flex-wrap: wrap;
    }
    .search-btn {
        display: inline-flex; align-items: center; gap: 0.55rem;
        padding: 0.85rem 1.5rem;
        border-radius: 10px;
        font-weight: 600; font-size: 0.92rem;
        cursor: pointer;
        transition: all .2s;
        border: none;
        font-family: inherit;
        min-height: 44px;
    }
    .search-btn-primary {
        background: linear-gradient(135deg, #ec65ba, #7c3aed);
        color: #fff;
        box-shadow: 0 8px 22px -8px rgba(236,101,186,0.5);
    }
    .search-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 28px -8px rgba(236,101,186,0.65); }
    .search-btn-primary:disabled { opacity: 0.7; transform: none !important; cursor: not-allowed; }
    .search-btn-ghost {
        background: #ffffff;
        color: rgba(10,10,10,0.75);
        border: 1px solid rgba(0,0,0,0.1);
    }
    .search-btn-ghost:hover { background: rgba(0,0,0,0.06); }
    .search-spin { animation: spin 0.9s linear infinite; }
    @keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }

    /* ─── Tips ───────────────────────────────────────────────── */
    .search-tips {
        background: rgba(6,182,212,0.04);
        border: 1px solid rgba(6,182,212,0.15);
        border-radius: 16px;
        padding: 1.5rem 1.75rem;
    }
    .search-tips h3 {
        font-family: 'Fraunces', Georgia, serif;
        font-size: 1.15rem;
        font-weight: 500;
        color: #0a0a0a;
        margin: 0 0 1rem;
    }
    .search-tips ul {
        list-style: none; padding: 0; margin: 0;
        display: flex; flex-direction: column; gap: 0.75rem;
    }
    .search-tips li {
        font-size: 0.92rem;
        color: rgba(10,10,10,0.7);
        line-height: 1.6;
        padding-left: 1.5rem;
        position: relative;
    }
    .search-tips li::before {
        content: "▸";
        position: absolute; left: 0; top: 0;
        color: #06b6d4;
        font-weight: 700;
    }
    .search-tips strong { color: #0a0a0a; font-weight: 600; }
</style>
