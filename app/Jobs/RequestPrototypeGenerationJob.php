<?php

namespace App\Jobs;

use App\Domain\Cost\CostTracker;
use App\Domain\Prototype\GenerationClient;
use App\Domain\Scraping\RebuildPackageBuilder;
use App\Models\GenerationRun;
use App\Models\Lead;
use App\Models\Prototype;
use App\Models\PrototypeVersion;
use App\Support\Enums\CostProvider;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Str;

class RequestPrototypeGenerationJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 2;
    public array $backoff = [30, 120];
    public int $timeout = 30;

    public function __construct(
        public int $leadId,
        public string $templateFamily = 'studio',
    ) {}

    public function handle(
        GenerationClient $client,
        RebuildPackageBuilder $packageBuilder,
        CostTracker $cost,
    ): void {
        $lead = Lead::with(['websiteAnalysis', 'latestEnrichment'])->findOrFail($this->leadId);

        // Create or get prototype row
        $prototype = Prototype::firstOrCreate(
            ['lead_id' => $lead->id],
            [
                'slug' => Str::slug($lead->name).'-'.Str::lower($lead->city).'-'.Str::random(6),
                'template_family' => $this->templateFamily,
                'status' => 'generating',
            ],
        );
        $prototype->update(['status' => 'generating']);

        // New version
        $lastVersion = $prototype->versions()->max('version') ?? 0;
        $version = PrototypeVersion::create([
            'prototype_id' => $prototype->id,
            'version' => $lastVersion + 1,
            'status' => 'queued',
            'rebuild_package_path' => $lead->websiteAnalysis?->rebuild_package_path,
        ]);

        // Generation run record
        $run = GenerationRun::create([
            'prototype_version_id' => $version->id,
            'status' => 'pending',
            'started_at' => now(),
        ]);

        // Build rebuild package (fresh or cached)
        $package = $packageBuilder->build($lead);

        // Dispatch to Node generator (async — webhook callback updates status)
        $version->update(['status' => 'generating']);
        $client->generate($version->id, $package);
    }
}
