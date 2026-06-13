<?php

namespace App\Jobs;

use App\Domain\Scraping\ScreenshotService;
use App\Events\LeadStatusChanged;
use App\Models\Lead;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class TakeScreenshotsJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 2;

    public array $backoff = [60, 300];

    public int $timeout = 120;

    public function __construct(public int $leadId) {}

    public function handle(ScreenshotService $service): void
    {
        $lead = Lead::findOrFail($this->leadId);
        $analysis = $lead->websiteAnalysis;

        if (! $analysis || ! $lead->website) {
            // Used to silently return — operator + caller (chained from
            // ScrapeSiteJob) saw the job succeed but no screenshots appeared.
            Log::info('TakeScreenshotsJob: skipping (missing analysis or website)', [
                'lead_id' => $this->leadId,
                'has_analysis' => (bool) $analysis,
                'has_website' => (bool) $lead->website,
            ]);

            return;
        }

        if ($analysis->screenshots_taken_at &&
            $analysis->screenshots_taken_at->gt(now()->subDays(7)) &&
            ! empty($analysis->screenshot_paths)) {
            return;
        }

        $url = $analysis->final_url ?? $lead->website;
        $screenshots = $service->capture($lead->id, $url);

        $analysis->update([
            'screenshot_paths' => $screenshots,
            'screenshots_taken_at' => now(),
        ]);

        LeadStatusChanged::dispatch($lead->id, $lead->status->value);
    }

    public function failed(\Throwable $e): void
    {
        $errorId = uniqid('screenshot-fail-', true);
        Log::error("TakeScreenshotsJob failed [{$errorId}] lead={$this->leadId}: {$e->getMessage()}");
    }
}
