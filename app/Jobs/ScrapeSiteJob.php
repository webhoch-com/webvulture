<?php

namespace App\Jobs;

use App\Domain\Scraping\ScraperService;
use App\Models\Lead;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Bus;

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

        if (!$lead->website) {
            return;
        }

        $service->scrape($lead);

        // Chain screenshots → enrich if requested
        if ($this->chainEnrich) {
            Bus::chain([
                new TakeScreenshotsJob($this->leadId),
                new EnrichLeadJob($this->leadId),
            ])->onQueue('enrichment')->dispatch();
        }
    }
}
