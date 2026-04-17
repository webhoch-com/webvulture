<?php

namespace App\Models;

use App\Support\Enums\SearchRunStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class SearchRun extends Model
{
    protected $guarded = [];

    protected $casts = [
        'filters' => 'array',
        'status' => SearchRunStatus::class,
        'started_at' => 'datetime',
        'finished_at' => 'datetime',
    ];

    public function leads(): HasMany
    {
        return $this->hasMany(Lead::class);
    }

    public function costLogs(): MorphMany
    {
        return $this->morphMany(CostLog::class, 'costable');
    }
}
