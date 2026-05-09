<?php

namespace App\Models;

use App\Jobs\CleanupLeadStorageJob;
use App\Support\Enums\LeadStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class Lead extends Model
{
    protected $guarded = ['id'];

    protected static function booted(): void
    {
        static::deleting(function (Lead $lead) {
            $versionIds = $lead->prototypes()
                ->with('versions:id,prototype_id')
                ->get()
                ->flatMap(fn ($p) => $p->versions->pluck('id'))
                ->all();

            CleanupLeadStorageJob::dispatch($lead->id, $versionIds)->afterCommit();
        });
    }

    protected $casts = [
        'meta' => 'array',
        'has_website' => 'bool',
        'status' => LeadStatus::class,
        'rating' => 'decimal:1',
        'website_stars' => 'decimal:1',
        'last_outreach_at' => 'datetime',
        'awaiting_response_since' => 'datetime',
        'replied_at' => 'datetime',
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

    public function websiteAnalysis(): HasOne
    {
        return $this->hasOne(WebsiteAnalysis::class);
    }

    public function enrichments(): HasMany
    {
        return $this->hasMany(Enrichment::class);
    }

    public function latestEnrichment(): HasOne
    {
        return $this->hasOne(Enrichment::class)->latestOfMany();
    }

    public function scrapeJobs(): HasMany
    {
        return $this->hasMany(ScrapeJob::class);
    }

    public function promptLogs(): HasMany
    {
        return $this->hasMany(PromptLog::class);
    }

    public function prototypes(): HasMany
    {
        return $this->hasMany(Prototype::class);
    }

    public function latestPrototype(): HasOne
    {
        return $this->hasOne(Prototype::class)->latestOfMany();
    }
}
