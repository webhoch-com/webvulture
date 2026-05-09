<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class PrototypeVersion extends Model
{
    protected $guarded = [];

    protected $casts = [
        'site_spec' => 'array',
        'tools_used' => 'array',
    ];

    public function prototype(): BelongsTo
    {
        return $this->belongsTo(Prototype::class);
    }

    public function generationRun(): HasOne
    {
        return $this->hasOne(GenerationRun::class);
    }

    public function costLogs(): MorphMany
    {
        return $this->morphMany(CostLog::class, 'costable');
    }
}
