<?php

namespace App\Livewire\Forms;

use Livewire\Attributes\Validate;
use Livewire\Form;

class SearchForm extends Form
{
    #[Validate(
        rule: 'required|string|min:2|max:120',
        as: 'Stadt',
        message: [
            'required' => 'Stadt ist ein Pflichtfeld.',
            'min' => 'Stadt muss mindestens 2 Zeichen lang sein.',
            'max' => 'Stadt darf maximal 120 Zeichen lang sein.',
        ]
    )]
    public string $city = '';

    #[Validate(
        rule: 'nullable|string|max:120',
        as: 'Stichwort',
        message: ['max' => 'Stichwort darf maximal 120 Zeichen lang sein.']
    )]
    public ?string $keyword = null;

    /**
     * Nullable int — `public int $limit` crashed Livewire mit TypeError sobald
     * der User das Input-Feld leert (wire:model schickt empty-string, kann
     * nicht in int gecastet werden). Mit `?int` und nullable-Validation lebt
     * das Feld solche Edge-Cases sauber durch.
     *
     * Max 60 = Google Places "Text Search (New)" harte Obergrenze pro
     * Query (3 Pagination-Seiten à 20). Höhere Werte würden im Backend
     * silently gekappt.
     */
    #[Validate(
        rule: 'nullable|integer|min:1|max:60',
        as: 'Ergebnis-Limit',
        message: [
            'min' => 'Limit muss mindestens 1 sein.',
            'max' => 'Limit darf maximal 60 sein (Google Places API-Cap).',
        ]
    )]
    public ?int $limit = 20;

    #[Validate('boolean')]
    public bool $only_without_website = false;

    #[Validate(
        rule: 'nullable|numeric|min:0|max:5',
        as: 'Mindestbewertung',
        message: [
            'min' => 'Mindestbewertung muss zwischen 0 und 5 liegen.',
            'max' => 'Mindestbewertung muss zwischen 0 und 5 liegen.',
        ]
    )]
    public ?float $min_rating = null;

    #[Validate(
        rule: 'nullable|integer|min:0',
        as: 'Mindestanzahl Rezensionen',
        message: ['min' => 'Mindestanzahl Rezensionen darf nicht negativ sein.']
    )]
    public ?int $min_reviews = null;
}
