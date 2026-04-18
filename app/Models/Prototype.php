<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Prototype extends Model
{
    protected $guarded = [];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function versions(): HasMany
    {
        return $this->hasMany(PrototypeVersion::class);
    }

    public function currentVersion(): BelongsTo
    {
        return $this->belongsTo(PrototypeVersion::class, 'current_version_id');
    }

    public function latestVersion(): HasOne
    {
        return $this->hasOne(PrototypeVersion::class)->latestOfMany();
    }
}
