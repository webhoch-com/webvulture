<?php

namespace App\Livewire\Forms;

use Livewire\Attributes\Validate;
use Livewire\Form;

class SearchForm extends Form
{
    #[Validate('required|string|min:2|max:120')]
    public string $city = '';

    #[Validate('nullable|string|max:120')]
    public ?string $keyword = null;

    #[Validate('required|integer|min:1|max:20')]
    public int $limit = 10;

    #[Validate('boolean')]
    public bool $only_without_website = false;

    #[Validate('nullable|numeric|min:0|max:5')]
    public ?float $min_rating = null;

    #[Validate('nullable|integer|min:0')]
    public ?int $min_reviews = null;
}
