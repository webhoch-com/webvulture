<?php

namespace App\Domain\Cost;

use App\Models\CostLog;
use App\Support\Enums\CostProvider;
use Illuminate\Database\Eloquent\Model;

class CostTracker
{
    public function record(Model $subject, CostProvider $provider, int $units, int $costCents, array $meta = []): CostLog
    {
        return $subject->morphMany(CostLog::class, 'costable')->create([
            'provider' => $provider,
            'units' => $units,
            'cost_cents' => $costCents,
            'meta' => $meta,
        ]);
    }
}
