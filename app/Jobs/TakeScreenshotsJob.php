<?php

namespace App\Jobs;

use App\Domain\Scraping\ScreenshotService;
use App\Models\Lead;
use App\Models\WebsiteAnalysis;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

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

        if (!$analysis || !$lead->website) {
            return;
        }

        // Skip if fresh screenshots already exist
        if ($analysis->screenshots_taken_at &&
            $analysis->screenshots_taken_at->gt(now()->subDays(7)) &&
            !empty($analysis->screenshot_paths)) {
            return;
        }

        $url = $analysis->final_url ?? $lead->website;
        $screenshots = $service->capture($lead->id, $url);

        $analysis->update([
            'screenshot_paths' => $screenshots,
            'screenshots_taken_at' => now(),
        ]);
    }
}
