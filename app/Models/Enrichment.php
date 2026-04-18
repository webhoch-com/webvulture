<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Enrichment extends Model
{
    protected $guarded = [];

    protected $casts = [
        'weaknesses' => 'array',
        'sections' => 'array',
        'cta' => 'array',
    ];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }
}
