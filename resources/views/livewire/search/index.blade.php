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

<div class="max-w-3xl mx-auto space-y-6">
    <x-header title="Discover leads" subtitle="Google Places text search" separator />

    <x-form wire:submit="submit">
        <x-card shadow>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <x-input label="City" icon="o-map-pin" wire:model="form.city" placeholder="Berlin" required />
                <x-input label="Keyword / niche" icon="o-tag" wire:model="form.keyword" placeholder="dentist" />
                <x-input label="Result limit" type="number" min="1" max="20" wire:model="form.limit" icon="o-hashtag" />
                <x-input label="Min rating" type="number" step="0.1" min="0" max="5" wire:model="form.min_rating" icon="o-star" />
                <x-input label="Min reviews" type="number" min="0" wire:model="form.min_reviews" icon="o-chat-bubble-left-right" />
                <x-toggle label="Only without website" wire:model="form.only_without_website" hint="Target redesign candidates" />
            </div>

            <x-slot:actions>
                <x-button label="Reset" type="button" @click="$wire.form.reset()" class="btn-ghost" />
                <x-button label="Run search" icon="o-magnifying-glass" type="submit" class="btn-primary" spinner="submit" />
            </x-slot:actions>
        </x-card>
    </x-form>
</div>
