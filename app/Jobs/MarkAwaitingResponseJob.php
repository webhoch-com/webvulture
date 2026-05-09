<?php

namespace App\Jobs;

use App\Models\Lead;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Marks every lead as "awaiting response" if its last outreach is older than the
 * configured threshold (default: 7 days) and no reply has been recorded.
 *
 * `awaiting_response_since` becomes the visible flag in the UI; when it lands,
 * the user sees a yellow badge and can trigger a follow-up email with one click.
 *
 * Schedule daily in app/Console/Kernel.php.
 */
class MarkAwaitingResponseJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(public int $thresholdDays = 7) {}

    public function handle(): void
    {
        $cutoff = now()->subDays($this->thresholdDays);

        $count = Lead::query()
            ->whereNotNull('last_outreach_at')
            ->where('last_outreach_at', '<=', $cutoff)
            ->whereNull('replied_at')
            ->whereNull('awaiting_response_since')
            ->update(['awaiting_response_since' => now()]);

        if ($count > 0) {
            Log::info("MarkAwaitingResponseJob: flagged {$count} leads as awaiting response");
        }
    }
}
