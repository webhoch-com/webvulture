<?php

namespace App\Models;

use App\Support\Enums\LeadStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class Lead extends Model
{
    protected $guarded = [];

    protected $casts = [
        'meta' => 'array',
        'has_website' => 'bool',
        'status' => LeadStatus::class,
        'rating' => 'decimal:1',
    ];

    public function searchRun(): BelongsTo
    {
        return $this->belongsTo(SearchRun::class);
    }

    public function tags(): HasMany
    {
        return $this->hasMany(LeadTag::class);
    }

    public function costLogs(): MorphMany
    {
        return $this->morphMany(CostLog::class, 'costable');
    }
}
