<?php

use App\Models\Lead;
use App\Support\Enums\LeadStatus;
use Livewire\Attributes\Url;
use Livewire\Volt\Component;
use Livewire\WithPagination;

new class extends Component {
    use WithPagination;

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

    public function with(): array
    {
        $headers = [
            ['key' => 'name', 'label' => 'Business'],
            ['key' => 'category', 'label' => 'Category'],
            ['key' => 'city', 'label' => 'City'],
            ['key' => 'website', 'label' => 'Website'],
            ['key' => 'rating', 'label' => 'Rating', 'class' => 'w-24'],
            ['key' => 'review_count', 'label' => 'Reviews', 'class' => 'w-20'],
            ['key' => 'quality_score', 'label' => 'Score', 'class' => 'w-20'],
            ['key' => 'status', 'label' => 'Status', 'class' => 'w-28'],
        ];

        $rows = Lead::query()
            ->when($this->search, fn ($q) => $q->where('name', 'like', "%{$this->search}%"))
            ->when($this->status, fn ($q) => $q->where('status', $this->status))
            ->when($this->website === 'yes', fn ($q) => $q->where('has_website', true))
            ->when($this->website === 'no', fn ($q) => $q->where('has_website', false))
            ->latest('id')
            ->paginate($this->perPage);

        $statusOptions = collect(LeadStatus::cases())->map(fn ($s) => ['id' => $s->value, 'name' => $s->label()])->all();

        return compact('headers', 'rows', 'statusOptions');
    }
}; ?>

<div class="space-y-6">
    <x-header title="Leads" subtitle="Discovered businesses" separator wire:poll.10s>
        <x-slot:actions>
            <x-button label="New search" icon="o-plus" link="{{ route('search') }}" class="btn-primary" />
        </x-slot:actions>
    </x-header>

    <x-card shadow>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
            <x-input placeholder="Search name…" wire:model.live.debounce="search" icon="o-magnifying-glass" clearable />
            <x-select placeholder="Status" :options="$statusOptions" wire:model.live="status" icon="o-flag" />
            <x-select placeholder="Website" :options="[['id' => 'yes', 'name' => 'Has website'], ['id' => 'no', 'name' => 'No website']]" wire:model.live="website" icon="o-globe-alt" />
            <x-button label="Clear filters" icon="o-x-mark" wire:click="clear" class="btn-ghost" />
        </div>
    </x-card>

    <x-card shadow>
        <x-table :headers="$headers" :rows="$rows" with-pagination striped>
            @scope('cell_name', $row)
                <div class="font-medium">{{ $row->name }}</div>
                <div class="text-xs text-base-content/60 font-mono">{{ $row->place_id }}</div>
            @endscope

            @scope('cell_website', $row)
                @if ($row->website)
                    <a href="{{ $row->website }}" target="_blank" class="link link-primary text-sm">{{ \Illuminate\Support\Str::of($row->website)->after('://')->limit(28) }}</a>
                @else
                    <x-badge value="none" class="badge-ghost badge-sm" />
                @endif
            @endscope

            @scope('cell_rating', $row)
                {{ $row->rating ? number_format($row->rating, 1) : '—' }}
            @endscope

            @scope('cell_quality_score', $row)
                <span class="font-mono text-xs">{{ $row->quality_score }}</span>
            @endscope

            @scope('cell_status', $row)
                <x-status :value="$row->status" />
            @endscope
        </x-table>
    </x-card>
</div>
