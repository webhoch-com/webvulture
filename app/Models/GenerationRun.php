<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GenerationRun extends Model
{
    protected $guarded = [];

    protected $casts = [
        'tools_used' => 'array',
        'started_at' => 'datetime',
        'finished_at' => 'datetime',
    ];

    public function prototypeVersion(): BelongsTo
    {
        return $this->belongsTo(PrototypeVersion::class);
    }
}
