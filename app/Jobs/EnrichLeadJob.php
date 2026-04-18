<?php

namespace App\Jobs;

use App\Domain\Enrichment\EnrichmentService;
use App\Models\Lead;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;

class EnrichLeadJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 2;
    public array $backoff = [30, 120];
    public int $timeout = 90;

    public function __construct(public int $leadId) {}

    public function handle(EnrichmentService $service): void
    {
        $lead = Lead::with(['websiteAnalysis'])->findOrFail($this->leadId);
        $service->enrich($lead);
    }
}
