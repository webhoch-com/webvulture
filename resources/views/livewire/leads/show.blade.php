<?php

use App\Jobs\EnrichLeadJob;
use App\Jobs\RequestPrototypeGenerationJob;
use App\Jobs\ScrapeSiteJob;
use App\Models\Lead;
use Livewire\Attributes\Computed;
use Livewire\Volt\Component;
use Mary\Traits\Toast;

new class extends Component {
    use Toast;

    public Lead $lead;

    public string $tab = 'Overview';

    public function mount(Lead $lead): void
    {
        $this->lead = $lead->load([
            'websiteAnalysis',
            'latestEnrichment',
            'latestPrototype',
            'costLogs',
            'scrapeJobs' => fn($q) => $q->latest()->limit(3),
        ]);
    }

    public function scrape(): void
    {
        if (!$this->lead->website) {
            $this->error('No website', 'Lead has no website URL.');
            return;
        }
        ScrapeSiteJob::dispatch($this->lead->id)->onQueue('scrape');
        $this->success('Queued', 'Scrape job dispatched.');
    }

    public function enrich(): void
    {
        EnrichLeadJob::dispatch($this->lead->id)->onQueue('enrichment');
        $this->success('Queued', 'Enrichment job dispatched.');
    }

    public function generate(): void
    {
        if (!$this->lead->latestEnrichment) {
            $this->error('Not enriched', 'Run enrichment first.');
            return;
        }
        RequestPrototypeGenerationJob::dispatch($this->lead->id)->onQueue('generation');
        $this->success('Queued', 'Prototype generation dispatched.');
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

    #[Computed]
    public function totalCost(): string
    {
        return '$'.number_format($this->lead->costLogs->sum('cost_cents') / 100, 4);
    }
}; ?>

<div class="space-y-6">
    <x-header :title="$lead->name" :subtitle="$lead->city.($lead->category ? ' · '.$lead->category : '')" separator>
        <x-slot:actions>
            <x-button icon="o-arrow-left" link="{{ route('leads.index') }}" class="btn-ghost btn-sm" label="Leads" />
            @if($lead->has_website)
                <x-button icon="o-arrow-down-tray" wire:click="scrape" class="btn-outline btn-sm" label="Scrape" spinner />
            @endif
            <x-button icon="o-sparkles" wire:click="enrich" class="btn-primary btn-sm" label="Enrich" spinner />
            @if($lead->latestEnrichment)
                @if($lead->latestPrototype)
                    <x-button icon="o-eye" link="{{ route('prototype.review', $lead) }}" class="btn-secondary btn-sm" label="View Prototype" />
                @else
                    <x-button icon="o-cpu-chip" wire:click="generate" class="btn-accent btn-sm" label="Generate" spinner />
                @endif
            @endif
            <x-button icon="o-arrow-path" wire:click="refresh" class="btn-ghost btn-sm btn-circle" />
            <x-button
                icon="o-trash"
                wire:click="deleteLead"
                wire:confirm="Delete this lead and all its files? This cannot be undone."
                class="btn-error btn-sm btn-outline"
                label="Delete"
                spinner
            />
        </x-slot:actions>
    </x-header>

    {{-- KPI strip --}}
    <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
        <x-stat title="Status"  :value="$lead->status?->label() ?? '—'"        icon="o-signal"       color="text-primary" />
        <x-stat title="Rating"  :value="$lead->rating ? '★ '.$lead->rating : '—'" icon="o-star"      color="text-warning" />
        <x-stat title="Reviews" :value="number_format($lead->review_count ?? 0)"   icon="o-chat-bubble-left-ellipsis" color="text-info" />
        <x-stat title="Score"   :value="$lead->quality_score ?? '—'"            icon="o-bolt"         color="text-success" />
        <x-stat title="Cost"    :value="$this->totalCost"                       icon="o-banknotes"    color="text-error" />
    </div>

    <x-tabs wire:model="tab">
        <x-tab name="Overview" label="Overview" icon="o-information-circle">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <x-card title="Business info" shadow>
                    <dl class="divide-y divide-base-300/60 text-sm">
                        @php
                            $bizFields = [
                                'Category' => $lead->category,
                                'City'     => $lead->city,
                                'Address'  => $lead->address,
                                'Place ID' => $lead->place_id,
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
                                <span class="text-base-content/60">Phone</span>
                                <a href="tel:{{ $lead->phone }}" class="link link-primary font-medium">{{ $lead->phone }}</a>
                            </div>
                        @endif
                        @if($lead->website)
                            <div class="py-2 flex justify-between gap-2">
                                <span class="text-base-content/60">Website</span>
                                <a href="{{ $lead->website }}" target="_blank" class="link link-primary font-medium truncate max-w-[60%]">{{ $lead->website }}</a>
                            </div>
                        @endif
                    </dl>
                </x-card>

                @if($lead->latestEnrichment)
                    <x-card title="AI enrichment" shadow>
                        @php $e = $lead->latestEnrichment; @endphp
                        <dl class="divide-y divide-base-300/60 text-sm">
                            <div class="py-2"><span class="text-base-content/60">Niche</span><span class="ml-2 font-medium">{{ $e->niche }}</span></div>
                            <div class="py-2"><span class="text-base-content/60">Tone</span><span class="ml-2 badge badge-outline">{{ $e->tone }}</span></div>
                            <div class="py-2 flex-col">
                                <div class="text-base-content/60 mb-1">Summary</div>
                                <p class="text-sm">{{ $e->summary }}</p>
                            </div>
                            <div class="py-2 flex-col">
                                <div class="text-base-content/60 mb-1">Value prop</div>
                                <p class="text-sm italic">{{ $e->value_prop }}</p>
                            </div>
                            @if($e->weaknesses)
                                <div class="py-2 flex-col">
                                    <div class="text-base-content/60 mb-1">Weaknesses</div>
                                    <ul class="list-disc ml-4 text-sm space-y-1">
                                        @foreach($e->weaknesses as $w)
                                            <li>{{ $w }}</li>
                                        @endforeach
                                    </ul>
                                </div>
                            @endif
                            <div class="py-2 flex-col">
                                <div class="text-base-content/60 mb-1">Suggested headline</div>
                                <p class="font-semibold">{{ $e->headline }}</p>
                            </div>
                        </dl>
                        <div class="mt-3 text-xs text-base-content/40 font-mono">
                            {{ $e->model }} · {{ $e->input_tokens }}+{{ $e->output_tokens }} tok · ${{ number_format($e->cost_cents/100, 4) }}
                        </div>
                    </x-card>
                @else
                    <x-card title="AI enrichment" shadow>
                        <div class="text-base-content/50 text-sm">Not enriched yet.</div>
                        <x-slot:actions>
                            <x-button label="Run enrichment" icon="o-sparkles" wire:click="enrich" class="btn-primary btn-sm" spinner />
                        </x-slot:actions>
                    </x-card>
                @endif
            </div>
        </x-tab>

        <x-tab name="Scraped data" label="Scraped data" icon="o-globe-alt">
            @if($lead->websiteAnalysis)
                @php $a = $lead->websiteAnalysis; @endphp
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <x-card title="Extracted info" shadow>
                        <dl class="divide-y divide-base-300/60 text-sm">
                            @foreach([
                                'Final URL' => $a->final_url,
                                'HTTP status' => $a->http_status,
                                'Title' => $a->title,
                                'Meta desc' => $a->meta_description,
                                'Logo URL' => $a->logo_url,
                                'Scraped at' => $a->crawled_at?->diffForHumans(),
                                'Status' => $a->status,
                            ] as $label => $val)
                                <div class="py-2 flex justify-between gap-2">
                                    <span class="text-base-content/60">{{ $label }}</span>
                                    <span class="truncate max-w-[60%] text-right font-medium">{{ $val ?: '—' }}</span>
                                </div>
                            @endforeach
                        </dl>
                    </x-card>

                    <div class="space-y-4">
                        @if($a->contact)
                            <x-card title="Contact info" shadow>
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
                            <x-card title="Services" shadow>
                                <ul class="divide-y divide-base-300/60 text-sm">
                                    @foreach($a->services as $s)
                                        <li class="py-2">{{ $s }}</li>
                                    @endforeach
                                </ul>
                            </x-card>
                        @endif
                        @if($a->socials)
                            <x-card title="Social links" shadow>
                                <dl class="divide-y divide-base-300/60 text-sm">
                                    @foreach($a->socials as $platform => $url)
                                        @if($url)
                                            <div class="py-2 flex justify-between gap-2">
                                                <span class="text-base-content/60 capitalize">{{ $platform }}</span>
                                                <a href="{{ $url }}" target="_blank" class="link link-primary truncate max-w-[65%]">{{ $url }}</a>
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
                    No scrape data yet.
                    @if($lead->website)
                        <x-button label="Scrape now" icon="o-arrow-down-tray" wire:click="scrape" class="btn-primary btn-sm ml-2" spinner />
                    @else
                        This lead has no website.
                    @endif
                </div>
            @endif
        </x-tab>

        <x-tab name="Costs" label="Costs" icon="o-banknotes">
            <div class="mt-4">
                @if($lead->costLogs->isNotEmpty())
                    <x-table
                        :headers="[['key'=>'provider','label'=>'Provider'],['key'=>'units','label'=>'Units'],['key'=>'cost_cents','label'=>'Cost'],['key'=>'created_at','label'=>'When']]"
                        :rows="$lead->costLogs->map(fn($c) => (object)['provider'=>$c->provider->value,'units'=>$c->units,'cost_cents'=>'$'.number_format($c->cost_cents/100,4),'created_at'=>$c->created_at->diffForHumans()])"
                        striped
                    />
                @else
                    <p class="text-base-content/50 text-sm">No cost logs yet.</p>
                @endif
            </div>
        </x-tab>
    </x-tabs>
</div>
