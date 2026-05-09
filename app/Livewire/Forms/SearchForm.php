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

    #[Validate(
        rule: 'required|integer|min:1|max:20',
        as: 'Ergebnis-Limit',
        message: [
            'required' => 'Ergebnis-Limit ist erforderlich.',
            'min' => 'Limit muss mindestens 1 sein.',
            'max' => 'Limit darf maximal 20 sein.',
        ]
    )]
    public int $limit = 10;

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
