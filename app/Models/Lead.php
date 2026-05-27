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
        'approved_at' => 'datetime',
    ];

    public function searchRun(): BelongsTo
    {
        return $this->belongsTo(SearchRun::class);
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function activityLogs(): MorphMany
    {
        return $this->morphMany(ActivityLog::class, 'subject')->latest('id');
    }

    public function isApproved(): bool
    {
        return $this->approved_at !== null;
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

    /**
     * Aggregate cost across all morphable types associated with this lead.
     * SearchRun cost is shared evenly across the leads it produced.
     */
    public function totalCostCents(): int
    {
        $leadCost = (int) $this->costLogs()->sum('cost_cents');

        $versionIds = PrototypeVersion::whereIn(
            'prototype_id',
            Prototype::where('lead_id', $this->id)->select('id'),
        )->pluck('id');

        $prototypeCost = (int) CostLog::where('costable_type', PrototypeVersion::class)
            ->whereIn('costable_id', $versionIds)
            ->sum('cost_cents');

        $searchRunCost = 0;
        if ($this->search_run_id) {
            $runTotal = (int) CostLog::where('costable_type', SearchRun::class)
                ->where('costable_id', $this->search_run_id)
                ->sum('cost_cents');
            $shareCount = (int) Lead::where('search_run_id', $this->search_run_id)->count();
            if ($shareCount > 0 && $runTotal > 0) {
                // Even share + deterministic remainder distribution to first N leads (by id ASC).
                // Eliminates the penny-loss between Dashboard breakdown (full sum) and per-lead totals.
                $base = intdiv($runTotal, $shareCount);
                $remainder = $runTotal - $base * $shareCount;
                $myRank = (int) Lead::where('search_run_id', $this->search_run_id)
                    ->where('id', '<=', $this->id)
                    ->count();
                $searchRunCost = $base + ($myRank <= $remainder ? 1 : 0);
            }
        }

        return $leadCost + $prototypeCost + $searchRunCost;
    }
}
