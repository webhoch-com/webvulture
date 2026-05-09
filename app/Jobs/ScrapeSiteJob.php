<?php

namespace App\Jobs;

use App\Domain\Scraping\ScraperService;
use App\Events\LeadStatusChanged;
use App\Models\Lead;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Log;

class ScrapeSiteJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;

    public array $backoff = [60, 300];

    public int $timeout = 60;

    public function __construct(
        public int $leadId,
        public bool $chainEnrich = true,
    ) {}

    public function handle(ScraperService $service): void
    {
        $lead = Lead::findOrFail($this->leadId);

        if (! $lead->website) {
            return;
        }

        $service->scrape($lead);
        LeadStatusChanged::dispatch($lead->id, $lead->fresh()->status->value);

        if ($this->chainEnrich) {
            Bus::chain([
                new TakeScreenshotsJob($this->leadId),
                new EnrichLeadJob($this->leadId),
            ])->onQueue('enrichment')->dispatch();
        }
    }

    public function failed(\Throwable $e): void
    {
        $errorId = uniqid('scrape-fail-', true);
        Log::error("ScrapeSiteJob failed [{$errorId}] lead={$this->leadId}: {$e->getMessage()}");
    }
}
