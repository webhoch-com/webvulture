<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WebsiteAnalysis extends Model
{
    protected $guarded = [];

    protected $casts = [
        'contact' => 'array',
        'services' => 'array',
        'images' => 'array',
        'socials' => 'array',
        'brand_colors' => 'array',
        'screenshot_paths' => 'array',
        'crawled_at' => 'datetime',
        'screenshots_taken_at' => 'datetime',
    ];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }
}
