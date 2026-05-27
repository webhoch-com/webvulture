<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PrototypeRevision extends Model
{
    protected $guarded = [];

    public function prototypeVersion(): BelongsTo
    {
        return $this->belongsTo(PrototypeVersion::class);
    }

    public function resultVersion(): BelongsTo
    {
        return $this->belongsTo(PrototypeVersion::class, 'result_version_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
