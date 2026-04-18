<?php

use App\Jobs\RequestPrototypeGenerationJob;
use App\Models\Lead;
use App\Models\Prototype;
use App\Models\PrototypeVersion;
use Livewire\Volt\Component;
use Mary\Traits\Toast;

new class extends Component {
    use Toast;

    public Lead $lead;
    public ?Prototype $prototype = null;

    public function mount(Lead $lead): void
    {
        $this->lead = $lead;
        $this->prototype = Prototype::with(['currentVersion', 'versions' => fn($q) => $q->latest('version')])
            ->where('lead_id', $lead->id)
            ->first();
    }

    public function regenerate(): void
    {
        RequestPrototypeGenerationJob::dispatch($this->lead->id)->onQueue('generation');
        $this->success('Queued', 'Regeneration dispatched.');
        $this->prototype = $this->prototype?->fresh(['currentVersion', 'versions']);
    }

    public function approve(): void
    {
        if (!$this->prototype?->currentVersion) {
            $this->error('No version', 'No deployed version to approve.');
            return;
        }
        $this->lead->update(['status' => \App\Support\Enums\LeadStatus::Approved]);
        $this->success('Approved', 'Lead marked as approved.');
        $this->lead->refresh();
    }
}; ?>

<div class="space-y-6">
    <x-header :title="'Prototype: '.$lead->name" :subtitle="$lead->city" separator>
        <x-slot:actions>
            <x-button icon="o-arrow-left" link="{{ route('leads.show', $lead) }}" class="btn-ghost btn-sm" label="Back" />
            <x-button icon="o-cpu-chip" wire:click="regenerate" class="btn-outline btn-sm" label="Regenerate" spinner />
            @if($prototype?->status === 'deployed')
                <x-button icon="o-check-circle" wire:click="approve" class="btn-success btn-sm" label="Approve" spinner />
            @endif
        </x-slot:actions>
    </x-header>

    @if(!$prototype)
        <x-card shadow>
            <div class="text-center py-12 text-base-content/50">
                <x-icon name="o-cpu-chip" class="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p class="text-lg">No prototype yet.</p>
                <x-button label="Generate now" icon="o-sparkles" wire:click="regenerate" class="btn-primary mt-4" spinner />
            </div>
        </x-card>
    @else
        {{-- Status banner --}}
        <div class="flex items-center gap-3">
            <span class="text-sm text-base-content/60">Status:</span>
            @php
                $color = match($prototype->status) {
                    'generating' => 'badge-warning',
                    'deployed'   => 'badge-success',
                    'failed'     => 'badge-error',
                    default      => 'badge-ghost',
                };
            @endphp
            <span class="badge {{ $color }}">{{ $prototype->status }}</span>
            <span class="text-xs text-base-content/40 font-mono">slug: {{ $prototype->slug }}</span>
        </div>

        @if($prototype->currentVersion)
            @php $v = $prototype->currentVersion; @endphp
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {{-- Preview iframe --}}
                <div class="lg:col-span-2">
                    <x-card title="Preview" shadow>
                        @if($v->preview_url)
                            <div class="aspect-video rounded overflow-hidden border border-base-300">
                                <iframe src="{{ $v->preview_url }}" class="w-full h-full" title="Prototype preview"></iframe>
                            </div>
                            <div class="mt-2 flex gap-2 flex-wrap">
                                <a href="{{ $v->preview_url }}" target="_blank" class="btn btn-sm btn-outline gap-1">
                                    <x-icon name="o-arrow-top-right-on-square" class="w-4 h-4" /> Open
                                </a>
                            </div>
                        @elseif($v->screenshot_path)
                            <img src="{{ Storage::url($v->screenshot_path) }}" alt="Prototype screenshot" class="w-full rounded border border-base-300" />
                        @else
                            <div class="aspect-video bg-base-200 rounded flex items-center justify-center text-base-content/40">
                                @if(in_array($prototype->status, ['generating']))
                                    <div class="text-center">
                                        <span class="loading loading-spinner loading-lg"></span>
                                        <p class="mt-2 text-sm">Generating…</p>
                                    </div>
                                @else
                                    No preview available
                                @endif
                            </div>
                        @endif
                    </x-card>
                </div>

                {{-- Version info --}}
                <div class="space-y-4">
                    <x-card title="Current version" shadow>
                        <dl class="divide-y divide-base-300/60 text-sm">
                            @foreach([
                                'Version'  => 'v'.$v->version,
                                'Status'   => $v->status,
                                'Hash'     => $v->artifact_hash ? substr($v->artifact_hash, 0, 10).'…' : '—',
                            ] as $label => $val)
                                <div class="py-2 flex justify-between gap-2">
                                    <span class="text-base-content/60">{{ $label }}</span>
                                    <span class="font-medium font-mono text-xs">{{ $val }}</span>
                                </div>
                            @endforeach
                        </dl>
                    </x-card>

                    @if($prototype->versions->count() > 1)
                        <x-card title="History" shadow>
                            <ul class="text-sm space-y-2">
                                @foreach($prototype->versions as $ver)
                                    <li class="flex justify-between items-center">
                                        <span class="font-mono">v{{ $ver->version }}</span>
                                        <span class="badge badge-ghost badge-sm">{{ $ver->status }}</span>
                                        <span class="text-base-content/40 text-xs">{{ $ver->created_at->diffForHumans() }}</span>
                                    </li>
                                @endforeach
                            </ul>
                        </x-card>
                    @endif
                </div>
            </div>
        @elseif(in_array($prototype->status, ['generating']))
            <x-card shadow>
                <div class="flex flex-col items-center py-10 gap-3 text-base-content/50">
                    <span class="loading loading-spinner loading-lg"></span>
                    <p>Generation in progress… check back in a moment.</p>
                    <x-button label="Refresh" icon="o-arrow-path" wire:click="$refresh" class="btn-sm btn-ghost" />
                </div>
            </x-card>
        @endif
    @endif
</div>
