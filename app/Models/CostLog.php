<?php

namespace App\Models;

use App\Support\Enums\CostProvider;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class CostLog extends Model
{
    protected $guarded = [];

    protected $casts = [
        'meta' => 'array',
        'provider' => CostProvider::class,
    ];

    public function costable(): MorphTo
    {
        return $this->morphTo();
    }
}
