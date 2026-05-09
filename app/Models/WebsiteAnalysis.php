<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WebsiteAnalysis extends Model
{
    // Defensively guard `id` even though this model is only persisted by trusted
    // job code today. If a future controller starts feeding `$request-&gt;all()`,
    // mass assignment of `id` would clobber FKs/relationships.
    protected $guarded = ['id'];

    protected $casts = [
        'contact' => 'array',
        'services' => 'array',
        'images' => 'array',
        'hero_images' => 'array',
        'gallery_images' => 'array',
        'downloaded_assets' => 'array',
        'socials' => 'array',
        'brand_colors' => 'array',
        'font_imports' => 'array',
        'screenshot_paths' => 'array',
        'sections' => 'array',
        'crawled_at' => 'datetime',
        'screenshots_taken_at' => 'datetime',
    ];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }
}
