<?php

use App\Jobs\ScrapeSiteJob;
use App\Jobs\EnrichLeadJob;
use App\Models\Lead;
use App\Support\Enums\LeadStatus;
use Livewire\Attributes\Url;
use Livewire\Volt\Component;
use Livewire\WithPagination;
use Mary\Traits\Toast;

new class extends Component {
    use WithPagination, Toast;

    #[Url(as: 'q')]
    public string $search = '';

    #[Url]
    public string $status = '';

    #[Url]
    public string $website = '';

    #[Url]
    public int $perPage = 15;

    public function updating(): void
    {
        $this->resetPage();
    }

    public function clear(): void
    {
        $this->reset(['search', 'status', 'website']);
        $this->resetPage();
    }

    public function scrape(int $leadId): void
    {
        $lead = Lead::findOrFail($leadId);
        if (!$lead->website) {
            $this->error('No website', 'Lead has no website to scrape.');
            return;
        }
        ScrapeSiteJob::dispatch($leadId)->onQueue('scrape');
        $this->success('Queued', "Scraping {$lead->name}…");
    }

    public function enrich(int $leadId): void
    {
        EnrichLeadJob::dispatch($leadId)->onQueue('enrichment');
        $this->success('Queued', 'Enrichment job dispatched.');
    }

    public function delete(int $leadId): void
    {
        Lead::findOrFail($leadId)->delete();
        $this->success('Deleted', 'Lead and all files removed.');
    }

    public function with(): array
    {
        $headers = [
            ['key' => 'name', 'label' => 'Business'],
            ['key' => 'category', 'label' => 'Category'],
            ['key' => 'city', 'label' => 'City'],
            ['key' => 'website', 'label' => 'Website'],
            ['key' => 'rating', 'label' => 'Rating', 'class' => 'w-20'],
            ['key' => 'quality_score', 'label' => 'Score', 'class' => 'w-16'],
            ['key' => 'status', 'label' => 'Status', 'class' => 'w-28'],
            ['key' => 'actions', 'label' => '', 'class' => 'w-32'],
        ];

        $rows = Lead::query()
            ->when($this->search, fn ($q) => $q->where('name', 'like', "%{$this->search}%"))
            ->when($this->status, fn ($q) => $q->where('status', $this->status))
            ->when($this->website === 'yes', fn ($q) => $q->where('has_website', true))
            ->when($this->website === 'no', fn ($q) => $q->where('has_website', false))
            ->latest('id')
            ->paginate($this->perPage);

        $statusOptions = collect(LeadStatus::cases())
            ->map(fn ($s) => ['id' => $s->value, 'name' => $s->label()])
            ->all();

        return compact('headers', 'rows', 'statusOptions');
    }
}; ?>

<div class="space-y-6">
    <x-header title="Leads" subtitle="Discovered businesses" separator wire:poll.10s>
        <x-slot:actions>
            <x-button label="New search" icon="o-plus" link="{{ route('search') }}" class="btn-primary btn-sm" />
        </x-slot:actions>
    </x-header>

    <x-card shadow>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
            <x-input placeholder="Search name…" wire:model.live.debounce="search" icon="o-magnifying-glass" clearable />
            <x-select placeholder="Status" :options="$statusOptions" wire:model.live="status" icon="o-flag" />
            <x-select placeholder="Website" :options="[['id'=>'yes','name'=>'Has website'],['id'=>'no','name'=>'No website']]" wire:model.live="website" icon="o-globe-alt" />
            <x-button label="Clear" icon="o-x-mark" wire:click="clear" class="btn-ghost btn-sm" />
        </div>
    </x-card>

    <x-card shadow>
        <x-table :headers="$headers" :rows="$rows" with-pagination striped>
            @scope('cell_name', $row)
                <a href="{{ route('leads.show', $row) }}" class="font-medium link link-hover">{{ $row->name }}</a>
                @if(!$row->has_website)
                    <x-badge value="no site" class="badge-warning badge-xs ml-1" />
                @endif
            @endscope

            @scope('cell_website', $row)
                @if($row->website)
                    <a href="{{ $row->website }}" target="_blank" class="link link-primary text-xs">
                        {{ \Illuminate\Support\Str::of($row->website)->after('://')->limit(25) }}
                    </a>
                @else
                    <span class="text-base-content/40 text-xs">—</span>
                @endif
            @endscope

            @scope('cell_rating', $row)
                <span class="text-sm">{{ $row->rating ? '★ '.number_format($row->rating,1) : '—' }}</span>
            @endscope

            @scope('cell_quality_score', $row)
                <span class="font-mono text-xs badge badge-outline">{{ $row->quality_score }}</span>
            @endscope

            @scope('cell_status', $row)
                <x-status :value="$row->status" />
            @endscope

            @scope('cell_actions', $row)
                <div class="flex gap-1">
                    @if($row->has_website && $row->status->value === 'new')
                        <x-button icon="o-arrow-down-tray" wire:click="scrape({{ $row->id }})" class="btn-ghost btn-xs" tooltip="Scrape" />
                    @endif
                    @if(in_array($row->status->value, ['scraped','new']))
                        <x-button icon="o-sparkles" wire:click="enrich({{ $row->id }})" class="btn-ghost btn-xs" tooltip="Enrich" />
                    @endif
                    <x-button icon="o-eye" link="{{ route('leads.show', $row) }}" class="btn-ghost btn-xs" tooltip="View" />
                    <x-button
                        icon="o-trash"
                        wire:click="delete({{ $row->id }})"
                        wire:confirm="Delete '{{ addslashes($row->name) }}' and all its files?"
                        class="btn-ghost btn-xs text-error"
                        tooltip="Delete"
                    />
                </div>
            @endscope
        </x-table>
    </x-card>
</div>
