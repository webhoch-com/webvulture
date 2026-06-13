<?php

use App\Domain\Outreach\OutreachService;
use App\Jobs\EnrichLeadJob;
use App\Jobs\ScrapeSiteJob;
use App\Models\Lead;
use App\Support\CostGuard;
use App\Support\Enums\LeadStatus;
use Livewire\Attributes\On;
use Livewire\Attributes\Url;
use Livewire\Volt\Component;
use Livewire\WithPagination;
use Mary\Traits\Toast;

new class extends Component {
    use Toast, WithPagination;

    #[On('lead-updated')]
    public function refreshOnEvent(): void
    {
        // Re-render via Livewire round-trip; Echo listener in app.js dispatches.
    }

    #[Url(as: 'q')]
    public string $search = '';

    #[Url]
    public string $status = '';

    #[Url]
    public string $website = '';

    #[Url]
    public bool $showIrrelevant = false;

    #[Url]
    public int $perPage = 15;

    /** @var array<int, int> */
    public array $selected = [];

    public function updating(): void
    {
        $this->resetPage();
    }

    public function clear(): void
    {
        $this->reset(['search', 'status', 'website', 'showIrrelevant', 'selected']);
        $this->resetPage();
    }

    public function clearSelection(): void
    {
        $this->selected = [];
    }

    public function toggleSelectAllVisible(): void
    {
        $visibleIds = $this->visibleRowIds();
        if (empty(array_diff($visibleIds, $this->selected))) {
            // All visible already selected → clear them.
            $this->selected = array_values(array_diff($this->selected, $visibleIds));
        } else {
            $this->selected = array_values(array_unique(array_merge($this->selected, $visibleIds)));
        }
    }

    private function visibleRowIds(): array
    {
        return Lead::query()
            ->when($this->search, fn ($q) => $q->where('name', 'like', "%{$this->search}%"))
            ->when($this->status, fn ($q) => $q->where('status', $this->status))
            ->when($this->website === 'yes', fn ($q) => $q->where('has_website', true))
            ->when($this->website === 'no', fn ($q) => $q->where('has_website', false))
            ->when(! $this->showIrrelevant && ! $this->status, fn ($q) => $q->where('status', '!=', LeadStatus::Irrelevant->value))
            ->latest('id')
            ->forPage($this->getPage(), $this->perPage)
            ->pluck('id')
            ->all();
    }

    public function scrape(int $leadId): void
    {
        $lead = Lead::findOrFail($leadId);
        if (! $lead->website) {
            $this->error('Keine Website', 'Lead hat keine Website zum Scrapen.');
            return;
        }
        ScrapeSiteJob::dispatch($leadId)->onQueue('scrape');
        $this->success('In Warteschlange', "Scrape für {$lead->name}…");
    }

    public function enrich(int $leadId): void
    {
        EnrichLeadJob::dispatch($leadId)->onQueue('enrichment');
        $this->success('In Warteschlange', 'KI-Analyse gestartet.');
    }

    public function markIrrelevant(int $leadId): void
    {
        $lead = Lead::findOrFail($leadId);
        $lead->update(['status' => LeadStatus::Irrelevant]);
        $this->success('Markiert', "{$lead->name} als irrelevant markiert.");
    }

    public function unmarkIrrelevant(int $leadId): void
    {
        $lead = Lead::findOrFail($leadId);
        $lead->update(['status' => $lead->latestEnrichment ? LeadStatus::Enriched : LeadStatus::New]);
        $this->success('Reaktiviert', "{$lead->name} ist wieder relevant.");
    }

    public function delete(int $leadId): void
    {
        Lead::findOrFail($leadId)->delete();
        $this->success('Gelöscht', 'Lead und alle Dateien entfernt.');
    }

    // ─── Bulk-Aktionen ────────────────────────────────────────────────

    public function bulkMarkIrrelevant(): void
    {
        if (empty($this->selected)) {
            return;
        }
        $count = Lead::whereIn('id', $this->selected)->update(['status' => LeadStatus::Irrelevant->value]);
        $this->selected = [];
        $this->success('Bulk-Markierung', "{$count} Leads als irrelevant markiert.");
    }

    public function bulkUnmarkIrrelevant(): void
    {
        if (empty($this->selected)) {
            return;
        }
        // Re-set to a sensible default: 'enriched' if enrichment exists, else 'new'.
        $leads = Lead::with('latestEnrichment:id,lead_id')->whereIn('id', $this->selected)->get();
        foreach ($leads as $lead) {
            $lead->update(['status' => $lead->latestEnrichment ? LeadStatus::Enriched->value : LeadStatus::New->value]);
        }
        $count = $leads->count();
        $this->selected = [];
        $this->success('Bulk-Reaktivierung', "{$count} Leads wieder relevant.");
    }

    public function bulkEnrich(CostGuard $cost): void
    {
        if (empty($this->selected)) {
            return;
        }
        $eligible = Lead::whereIn('id', $this->selected)
            ->whereIn('status', [LeadStatus::New->value, LeadStatus::Scraped->value])
            ->pluck('id');

        if ($eligible->isEmpty()) {
            $this->warning('Keine geeigneten Leads', 'Auswahl enthält nur bereits analysierte Leads.');
            return;
        }

        // Per-lead estimate is the trailing-30-day mean of recorded enrichment
        // cost from cost_logs (purpose lives in the meta JSON column —
        // EnrichmentService writes meta->purpose='enrichment'). Falls back to
        // 2¢ if there's no history yet. Was hardcoded — flagged by
        // marketing-consistency audit because actual cost drifts with model
        // + scraped-text length.
        $perLeadCents = (int) round(
            (float) \App\Models\CostLog::query()
                ->whereJsonContains('meta->purpose', 'enrichment')
                ->where('created_at', '>=', now()->subDays(30))
                ->avg('cost_cents')
        );
        if ($perLeadCents < 1) {
            $perLeadCents = 2;
        }
        $estimatedCents = $eligible->count() * $perLeadCents;
        $spent = $cost->spentTodayCents();
        $cap = $cost->dailyCapCents();

        if ($cap > 0 && ($spent + $estimatedCents) > $cap) {
            $remainingCents = max(0, $cap - $spent);
            $this->error(
                'Kosten-Cap erreicht',
                'Geschätzte Kosten ('.number_format($estimatedCents/100, 2, ',', '.').
                ' €) würden Tages-Cap überschreiten. Verbleibend heute: '.
                number_format($remainingCents/100, 2, ',', '.').' €.'
            );
            return;
        }

        foreach ($eligible as $id) {
            EnrichLeadJob::dispatch($id)->onQueue('enrichment');
        }
        $this->selected = [];
        $this->success(
            'In Warteschlange',
            "{$eligible->count()} KI-Analysen gestartet (~".number_format($estimatedCents/100, 2, ',', '.').' €).'
        );
    }

    public function bulkSendFollowup(OutreachService $svc, CostGuard $cost): void
    {
        if (empty($this->selected)) {
            return;
        }

        try {
            $cost->assertWithinDailyCap();
        } catch (\Throwable $e) {
            $this->error('Kosten-Cap erreicht', $e->getMessage());
            return;
        }

        $leads = Lead::with('websiteAnalysis')
            ->whereIn('id', $this->selected)
            ->whereNotNull('awaiting_response_since')
            ->whereNull('replied_at')
            ->get();

        $sent = 0;
        $failed = 0;
        foreach ($leads as $lead) {
            if (! $svc->resolveRecipientEmail($lead)) {
                continue;
            }
            try {
                $svc->send(
                    $lead,
                    $svc->defaultFollowupSubject($lead),
                    $svc->defaultFollowupBody($lead),
                    'followup',
                );
                $sent++;
            } catch (\Throwable $e) {
                $failed++;
            }
        }
        $this->selected = [];
        $msg = "{$sent} Nachfragen versendet";
        if ($failed > 0) {
            $msg .= " · {$failed} fehlgeschlagen";
        }
        $this->success('Nachfragen versendet', $msg);
    }

    public function bulkDelete(): void
    {
        if (empty($this->selected)) {
            return;
        }
        $count = Lead::whereIn('id', $this->selected)->count();
        Lead::whereIn('id', $this->selected)->each(fn ($l) => $l->delete()); // triggers booted() cleanup
        $this->selected = [];
        $this->success('Gelöscht', "{$count} Leads + Dateien entfernt.");
    }

    public function with(): array
    {
        $headers = [
            ['key' => 'select', 'label' => '', 'class' => 'w-10'],
            ['key' => 'name', 'label' => 'Unternehmen'],
            ['key' => 'category', 'label' => 'Kategorie'],
            ['key' => 'city', 'label' => 'Stadt'],
            ['key' => 'website', 'label' => 'Website'],
            ['key' => 'website_stars', 'label' => 'Website★', 'class' => 'w-24'],
            ['key' => 'quality_score', 'label' => 'Score', 'class' => 'w-16'],
            ['key' => 'status', 'label' => 'Status', 'class' => 'w-28'],
            ['key' => 'actions', 'label' => '', 'class' => 'w-40'],
        ];

        $rows = Lead::query()
            ->when($this->search, fn ($q) => $q->where('name', 'like', "%{$this->search}%"))
            ->when($this->status, fn ($q) => $q->where('status', $this->status))
            ->when($this->website === 'yes', fn ($q) => $q->where('has_website', true))
            ->when($this->website === 'no', fn ($q) => $q->where('has_website', false))
            ->when(! $this->showIrrelevant && ! $this->status, fn ($q) => $q->where('status', '!=', LeadStatus::Irrelevant->value))
            ->latest('id')
            ->paginate($this->perPage);

        $statusOptions = collect(LeadStatus::cases())
            ->map(fn ($s) => ['id' => $s->value, 'name' => $s->label()])
            ->all();

        $visibleIds = $rows->pluck('id')->all();
        $allVisibleSelected = ! empty($visibleIds) && empty(array_diff($visibleIds, $this->selected));

        return compact('headers', 'rows', 'statusOptions', 'allVisibleSelected');
    }
}; ?>

<div class="leads-page space-y-6">
    {{-- Premium hero --}}
    <header class="leads-hero">
        <div class="leads-hero-meta">
            <span class="leads-eyebrow">
                <span class="dot"></span>
                Lead-Pool · {{ $rows->total() }} Treffer
            </span>
            <h1 class="leads-title">Leads.</h1>
            <p class="leads-sub">Gefundene Unternehmen — gefiltert, sortiert und einsatzbereit für Discovery, Demos und Outreach.</p>
        </div>
        <div class="leads-hero-actions">
            <a href="{{ route('leads.export', request()->query()) }}" class="leads-btn leads-btn-ghost"
               title="Aktuelle Filter werden im Export angewendet">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                CSV-Export
            </a>
            <a href="{{ route('search') }}" class="leads-btn leads-btn-primary">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                Neue Discovery
            </a>
        </div>
    </header>

    {{-- Filter bar --}}
    <section class="leads-filter">
        <div class="leads-filter-row">
            <x-input placeholder="Name suchen…" wire:model.live.debounce="search" icon="o-magnifying-glass" clearable />
            <x-select placeholder="Status" :options="$statusOptions" wire:model.live="status" icon="o-flag" />
            <x-select placeholder="Website" :options="[['id'=>'yes','name'=>'Mit Website'],['id'=>'no','name'=>'Ohne Website']]" wire:model.live="website" icon="o-globe-alt" />
            <x-checkbox label="Irrelevante einblenden" wire:model.live="showIrrelevant" hint="Aus, blendet aus" />
            <button type="button" wire:click="clear" class="leads-btn leads-btn-ghost leads-btn-sm">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                Zurücksetzen
            </button>
        </div>
    </section>

    {{-- Bulk-Action-Bar --}}
    <div class="leads-bulk-bar">
        <button type="button" wire:click="toggleSelectAllVisible" class="leads-bulk-toggle">
            <span class="leads-mini-check {{ $allVisibleSelected ? 'is-checked' : '' }}" aria-hidden="true">
                @if($allVisibleSelected)<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>@endif
            </span>
            Alle auf dieser Seite
        </button>

        @if(count($selected) > 0)
            <div class="leads-bulk-active">
                <span class="leads-bulk-count">{{ count($selected) }} ausgewählt</span>
                <div class="leads-bulk-actions">
                    <x-button label="KI-Analyse starten" icon="o-sparkles" wire:click="bulkEnrich" class="btn-primary btn-xs" spinner />
                    <x-button label="Nachfrage senden" icon="o-envelope-open" wire:click="bulkSendFollowup" class="btn-secondary btn-xs btn-outline" tooltip="Nur an Leads, die seit >7 Tagen keine Antwort gegeben haben" spinner />
                    <x-button label="Irrelevant" icon="o-no-symbol" wire:click="bulkMarkIrrelevant" class="btn-warning btn-xs btn-outline" />
                    <x-button label="Wieder relevant" icon="o-arrow-uturn-left" wire:click="bulkUnmarkIrrelevant" class="btn-info btn-xs btn-outline" />
                    <x-button label="Löschen" icon="o-trash"
                        wire:click="bulkDelete"
                        wire:confirm="{{ count($selected) }} Leads UND alle Dateien wirklich löschen? Aktion ist nicht umkehrbar."
                        class="btn-error btn-xs btn-outline" />
                    <x-button label="Auswahl aufheben" icon="o-x-mark" wire:click="clearSelection" class="btn-ghost btn-xs" />
                </div>
            </div>
        @endif
    </div>

    <section class="leads-table-card">
        <div class="overflow-x-auto">
        <x-table :headers="$headers" :rows="$rows" with-pagination striped>
            @scope('cell_select', $row)
                <input type="checkbox" class="checkbox checkbox-sm" value="{{ $row->id }}" wire:model.live="selected" />
            @endscope

            @scope('cell_name', $row)
                <a href="{{ route('leads.show', $row) }}" class="font-medium link link-hover">{{ $row->name }}</a>
                @if(!$row->has_website)
                    <x-badge value="ohne Website" class="badge-warning badge-xs ml-1" />
                @endif
            @endscope

            @scope('cell_website', $row)
                @if($row->website && \Illuminate\Support\Str::startsWith($row->website, ['http://','https://']))
                    <a href="{{ $row->website }}" target="_blank" rel="noopener noreferrer" class="link link-primary text-xs">
                        {{ \Illuminate\Support\Str::of($row->website)->after('://')->limit(25) }}
                    </a>
                @else
                    <span class="text-base-content/40 text-xs">—</span>
                @endif
            @endscope

            @scope('cell_website_stars', $row)
                @if(! $row->has_website)
                    <span class="inline-flex items-center gap-1 whitespace-nowrap text-error text-sm font-semibold" title="Keine Webseite vorhanden — Top-Zielgruppe für Demo">
                        0 <span class="text-base">★</span>
                    </span>
                @elseif($row->website_stars !== null)
                    @php $stars = (float) $row->website_stars; @endphp
                    <span class="inline-flex items-center gap-1 whitespace-nowrap text-amber-500 text-sm" title="{{ number_format($stars,1,',','.') }} / 5">
                        {{ number_format($stars,1,',','.') }}
                        <span class="text-base">★</span>
                    </span>
                @else
                    <span class="text-base-content/40 text-xs">—</span>
                @endif
            @endscope

            @scope('cell_quality_score', $row)
                <span class="font-mono text-xs badge badge-outline">{{ $row->quality_score }}</span>
            @endscope

            @scope('cell_status', $row)
                <x-badge :value="$row->status?->label() ?? '—'" class="{{ $row->status?->badgeClass() ?? 'badge-ghost' }} badge-sm" />
            @endscope

            @scope('cell_actions', $row)
                <div class="flex gap-1">
                    @if($row->has_website && $row->status->value === 'new')
                        <x-button icon="o-arrow-down-tray" wire:click="scrape({{ $row->id }})" class="btn-ghost btn-sm btn-square" tooltip="Scrapen" aria-label="Scrapen" />
                    @endif
                    @if(in_array($row->status->value, ['scraped','new']))
                        <x-button icon="o-sparkles" wire:click="enrich({{ $row->id }})" class="btn-ghost btn-sm btn-square" tooltip="KI-Analyse starten (~0,02 €)" aria-label="KI-Analyse starten" />
                    @endif
                    <x-button icon="o-eye" link="{{ route('leads.show', $row) }}" class="btn-ghost btn-sm btn-square" tooltip="Ansehen" aria-label="Lead ansehen" />
                    @if($row->status->value === 'irrelevant')
                        <x-button icon="o-arrow-uturn-left" wire:click="unmarkIrrelevant({{ $row->id }})" class="btn-ghost btn-sm btn-square text-info" tooltip="Wieder relevant" aria-label="Wieder relevant markieren" />
                    @else
                        <x-button icon="o-no-symbol" wire:click="markIrrelevant({{ $row->id }})" class="btn-ghost btn-sm btn-square text-warning" tooltip="Als irrelevant markieren" aria-label="Als irrelevant markieren" />
                    @endif
                    <x-button
                        icon="o-trash"
                        wire:click="delete({{ $row->id }})"
                        wire:confirm="{{ $row->name.' und alle Dateien löschen?' }}"
                        class="btn-ghost btn-sm btn-square text-error"
                        tooltip="Löschen"
                        aria-label="Lead löschen"
                    />
                </div>
            @endscope
        </x-table>
        </div>
    </section>
</div>

<style>
    .leads-page { padding-bottom: 2rem; }

    /* ─── Hero ──────────────────────────────────────────────── */
    .leads-hero {
        position: relative;
        padding: clamp(1.5rem, 3vw, 2.25rem);
        border-radius: 20px;
        background:
            radial-gradient(circle at 0% 0%, rgba(236,101,186,0.16) 0%, transparent 50%),
            radial-gradient(circle at 100% 100%, rgba(124,58,237,0.16) 0%, transparent 50%),
            linear-gradient(135deg, #ffffff 0%, #f5f5f7 100%);
        border: 1px solid rgba(0,0,0,0.06);
        overflow: hidden;
        display: grid; gap: 1.5rem; align-items: end;
        grid-template-columns: 1fr;
    }
    @media (min-width: 720px) { .leads-hero { grid-template-columns: 1fr auto; } }
    .leads-eyebrow {
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
    .leads-eyebrow .dot {
        width: 6px; height: 6px; border-radius: 50%;
        background: #be185d;
        animation: leads-pulse 2.4s ease-in-out infinite;
    }
    @keyframes leads-pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.4; transform: scale(0.7); }
    }
    .leads-title {
        font-family: 'Fraunces', Georgia, serif;
        font-size: clamp(2.25rem, 4vw, 3.25rem);
        font-weight: 500; letter-spacing: -0.03em; line-height: 1;
        margin: 1rem 0 0.85rem; color: #0a0a0a;
    }
    .leads-sub {
        color: rgba(10,10,10,0.65);
        font-size: 0.98rem; line-height: 1.65;
        margin: 0; max-width: 60ch;
    }
    .leads-hero-actions { display: flex; gap: 0.55rem; flex-wrap: wrap; }
    .leads-btn {
        display: inline-flex; align-items: center; gap: 0.5rem;
        padding: 0.7rem 1.2rem;
        border-radius: 9px;
        font-weight: 600; font-size: 0.86rem;
        text-decoration: none;
        cursor: pointer;
        transition: all .2s;
        border: none;
        font-family: inherit;
        min-height: 44px;
    }
    .leads-btn-sm { padding: 0.55rem 1rem; font-size: 0.82rem; min-height: 40px; }
    .leads-btn-primary {
        background: linear-gradient(135deg, #ec65ba, #7c3aed);
        color: #fff;
        box-shadow: 0 6px 18px -8px rgba(236,101,186,0.5);
    }
    .leads-btn-primary:hover { transform: translateY(-1px); }
    .leads-btn-ghost {
        background: rgba(0,0,0,0.04);
        color: rgba(10,10,10,0.85);
        border: 1px solid rgba(0,0,0,0.1);
    }
    .leads-btn-ghost:hover { background: rgba(0,0,0,0.08); }

    /* ─── Filter bar ────────────────────────────────────────── */
    .leads-filter {
        background: linear-gradient(180deg, #ffffff, #fafafa);
        border: 1px solid rgba(0,0,0,0.06);
        border-radius: 14px;
        padding: 1.1rem 1.25rem;
    }
    .leads-filter-row {
        display: grid; gap: 0.75rem;
        grid-template-columns: 1fr;
        align-items: end;
    }
    @media (min-width: 720px) {
        .leads-filter-row {
            grid-template-columns: 2fr 1.2fr 1.2fr 1.5fr auto;
        }
    }
    /* Cohesion: align Mary inputs with our pink-focus aesthetic */
    .leads-filter input.input,
    .leads-filter select.select {
        border-radius: 10px;
        transition: border-color .2s, box-shadow .2s;
    }
    .leads-filter input.input:focus,
    .leads-filter select.select:focus {
        border-color: rgba(236,101,186,0.55) !important;
        outline: none;
        box-shadow: 0 0 0 3px rgba(236,101,186,0.15);
    }

    /* ─── Bulk bar ──────────────────────────────────────────── */
    .leads-bulk-bar {
        display: flex; align-items: center; gap: 0.85rem;
        flex-wrap: wrap;
    }
    .leads-bulk-toggle {
        display: inline-flex; align-items: center; gap: 0.55rem;
        padding: 0.55rem 0.95rem;
        background: rgba(0,0,0,0.025);
        border: 1px solid rgba(0,0,0,0.08);
        border-radius: 8px;
        color: rgba(10,10,10,0.75);
        font-size: 0.84rem;
        font-weight: 500;
        cursor: pointer;
        transition: all .2s;
        font-family: inherit;
        min-height: 44px;
    }
    .leads-bulk-toggle:hover { background: rgba(0,0,0,0.05); border-color: rgba(0,0,0,0.15); }
    .leads-mini-check {
        width: 16px; height: 16px;
        border-radius: 4px;
        /* Was rgba(255,255,255,0.25) — invisible on the white card. */
        border: 1.5px solid rgba(10,10,10,0.22);
        display: grid; place-items: center;
        transition: all .2s;
    }
    .leads-mini-check.is-checked {
        background: linear-gradient(135deg, #ec65ba, #7c3aed);
        border-color: transparent;
        color: #fff;
    }

    .leads-bulk-active {
        flex: 1;
        display: flex; align-items: center; gap: 0.85rem;
        flex-wrap: wrap;
        background: linear-gradient(135deg, rgba(236,101,186,0.1), rgba(124,58,237,0.1));
        border: 1px solid rgba(236,101,186,0.25);
        border-radius: 12px;
        padding: 0.6rem 1rem;
    }
    .leads-bulk-count {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.78rem;
        font-weight: 700;
        color: #0a0a0a;
        padding: 0.25rem 0.65rem;
        background: rgba(236,101,186,0.2);
        border-radius: 999px;
    }
    .leads-bulk-actions {
        display: flex; gap: 0.4rem; flex-wrap: wrap;
    }
    @media (min-width: 720px) {
        /* Only push to the right when there's room — on mobile this would
           force a vertical jump and look broken. */
        .leads-bulk-actions { margin-left: auto; }
    }

    /* ─── Table card ────────────────────────────────────────── */
    .leads-table-card {
        background: linear-gradient(180deg, #ffffff, #fafafa);
        border: 1px solid rgba(0,0,0,0.06);
        border-radius: 16px;
        padding: 0.5rem;
        overflow: hidden;
    }
    .leads-table-card .table {
        background: transparent;
    }
    /* Visible zebra-striping on dark background */
    .leads-table-card .table tbody tr:nth-child(even) {
        background: rgba(0,0,0,0.02);
    }
    .leads-table-card .table tbody tr:hover {
        background: rgba(236,101,186,0.06) !important;
    }
    .leads-table-card .table thead th {
        background: #ffffff;
        border-bottom: 1px solid rgba(0,0,0,0.1);
    }
</style>
