<?php

use App\Models\Lead;
use App\Models\SearchRun;
use App\Models\CostLog;
use Livewire\Volt\Component;

new class extends Component {
    public function with(): array
    {
        return [
            'leadsTotal' => Lead::count(),
            'leadsNoSite' => Lead::where('has_website', false)->count(),
            'runsToday' => SearchRun::whereDate('created_at', today())->count(),
            'costToday' => CostLog::whereDate('created_at', today())->sum('cost_cents'),
            'recentRuns' => SearchRun::latest()->limit(5)->get(),
        ];
    }
}; ?>

<div class="space-y-6">
    <x-header title="Dashboard" subtitle="WebVulture control plane" separator />

    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <x-stat title="Leads total" :value="$leadsTotal" icon="o-users" color="text-primary" />
        <x-stat title="No website" :value="$leadsNoSite" icon="o-globe-alt" color="text-accent" />
        <x-stat title="Runs today" :value="$runsToday" icon="o-bolt" color="text-info" />
        <x-stat title="Cost today" :value="'$'.number_format($costToday / 100, 2)" icon="o-banknotes" color="text-success" />
    </div>

    <x-card title="Recent search runs" shadow separator>
        @if ($recentRuns->isEmpty())
            <div class="text-base-content/60 text-sm">No runs yet. <a href="{{ route('search') }}" class="link link-primary">Start a search →</a></div>
        @else
            <ul class="divide-y divide-base-300/60">
                @foreach ($recentRuns as $run)
                    <li class="py-3 flex items-center justify-between text-sm">
                        <div>
                            <div class="font-medium">{{ $run->city }} · {{ $run->keyword ?: 'any' }}</div>
                            <div class="text-base-content/60">{{ $run->created_at->diffForHumans() }}</div>
                        </div>
                        <div class="flex items-center gap-3">
                            <span class="font-mono text-xs">{{ $run->leads_count }} leads</span>
                            <span class="font-mono text-xs text-base-content/60">${{ number_format($run->cost_cents / 100, 2) }}</span>
                            <x-badge :value="$run->status?->value ?? 'queued'" class="{{ $run->status?->badgeClass() ?? 'badge-ghost' }} badge-sm" />
                        </div>
                    </li>
                @endforeach
            </ul>
        @endif
    </x-card>
</div>
