<?php

use App\Domain\Layout\LayoutMatcher;
use App\Domain\Outreach\OutreachService;
use App\Domain\Quality\WebsiteQualityScorer;
use App\Jobs\EnrichLeadJob;
use App\Jobs\RequestPrototypeGenerationJob;
use App\Jobs\ScrapeSiteJob;
use App\Models\Lead;
use App\Models\OutreachMessage;
use App\Support\Enums\LayoutKind;
use App\Support\Enums\LeadStatus;
use Livewire\Attributes\Computed;
use Livewire\Attributes\Locked;
use Livewire\Volt\Component;
use Mary\Traits\Toast;

new class extends Component {
    use Toast;

    public Lead $lead;

    public string $tab = 'overview';

    public string $layoutKind = 'standard';

    // ─── Outreach ──────────────────────────────────────────────────
    public bool $outreachModalOpen = false;
    public bool $outreachPreviewOpen = false;
    public string $outreachKind = 'initial';
    public string $outreachSubject = '';
    public string $outreachBody = '';
    public string $previewSubject = '';
    public string $previewBody = '';
    public ?string $previewRecipient = null;

    /**
     * Server-side single-use token. Set in previewOutreach(), consumed in
     * sendOutreach(). #[Locked] forbids client mutation, so an attacker can
     * NOT just `$wire.set('outreachPreviewOpen', true)` to bypass preview.
     */
    #[Locked]
    public ?string $outreachSendToken = null;

    public function mount(Lead $lead): void
    {
        $this->lead = $lead->load([
            'websiteAnalysis',
            'latestEnrichment',
            'latestPrototype',
            'costLogs',
            'scrapeJobs' => fn ($q) => $q->latest()->limit(3),
        ]);

        $this->layoutKind = $this->lead->latestPrototype?->layout_kind
            ?? app(LayoutMatcher::class)->match(
                $this->lead->latestEnrichment?->niche,
                $this->lead->category,
                $this->lead->name,
            )->value;
    }

    public function scrape(): void
    {
        if (! $this->lead->website) {
            $this->error('Keine Website', 'Lead hat keine Website-URL.');
            return;
        }
        ScrapeSiteJob::dispatch($this->lead->id)->onQueue('scrape');
        $this->success('In Warteschlange', 'Scrape-Job gestartet.');
    }

    public function enrich(): void
    {
        EnrichLeadJob::dispatch($this->lead->id)->onQueue('enrichment');
        $this->success('In Warteschlange', 'Anreicherungs-Job gestartet.');
    }

    public function generate(): void
    {
        if (! $this->lead->latestEnrichment) {
            $this->error('Nicht angereichert', 'Bitte zuerst KI-Analyse ausführen.');
            return;
        }
        $kind = LayoutKind::tryFrom($this->layoutKind) ?? LayoutKind::Standard;
        $this->layoutKind = $kind->value; // normalize back to client
        RequestPrototypeGenerationJob::dispatch($this->lead->id, 'studio', $kind->value)
            ->onQueue('generation');
        $this->success('In Warteschlange', "Prototyp-Erzeugung gestartet (Layout: {$kind->label()}).");
    }

    public function rateWebsite(float $stars): void
    {
        $stars = max(0, min(5, $stars));
        $this->lead->update(['website_stars' => $stars]);
        $this->lead->refresh();
        $this->success('Bewertung gespeichert', 'Website-Sterne aktualisiert.');
    }

    public function clearWebsiteRating(): void
    {
        $this->lead->update(['website_stars' => null]);
        $this->lead->refresh();
        $this->success('Bewertung entfernt');
    }

    public function applySuggestedRating(): void
    {
        $suggestion = $this->qualitySuggestion;
        if (! $suggestion) {
            $this->error('Kein Vorschlag', 'Erst Scrape-Daten erfassen.');
            return;
        }
        $this->lead->update(['website_stars' => $suggestion->stars]);
        $this->lead->refresh();
        $this->success('Vorschlag übernommen', number_format($suggestion->stars, 1, ',', '.').' / 5 gespeichert.');
    }

    #[Computed]
    public function qualitySuggestion(): ?\App\Domain\Quality\WebsiteQualityResult
    {
        if (! $this->lead->websiteAnalysis) {
            return null;
        }
        return app(WebsiteQualityScorer::class)->score($this->lead->websiteAnalysis);
    }

    public function markIrrelevant(): void
    {
        $this->lead->update(['status' => LeadStatus::Irrelevant]);
        app(\App\Domain\Activity\ActivityLogger::class)->log($this->lead, 'lead.marked_irrelevant', 'Als irrelevant markiert');
        $this->lead->refresh();
        $this->success('Markiert', 'Lead ist nun als irrelevant markiert.');
    }

    public function unmarkIrrelevant(): void
    {
        $newStatus = $this->lead->latestEnrichment ? LeadStatus::Enriched : LeadStatus::New;
        $this->lead->update(['status' => $newStatus]);
        app(\App\Domain\Activity\ActivityLogger::class)->log($this->lead, 'lead.reactivated', 'Wieder relevant');
        $this->lead->refresh();
        $this->success('Reaktiviert', 'Lead ist wieder relevant.');
    }

    public function approve(): void
    {
        // Nur prototyped Leads können freigegeben werden — vorher gibt's
        // ja keine Demo-URL die der Kunde sehen würde.
        if ($this->lead->status !== LeadStatus::Prototyped && $this->lead->status !== LeadStatus::Approved) {
            $this->error('Nicht möglich', 'Lead muss zuerst gescraped, enriched und prototyped sein.');

            return;
        }
        if ($this->lead->isApproved()) {
            $this->info('Bereits freigegeben', 'Dieser Lead ist schon freigegeben.');

            return;
        }
        $this->lead->update([
            'status' => LeadStatus::Approved,
            'approved_at' => now(),
            'approved_by' => auth()->id(),
        ]);
        app(\App\Domain\Activity\ActivityLogger::class)->log($this->lead, 'lead.approved', 'Für Entwicklung freigegeben');
        $this->lead->refresh();
        $this->success('Freigegeben', 'Lead steht jetzt für Outreach bereit.');
    }

    public function revokeApproval(): void
    {
        if (! $this->lead->isApproved()) {
            return;
        }
        $this->lead->update([
            'status' => LeadStatus::Prototyped,
            'approved_at' => null,
            'approved_by' => null,
        ]);
        app(\App\Domain\Activity\ActivityLogger::class)->log($this->lead, 'lead.approval_revoked', 'Freigabe zurückgenommen');
        $this->lead->refresh();
        $this->info('Freigabe entfernt', 'Lead ist zurück im Review-Status.');
    }

    public function deleteLead(): void
    {
        $this->lead->delete();
        $this->redirectRoute('leads.index', navigate: true);
    }

    public function refresh(): void
    {
        $this->lead = $this->lead->fresh([
            'websiteAnalysis',
            'latestEnrichment',
            'latestPrototype',
            'costLogs',
        ]);
    }

    // ─── Outreach actions ────────────────────────────────────────────────
    public function openOutreachModal(string $kind = 'initial'): void
    {
        $svc = app(OutreachService::class);
        $email = $svc->resolveRecipientEmail($this->lead);
        if (! $email) {
            $this->error('Keine E-Mail', 'Für diesen Lead wurde keine E-Mail-Adresse aus der Webseite extrahiert. Bitte zuerst scrapen.');
            return;
        }
        $this->outreachKind = in_array($kind, ['initial', 'followup'], true) ? $kind : 'initial';
        $this->outreachSubject = $this->outreachKind === 'followup'
            ? $svc->defaultFollowupSubject($this->lead)
            : $svc->defaultSubject($this->lead);
        $this->outreachBody = $this->outreachKind === 'followup'
            ? $svc->defaultFollowupBody($this->lead)
            : $svc->defaultBody($this->lead);
        $this->outreachModalOpen = true;
    }

    /**
     * Step 1 — open the read-only preview with placeholders resolved.
     * The actual send happens only after explicit user confirmation in the
     * preview modal (sendOutreach).
     */
    public function previewOutreach(OutreachService $svc): void
    {
        // Single-flight guard: rapid double-clicks on "Vorschau ansehen" only
        // create one token / one render.
        if ($this->outreachPreviewOpen && $this->outreachSendToken) {
            return;
        }

        $this->validate([
            'outreachSubject' => 'required|string|min:3|max:200',
            'outreachBody' => 'required|string|min:20|max:8000',
            'outreachKind' => 'required|in:initial,followup,custom',
        ]);

        $rendered = $svc->renderForPreview($this->lead, $this->outreachSubject, $this->outreachBody);
        $this->previewSubject = $rendered['subject'];
        $this->previewBody = $rendered['body'];
        $this->previewRecipient = $svc->resolveRecipientEmail($this->lead);

        // Issue a single-use token bound to this lead. The cache entry is the
        // server-side proof that previewOutreach() actually ran. sendOutreach()
        // pulls (atomic delete) this entry before sending.
        $token = bin2hex(random_bytes(16));
        cache()->put("outreach:preview:{$this->lead->id}:{$token}", true, now()->addMinutes(10));
        $this->outreachSendToken = $token;

        $this->outreachModalOpen = false;
        $this->outreachPreviewOpen = true;
    }

    public function backToOutreachEditor(): void
    {
        $this->outreachPreviewOpen = false;
        $this->outreachModalOpen = true;
    }

    public function sendOutreach(OutreachService $svc): void
    {
        // Server-side gate: send only allowed if previewOutreach() set a
        // single-use token in the cache. #[Locked] prevents the client from
        // setting outreachSendToken directly; cache-pull() makes it one-shot.
        // Bypassing preview from the JS console is therefore impossible.
        $cacheKey = $this->outreachSendToken
            ? "outreach:preview:{$this->lead->id}:{$this->outreachSendToken}"
            : null;
        if (! $cacheKey || ! cache()->pull($cacheKey)) {
            $this->error('Vorschau erforderlich', 'Bitte öffnen Sie zuerst die Vorschau.');
            return;
        }

        $this->validate([
            'outreachSubject' => 'required|string|min:3|max:200',
            'outreachBody' => 'required|string|min:20|max:8000',
            'outreachKind' => 'required|in:initial,followup,custom',
        ]);

        try {
            $svc->send($this->lead, $this->outreachSubject, $this->outreachBody, $this->outreachKind);
            $this->outreachPreviewOpen = false;
            $this->outreachModalOpen = false;
            $this->outreachSendToken = null;
            $this->refresh();
            $this->success('E-Mail gesendet', 'Anschreiben verschickt. Lead-Status auf „Versendet" gesetzt.');
        } catch (\App\Exceptions\OutreachThrottledException $e) {
            // Surface throttle reasons as warnings (not errors) so the user
            // understands this is "warte kurz" not "Versand kaputt".
            $this->warning('Outreach gedrosselt', $e->getMessage());
        } catch (\Throwable $e) {
            $this->error('Versand fehlgeschlagen', $e->getMessage());
        }
    }

    public function markReplied(): void
    {
        $this->lead->update([
            'replied_at' => now(),
            'awaiting_response_since' => null,
            'status' => LeadStatus::Replied,
        ]);
        $this->refresh();
        $this->success('Markiert', 'Lead als „Beantwortet" gespeichert.');
    }

    #[Computed]
    public function outreachMessages()
    {
        return OutreachMessage::where('lead_id', $this->lead->id)
            ->latest('id')
            ->limit(20)
            ->get();
    }

    #[Computed]
    public function totalCost(): string
    {
        // Aggregate: lead-direct + via PrototypeVersion + anteilig SearchRun
        return number_format($this->lead->totalCostCents() / 100, 2, ',', '.').' €';
    }
}; ?>

<div class="lead-show space-y-6">
    {{-- Premium hero --}}
    <header class="lead-hero">
        <div class="lead-hero-top">
            <a href="{{ route('leads.index') }}" class="lead-back">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                Zurück zu Leads
            </a>
            @if($lead->status)
                <span class="lead-status-pill lead-status-{{ $lead->status->value }}">
                    {{ $lead->status->label() }}
                </span>
            @endif
        </div>

        <div class="lead-hero-meta">
            <span class="lead-eyebrow">
                <span class="dot"></span>
                Lead-Detail · {{ $lead->city ?? '—' }}{{ $lead->category ? ' · '.$lead->category : '' }}
            </span>
            <h1 class="lead-title">{{ $lead->name }}</h1>
            <div class="lead-quick-meta">
                @if($lead->website)
                    <a href="{{ $lead->website }}" target="_blank" rel="noopener noreferrer" class="lead-quick-item">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                        {{ \Illuminate\Support\Str::of($lead->website)->after('://')->limit(40) }}
                    </a>
                @else
                    <span class="lead-quick-item lead-quick-warn" title="Website-Qualität automatisch 0/5 — Top-Zielgruppe für Demo">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        Keine Website · 0 / 5 ★
                    </span>
                @endif
                @if($lead->phone)
                    <a href="tel:{{ str_replace([' ', '/', '-'], '', $lead->phone) }}" class="lead-quick-item">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                        {{ $lead->phone }}
                    </a>
                @endif
                @if($lead->rating)
                    <span class="lead-quick-item">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                        {{ number_format($lead->rating, 1, ',', '.') }} · {{ $lead->review_count ?? 0 }} Rezensionen
                    </span>
                @endif
                @if($lead->quality_score)
                    <span class="lead-quick-item">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                        Quality {{ $lead->quality_score }}
                    </span>
                @endif
            </div>
        </div>

        <div class="lead-hero-actions">
            @if($lead->has_website)
                <x-button icon="o-arrow-down-tray" wire:click="scrape" class="btn-outline btn-sm" label="Scrapen" spinner />
            @endif
            <x-button icon="o-sparkles" wire:click="enrich" class="btn-primary btn-sm" label="KI-Analyse" spinner
                tooltip="Erstellt mit Claude ein Marketing-Profil: Branche, Tonalität, Schwächen, Headline-Vorschlag (~0,02 €)" />
            @if($lead->latestEnrichment && !$lead->latestPrototype)
                <x-select
                    wire:model="layoutKind"
                    :options="collect(\App\Support\Enums\LayoutKind::cases())->map(fn($k) => ['id' => $k->value, 'name' => $k->emoji().' '.$k->label()])->all()"
                    class="select-sm"
                />
            @endif
            @if($lead->latestEnrichment)
                @if($lead->latestPrototype)
                    <x-button icon="o-eye" link="{{ route('prototype.review', $lead) }}" class="btn-secondary btn-sm" label="Prototyp ansehen" />
                @else
                    <x-button icon="o-cpu-chip" wire:click="generate" class="btn-accent btn-sm" label="Erzeugen" spinner />
                @endif
            @endif
            @if($lead->status?->value === 'prototyped')
                <x-button icon="o-check-badge" wire:click="approve" class="btn-success btn-sm" label="Für Entwicklung freigeben"
                    tooltip="Markiert den Prototyp als freigegeben — Vorbedingung für Outreach an den Kunden" spinner />
            @elseif($lead->isApproved())
                <span class="lead-approved-badge" title="Freigegeben {{ $lead->approved_at?->diffForHumans() }} von {{ $lead->approvedBy?->name ?? 'unbekannt' }}">
                    ✓ Freigegeben
                </span>
                <x-button icon="o-arrow-uturn-left" wire:click="revokeApproval" class="btn-ghost btn-sm btn-outline" label="Freigabe zurücknehmen" />
            @endif
            @if($lead->awaiting_response_since)
                <x-button icon="o-envelope-open" wire:click="openOutreachModal('followup')" class="btn-warning btn-sm" label="Nachfrage senden" tooltip="Wartet seit {{ $lead->awaiting_response_since->diffForHumans() }} auf Antwort" />
                <x-button icon="o-check" wire:click="markReplied" class="btn-success btn-sm btn-outline" label="Hat geantwortet" />
            @else
                <x-button icon="o-paper-airplane" wire:click="openOutreachModal('initial')" class="btn-secondary btn-sm" label="E-Mail senden" />
            @endif
            @if($lead->status?->value === 'irrelevant')
                <x-button icon="o-arrow-uturn-left" wire:click="unmarkIrrelevant" class="btn-info btn-sm btn-outline" label="Wieder relevant" />
            @else
                <x-button icon="o-no-symbol" wire:click="markIrrelevant"
                    class="btn-warning btn-sm btn-outline" label="Irrelevant" />
            @endif
            <x-button icon="o-arrow-path" wire:click="refresh" class="btn-ghost btn-sm btn-circle" />
            <x-button
                icon="o-trash"
                wire:click="deleteLead"
                wire:confirm="Diesen Lead und alle Dateien löschen? Aktion ist nicht umkehrbar."
                class="btn-error btn-sm btn-outline"
                label="Löschen"
                spinner
            />
        </div>
    </header>

    @if($lead->awaiting_response_since)
        <div class="bg-warning/10 border border-warning/30 rounded-xl px-4 py-3 flex items-center gap-3 text-sm">
            <x-icon name="o-clock" class="w-5 h-5 text-warning shrink-0" />
            <div class="flex-1">
                <strong>Wartet auf Antwort</strong> seit {{ $lead->awaiting_response_since->diffForHumans() }}
                @if($lead->last_outreach_at)
                    · Letztes Anschreiben {{ $lead->last_outreach_at->diffForHumans() }}
                @endif
            </div>
            <x-button icon="o-envelope-open" wire:click="openOutreachModal('followup')" class="btn-warning btn-xs" label="Nachfrage" />
        </div>
    @endif

    {{-- KPI strip --}}
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <x-stat title="Status" :value="$lead->status?->label() ?? '—'" icon="o-signal"
            color="{{ $lead->status?->value === 'irrelevant' ? 'text-base-content/40' : 'text-primary' }}" />
        <x-stat title="Website-Qualität"
            :value="! $lead->has_website ? '0 / 5 · keine Webseite' : ($lead->website_stars !== null ? number_format($lead->website_stars, 1, ',', '.').' / 5' : '—')"
            icon="o-star"
            color="{{ ! $lead->has_website ? 'text-error' : 'text-warning' }}" />
        <x-stat title="Google-Rezensionen" :value="number_format($lead->review_count ?? 0, 0, ',', '.').($lead->rating ? ' · ★ '.number_format($lead->rating,1,',','.') : '')"
            icon="o-chat-bubble-left-ellipsis" color="text-info" />
        <x-stat title="Score" :value="$lead->quality_score ?? '—'" icon="o-bolt" color="text-success" />
        <x-stat title="Kosten" :value="$this->totalCost" icon="o-banknotes" color="text-error" />
    </div>

    {{-- Website-Stars-Widget --}}
    <x-card title="Website-Bewertung" subtitle="Wie gut sieht die bestehende Webseite aus? Hohe Sterne = Lead vermutlich nicht akquise-relevant." shadow>
        <div class="flex items-center gap-2 flex-wrap">
            @for($i = 1; $i <= 5; $i++)
                <button type="button"
                    wire:click="rateWebsite({{ $i }})"
                    class="text-3xl transition hover:scale-110 {{ ($lead->website_stars ?? 0) >= $i ? 'text-amber-400' : 'text-base-content/20' }}"
                    title="{{ $i }} von 5"
                >★</button>
            @endfor

            @if($lead->website_stars)
                <span class="ml-3 text-sm text-base-content/70">
                    Aktuell: <strong>{{ number_format($lead->website_stars, 1, ',', '.') }} / 5</strong>
                </span>
                <x-button label="Zurücksetzen" icon="o-x-mark" wire:click="clearWebsiteRating" class="btn-ghost btn-xs ml-2" />
                @if($lead->website_stars >= 4)
                    <x-badge value="Vermutlich nicht akquise-relevant" class="badge-warning badge-sm ml-2" />
                @endif
            @else
                <span class="ml-3 text-sm text-base-content/40">Noch nicht bewertet</span>
            @endif
        </div>

        @if($this->qualitySuggestion)
            @php $suggestion = $this->qualitySuggestion; @endphp
            <div class="mt-5 p-4 rounded-lg bg-base-200/60 border border-base-300/60">
                <div class="flex items-center justify-between flex-wrap gap-2 mb-3">
                    <div>
                        <div class="text-sm font-semibold flex items-center gap-2">
                            <x-icon name="o-cpu-chip" class="w-4 h-4 text-primary" />
                            Auto-Vorschlag aus Scrape-Daten
                        </div>
                        <div class="text-xs text-base-content/60 mt-0.5">
                            Heuristik prüft 11 Signale (HTTPS, Meta, Logo, Kontakt, Services, …) — Score: {{ $suggestion->score }} / 100
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="text-amber-500 text-lg">{{ str_repeat('★', (int) floor($suggestion->stars)) }}<span class="text-base-content/20">{{ str_repeat('★', 5 - (int) floor($suggestion->stars)) }}</span></span>
                        <strong class="text-sm">{{ number_format($suggestion->stars, 1, ',', '.') }} / 5</strong>
                        @if((float)($lead->website_stars ?? 0) !== $suggestion->stars)
                            <x-button label="Übernehmen" icon="o-check" wire:click="applySuggestedRating" class="btn-primary btn-xs" />
                        @else
                            <x-badge value="übernommen" class="badge-success badge-xs" />
                        @endif
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    @if(count($suggestion->positive))
                        <div>
                            <div class="font-semibold text-success mb-1">✓ Stärken</div>
                            <ul class="space-y-0.5 text-base-content/80">
                                @foreach($suggestion->positive as $p)
                                    <li>· {{ $p }}</li>
                                @endforeach
                            </ul>
                        </div>
                    @endif
                    @if(count($suggestion->negative))
                        <div>
                            <div class="font-semibold text-error mb-1">✗ Schwächen</div>
                            <ul class="space-y-0.5 text-base-content/80">
                                @foreach($suggestion->negative as $n)
                                    <li>· {{ $n }}</li>
                                @endforeach
                            </ul>
                        </div>
                    @endif
                </div>
            </div>
        @elseif(!$lead->websiteAnalysis && $lead->website)
            <div class="mt-5 text-xs text-base-content/50">
                <x-icon name="o-light-bulb" class="w-3.5 h-3.5 inline" />
                Tipp: <em>Scrapen</em> klicken — danach erscheint hier ein Auto-Vorschlag basierend auf der Website-Analyse.
            </div>
        @endif
    </x-card>

    <div class="overflow-x-auto">
    <x-tabs wire:model="tab">
        <x-tab name="overview" label="Übersicht" icon="o-information-circle">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <x-card title="Unternehmensinfos" shadow>
                    <dl class="divide-y divide-base-300/60 text-sm">
                        @php
                            $bizFields = [
                                'Kategorie' => $lead->category,
                                'Stadt'     => $lead->city,
                                'Adresse'   => $lead->address,
                                'Place-ID'  => $lead->place_id,
                            ];
                        @endphp
                        @foreach($bizFields as $lbl => $val)
                            <div class="py-2 flex justify-between gap-2">
                                <span class="text-base-content/60">{{ $lbl }}</span>
                                <span class="font-medium truncate max-w-[60%] text-right">{{ $val ?: '—' }}</span>
                            </div>
                        @endforeach
                        @if($lead->phone)
                            <div class="py-2 flex justify-between gap-2">
                                <span class="text-base-content/60">Telefon</span>
                                <a href="tel:{{ str_replace([' ', '/', '-'], '', $lead->phone) }}" class="link link-primary font-medium">{{ $lead->phone }}</a>
                            </div>
                        @endif
                        @if($lead->website && \Illuminate\Support\Str::startsWith($lead->website, ['http://','https://']))
                            <div class="py-2 flex justify-between gap-2">
                                <span class="text-base-content/60">Website</span>
                                <a href="{{ $lead->website }}" target="_blank" rel="noopener noreferrer" class="link link-primary font-medium truncate max-w-[60%]">{{ $lead->website }}</a>
                            </div>
                        @endif
                    </dl>
                </x-card>

                @if($lead->latestEnrichment)
                    <x-card title="KI-Analyse" subtitle="Marketing-Profil aus Website + Reviews" shadow>
                        @php $e = $lead->latestEnrichment; @endphp
                        <dl class="divide-y divide-base-300/60 text-sm">
                            <div class="py-2"><span class="text-base-content/60">Nische</span><span class="ml-2 font-medium">{{ $e->niche }}</span></div>
                            <div class="py-2"><span class="text-base-content/60">Tonalität</span><span class="ml-2 badge badge-outline">{{ $e->tone }}</span></div>
                            <div class="py-2 flex-col">
                                <div class="text-base-content/60 mb-1">Zusammenfassung</div>
                                <p class="text-sm">{{ $e->summary }}</p>
                            </div>
                            <div class="py-2 flex-col">
                                <div class="text-base-content/60 mb-1">Nutzenversprechen</div>
                                <p class="text-sm italic">{{ $e->value_prop }}</p>
                            </div>
                            @if($e->weaknesses)
                                <div class="py-2 flex-col">
                                    <div class="text-base-content/60 mb-1">Schwächen</div>
                                    <ul class="list-disc ml-4 text-sm space-y-1">
                                        @foreach($e->weaknesses as $w)
                                            <li>{{ $w }}</li>
                                        @endforeach
                                    </ul>
                                </div>
                            @endif
                            <div class="py-2 flex-col">
                                <div class="text-base-content/60 mb-1">Vorgeschlagene Überschrift</div>
                                <p class="font-semibold">{{ $e->headline }}</p>
                            </div>
                        </dl>
                        <div class="mt-3 text-xs text-base-content/40 font-mono">
                            {{ $e->model }} · {{ $e->input_tokens }}+{{ $e->output_tokens }} Tok · {{ number_format($e->cost_cents/100, 2, ',', '.') }} €
                        </div>
                    </x-card>
                @else
                    <x-card title="KI-Analyse" subtitle="Erstellt ein Marketing-Profil mit Claude" shadow>
                        <div class="text-base-content/60 text-sm">
                            Noch keine KI-Analyse vorhanden.
                            <p class="mt-2 text-xs">
                                Die KI-Analyse extrahiert aus den Scrape-Daten und Google-Reviews ein Marketing-Profil:
                                Branche, Tonalität, Schwächen der bestehenden Website, sowie eine Headline für den
                                Demo-Prototyp. Notwendig vor der Prototyp-Erzeugung. Kostet pro Lead ca. 0,02 €.
                            </p>
                        </div>
                        <x-slot:actions>
                            <x-button label="KI-Analyse starten" icon="o-sparkles" wire:click="enrich" class="btn-primary btn-sm" spinner />
                        </x-slot:actions>
                    </x-card>
                @endif
            </div>
        </x-tab>

        <x-tab name="scrape" label="Scrape-Daten" icon="o-globe-alt">
            @if($lead->websiteAnalysis)
                @php $a = $lead->websiteAnalysis; @endphp
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <x-card title="Extrahierte Infos" shadow>
                        <dl class="divide-y divide-base-300/60 text-sm">
                            @foreach([
                                'Finale URL' => $a->final_url,
                                'HTTP-Status' => $a->http_status,
                                'Titel' => $a->title,
                                'Meta-Beschreibung' => $a->meta_description,
                                'Logo-URL' => $a->logo_url,
                                'Gescraped am' => $a->crawled_at?->diffForHumans(),
                                'Status' => match ((string) $a->status) {
                                    'pending', 'queued' => 'In Warteschlange',
                                    'crawling' => 'Wird geladen',
                                    'parsing' => 'Wird ausgewertet',
                                    'success', 'done' => 'Abgeschlossen',
                                    'failed' => 'Fehlgeschlagen',
                                    default => (string) ($a->status ?? '—'),
                                },
                            ] as $label => $val)
                                <div class="py-2 flex justify-between gap-2">
                                    <span class="text-base-content/60">{{ $label }}</span>
                                    <span class="truncate max-w-[60%] text-right font-medium">{{ $val ?: '—' }}</span>
                                </div>
                            @endforeach
                        </dl>
                    </x-card>

                    <x-card title="Brand & Assets" shadow>
                        <dl class="divide-y divide-base-300/60 text-sm">
                            <div class="py-2 flex justify-between items-center gap-2">
                                <span class="text-base-content/60">Logo (lokal)</span>
                                @if($a->logo_path)
                                    <img src="{{ str_replace(['http://localhost','https://localhost'], request()->getSchemeAndHttpHost(), \Illuminate\Support\Facades\Storage::disk('public')->url($a->logo_path)) }}"
                                         alt="Logo"
                                         style="max-height:40px; max-width:160px; object-fit:contain;"
                                         class="bg-base-200 rounded p-1" />
                                @else
                                    <span class="text-base-content/40">—</span>
                                @endif
                            </div>
                            <div class="py-2 flex justify-between items-center gap-2">
                                <span class="text-base-content/60">Vereinsfarben</span>
                                <div class="flex items-center gap-2 flex-wrap justify-end">
                                    @foreach(array_filter([$a->primary_color, $a->secondary_color, $a->accent_color]) as $hex)
                                        <span class="inline-flex items-center gap-1 text-xs font-mono">
                                            <span class="inline-block w-4 h-4 rounded border border-base-300" style="background:{{ $hex }}"></span>
                                            {{ $hex }}
                                        </span>
                                    @endforeach
                                    @if(empty(array_filter([$a->primary_color, $a->secondary_color, $a->accent_color])))
                                        <span class="text-base-content/40">—</span>
                                    @endif
                                </div>
                            </div>
                            <div class="py-2 flex justify-between gap-2">
                                <span class="text-base-content/60">Heading-Schrift</span>
                                <span class="font-medium">{{ $a->heading_font_family ?: '—' }}</span>
                            </div>
                            <div class="py-2 flex justify-between gap-2">
                                <span class="text-base-content/60">Body-Schrift</span>
                                <span class="font-medium">{{ $a->body_font_family ?: '—' }}</span>
                            </div>
                            <div class="py-2 flex justify-between gap-2">
                                <span class="text-base-content/60">Hero-Bilder</span>
                                <span class="font-medium">{{ count((array) $a->hero_images) }}</span>
                            </div>
                            <div class="py-2 flex justify-between gap-2">
                                <span class="text-base-content/60">Galerie-Bilder</span>
                                <span class="font-medium">{{ count((array) $a->gallery_images) }}</span>
                            </div>
                            <div class="py-2 flex justify-between gap-2">
                                <span class="text-base-content/60">Heruntergeladene Assets</span>
                                <span class="font-medium">{{ count((array) $a->downloaded_assets) }}</span>
                            </div>
                        </dl>

                        @if($a->downloaded_assets && count((array) $a->downloaded_assets))
                            <div class="mt-3">
                                <div class="text-xs text-base-content/60 uppercase tracking-wider mb-2">Asset-Vorschau</div>
                                <div class="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                    @foreach(array_slice((array) $a->downloaded_assets, 0, 8) as $asset)
                                        @if(!empty($asset['public_url']))
                                            <img src="{{ str_replace(['http://localhost','https://localhost'], request()->getSchemeAndHttpHost(), $asset['public_url']) }}"
                                                 alt="{{ $asset['alt'] ?? '' }}"
                                                 style="aspect-ratio: 1/1; object-fit: cover; width: 100%;"
                                                 class="rounded border border-base-300" />
                                        @endif
                                    @endforeach
                                </div>
                            </div>
                        @endif
                    </x-card>

                    <div class="space-y-4">
                        @if($a->contact)
                            <x-card title="Kontaktdaten" shadow>
                                <dl class="divide-y divide-base-300/60 text-sm">
                                    @foreach($a->contact as $key => $val)
                                        @if($val)
                                            <div class="py-2 flex justify-between gap-2">
                                                <span class="text-base-content/60 capitalize">{{ str_replace('_', ' ', $key) }}</span>
                                                <span class="font-medium text-right truncate max-w-[65%]">
                                                    @if(str_starts_with($val, 'mailto:') || str_contains($val, '@'))
                                                        <a href="mailto:{{ str_replace('mailto:', '', $val) }}" class="link link-primary">{{ str_replace('mailto:', '', $val) }}</a>
                                                    @elseif(str_starts_with($val, 'tel:') || str_starts_with($val, '+'))
                                                        <a href="tel:{{ str_replace('tel:', '', $val) }}" class="link link-primary">{{ str_replace('tel:', '', $val) }}</a>
                                                    @else
                                                        {{ $val }}
                                                    @endif
                                                </span>
                                            </div>
                                        @endif
                                    @endforeach
                                </dl>
                            </x-card>
                        @endif
                        @if($a->services)
                            <x-card title="Leistungen" shadow>
                                <ul class="divide-y divide-base-300/60 text-sm">
                                    @foreach($a->services as $s)
                                        <li class="py-2">{{ $s }}</li>
                                    @endforeach
                                </ul>
                            </x-card>
                        @endif
                        @if($a->socials)
                            <x-card title="Soziale Profile" shadow>
                                <dl class="divide-y divide-base-300/60 text-sm">
                                    @foreach($a->socials as $platform => $url)
                                        @if($url && \Illuminate\Support\Str::startsWith($url, ['http://','https://']))
                                            <div class="py-2 flex justify-between gap-2">
                                                <span class="text-base-content/60 capitalize">{{ $platform }}</span>
                                                <a href="{{ $url }}" target="_blank" rel="noopener noreferrer" class="link link-primary truncate max-w-[65%]">{{ $url }}</a>
                                            </div>
                                        @endif
                                    @endforeach
                                </dl>
                            </x-card>
                        @endif
                    </div>
                </div>
            @else
                <div class="mt-6 text-base-content/50 text-sm">
                    Noch keine Scrape-Daten.
                    @if($lead->website)
                        <x-button label="Jetzt scrapen" icon="o-arrow-down-tray" wire:click="scrape" class="btn-primary btn-sm ml-2" spinner />
                    @else
                        Dieser Lead hat keine Website.
                    @endif
                </div>
            @endif
        </x-tab>

        <x-tab name="outreach" label="E-Mail-Verlauf" icon="o-paper-airplane">
            <div class="mt-4 space-y-3">
                @php $messages = $this->outreachMessages; @endphp
                @if($messages->isEmpty())
                    <div class="text-center py-12 text-base-content/50">
                        <x-icon name="o-envelope" class="w-12 h-12 mx-auto mb-3 text-base-content/20" />
                        <p>Noch keine E-Mails an diesen Lead versendet.</p>
                        <x-button label="E-Mail jetzt senden" icon="o-paper-airplane" wire:click="openOutreachModal('initial')" class="btn-primary btn-sm mt-3" />
                    </div>
                @else
                    @foreach($messages as $msg)
                        <x-card shadow class="!border-l-4 {{ $msg->status === 'sent' ? '!border-l-success' : ($msg->status === 'failed' ? '!border-l-error' : '!border-l-base-300') }}">
                            <div class="flex items-start justify-between gap-3 mb-2">
                                <div class="min-w-0">
                                    <div class="font-semibold text-sm">{{ $msg->subject }}</div>
                                    <div class="text-xs text-base-content/60 mt-0.5">
                                        an <a href="mailto:{{ $msg->to_email }}" class="link">{{ $msg->to_email }}</a>
                                        · {{ $msg->kind === 'followup' ? 'Nachfrage' : ($msg->kind === 'initial' ? 'Erstanschreiben' : 'Individuell') }}
                                    </div>
                                </div>
                                <div class="text-right text-xs shrink-0">
                                    <x-badge :value="match($msg->status) {
                                        'sent' => 'Gesendet',
                                        'failed' => 'Fehlgeschlagen',
                                        'queued' => 'In Warteschlange',
                                        default => $msg->status,
                                    }" class="{{ $msg->status === 'sent' ? 'badge-success' : ($msg->status === 'failed' ? 'badge-error' : 'badge-ghost') }} badge-sm" />
                                    <div class="text-base-content/50 mt-1">
                                        {{ ($msg->sent_at ?? $msg->created_at)->diffForHumans() }}
                                    </div>
                                </div>
                            </div>
                            <pre class="whitespace-pre-wrap text-xs text-base-content/70 font-sans bg-base-200/40 rounded p-3 max-h-40 overflow-y-auto">{{ $msg->body }}</pre>
                            @if($msg->error)
                                <div class="mt-2 text-xs text-error font-mono">Fehler: {{ $msg->error }}</div>
                            @endif
                        </x-card>
                    @endforeach
                @endif
            </div>
        </x-tab>

        <x-tab name="costs" label="Kosten" icon="o-banknotes">
            <div class="mt-4">
                @if($lead->costLogs->isNotEmpty())
                    <x-table
                        :headers="[['key'=>'provider','label'=>'Anbieter'],['key'=>'units','label'=>'Einheiten'],['key'=>'cost_cents','label'=>'Kosten'],['key'=>'created_at','label'=>'Wann']]"
                        :rows="$lead->costLogs->map(fn($c) => (object)['provider'=>$c->provider->value,'units'=>$c->units,'cost_cents'=>number_format($c->cost_cents/100,2,',','.').' €','created_at'=>$c->created_at->diffForHumans()])"
                        striped
                    />
                @else
                    <p class="text-base-content/50 text-sm">Noch keine Kostenlogs.</p>
                @endif
            </div>
        </x-tab>
    </x-tabs>
    </div>

    {{-- Outreach modal — Step 1: Edit --}}
    <x-modal wire:model="outreachModalOpen" title="{{ $outreachKind === 'followup' ? 'Nachfrage bearbeiten' : 'E-Mail bearbeiten' }}" separator>
        <p class="text-xs text-base-content/60 mb-3">
            Empfänger: <strong>{{ app(\App\Domain\Outreach\OutreachService::class)->resolveRecipientEmail($lead) ?? '—' }}</strong> ·
            Platzhalter: <code>{name}</code>, <code>{city}</code>, <code>{category}</code>, <code>{preview_url}</code>
        </p>

        <x-input label="Betreff" wire:model="outreachSubject" placeholder="Vorschlag für Ihre neue Webseite — {name}" required />

        <x-textarea label="Nachricht" wire:model="outreachBody" rows="14" required class="text-sm leading-relaxed" />

        <x-slot:actions>
            <x-button label="Abbrechen" @click="$wire.outreachModalOpen = false" class="btn-ghost btn-sm" />
            <x-button label="Vorschau ansehen"
                icon="o-eye" wire:click="previewOutreach" class="btn-primary btn-sm" spinner />
        </x-slot:actions>
    </x-modal>

    {{-- Outreach modal — Step 2: Preview before send --}}
    <x-modal wire:model="outreachPreviewOpen" title="Vorschau — so wird die E-Mail verschickt" separator class="max-w-3xl">
        <div class="email-preview">
            <div class="email-preview-meta">
                <div><span class="meta-label">An:</span> <strong>{{ $previewRecipient ?? '—' }}</strong></div>
                <div><span class="meta-label">Betreff:</span> <strong>{{ $previewSubject }}</strong></div>
            </div>
            <hr class="my-3 border-base-300/60" />
            <div class="email-preview-body">{{ $previewBody }}</div>
        </div>

        <x-slot:actions>
            <x-button label="← Zurück bearbeiten" @click="$wire.backToOutreachEditor()" class="btn-ghost btn-sm" />
            <x-button label="{{ $outreachKind === 'followup' ? 'Nachfrage jetzt senden' : 'E-Mail jetzt senden' }}"
                icon="o-paper-airplane" wire:click="sendOutreach" class="btn-primary btn-sm" spinner />
        </x-slot:actions>
    </x-modal>
</div>

<style>
    .lead-show { padding-bottom: 2rem; }

    /* ─── Email preview modal ────────────────────────────────── */
    .email-preview {
        background: #fff;
        border: 1px solid rgba(10, 10, 10, 0.1);
        border-radius: 8px;
        padding: 1.25rem 1.5rem;
        font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    }
    .email-preview-meta { font-size: 0.875rem; color: #1f2937; line-height: 1.6; }
    .email-preview-meta .meta-label { color: #6b7280; display: inline-block; min-width: 4rem; }
    .email-preview-body {
        font-size: 0.9rem;
        line-height: 1.65;
        color: #1f2937;
        white-space: pre-wrap;
        word-break: break-word;
    }

    /* ─── Hero ──────────────────────────────────────────────── */
    .lead-hero {
        position: relative;
        padding: clamp(1.5rem, 3vw, 2.25rem);
        border-radius: 20px;
        background:
            radial-gradient(circle at 0% 0%, rgba(124,58,237,0.18) 0%, transparent 50%),
            radial-gradient(circle at 100% 100%, rgba(236,101,186,0.18) 0%, transparent 50%),
            linear-gradient(135deg, #ffffff 0%, #f5f5f7 100%);
        border: 1px solid rgba(0,0,0,0.06);
        overflow: hidden;
    }

    .lead-hero-top {
        display: flex; align-items: center; justify-content: space-between;
        margin-bottom: 1.25rem;
        gap: 1rem;
    }
    .lead-back {
        display: inline-flex; align-items: center; gap: 0.4rem;
        font-size: 0.84rem; font-weight: 500;
        color: rgba(10,10,10,0.55);
        text-decoration: none;
        transition: all .2s;
    }
    .lead-back:hover { color: #ec65ba; gap: 0.6rem; }
    .lead-status-pill {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.7rem; letter-spacing: 0.1em; text-transform: uppercase;
        font-weight: 700;
        padding: 0.35rem 0.85rem;
        border-radius: 999px;
    }
    /* Status pills — darkened text colors to pass WCAG AA (4.5:1) on white. */
    .lead-status-new        { background: rgba(0,0,0,0.05); color: rgba(10,10,10,0.7); border: 1px solid rgba(0,0,0,0.12); }
    .lead-status-scraped    { background: rgba(6,182,212,0.18);  color: #0e7490; border: 1px solid rgba(6,182,212,0.35); }
    .lead-status-enriched   { background: rgba(168,85,247,0.18); color: #7c3aed; border: 1px solid rgba(168,85,247,0.35); }
    .lead-status-prototyped { background: rgba(236,101,186,0.18); color: #be185d; border: 1px solid rgba(236,101,186,0.35); }
    .lead-status-approved   { background: rgba(16,185,129,0.18); color: #047857; border: 1px solid rgba(16,185,129,0.35); }
    .lead-approved-badge {
        display: inline-flex; align-items: center; gap: 0.3rem;
        padding: 0.35rem 0.85rem; border-radius: 999px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.7rem; letter-spacing: 0.1em; text-transform: uppercase;
        font-weight: 700;
        background: rgba(16,185,129,0.15); color: #047857;
        border: 1px solid rgba(16,185,129,0.35);
    }
    .lead-status-sent       { background: rgba(59,130,246,0.18); color: #1d4ed8; border: 1px solid rgba(59,130,246,0.35); }
    .lead-status-replied    { background: rgba(34,197,94,0.20);  color: #15803d; border: 1px solid rgba(34,197,94,0.4); }
    .lead-status-irrelevant { background: rgba(245,158,11,0.18); color: #b45309; border: 1px solid rgba(245,158,11,0.35); }

    .lead-eyebrow {
        display: inline-flex; align-items: center; gap: 0.55rem;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.72rem; letter-spacing: 0.14em; text-transform: uppercase;
        color: #7c3aed;
        padding: 0.35rem 0.85rem;
        background: rgba(192,132,252,0.12);
        border: 1px solid rgba(192,132,252,0.3);
        border-radius: 999px;
        font-weight: 600;
        flex-wrap: wrap; row-gap: 4px;
        max-width: 100%;
    }
    @media (max-width: 480px) {
        .lead-eyebrow { font-size: 0.66rem; padding: 0.4rem 0.7rem; line-height: 1.4; }
    }
    .lead-eyebrow .dot {
        width: 6px; height: 6px; border-radius: 50%;
        background: #7c3aed;
        animation: lead-pulse 2.4s ease-in-out infinite;
    }
    @keyframes lead-pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.4; transform: scale(0.7); }
    }
    .lead-title {
        font-family: 'Fraunces', Georgia, serif;
        font-size: clamp(1.85rem, 3.5vw, 2.85rem);
        font-weight: 500; letter-spacing: -0.025em; line-height: 1.05;
        margin: 1rem 0 1rem;
        color: #0a0a0a;
    }
    .lead-quick-meta {
        display: flex; flex-wrap: wrap; gap: 0.65rem 1.25rem;
        margin-bottom: 1.5rem;
    }
    .lead-quick-item {
        display: inline-flex; align-items: center; gap: 0.4rem;
        font-size: 0.86rem;
        color: rgba(10,10,10,0.7);
        text-decoration: none;
        transition: color .2s;
    }
    a.lead-quick-item:hover { color: #ec65ba; }
    .lead-quick-warn { color: #fbbf24; }

    .lead-hero-actions {
        display: flex; flex-wrap: wrap; gap: 0.5rem;
        padding-top: 1.25rem;
        border-top: 1px solid rgba(0,0,0,0.06);
    }

    /* ─── Detail rows in cards: prevent label/value collision on mobile ── */
    .lead-show .lead-hero-actions .btn,
    .lead-show .lead-hero-actions .x-button { min-height: 44px; }
    @media (max-width: 480px) {
        /* Stack each <dt>/<dd> pair vertically so long values (e.g. URLs)
           don't collide with the label or overflow the card. */
        .lead-show dl > div.flex { flex-direction: column; align-items: flex-start; }
        .lead-show dl > div.flex > .truncate { max-width: 100% !important; text-align: left; }
        .lead-show dl > div.flex > span,
        .lead-show dl > div.flex > a { text-align: left; }
        /* Quick-meta row links/badges shrink-friendly */
        .lead-quick-item { max-width: 100%; word-break: break-word; }
    }
</style>
