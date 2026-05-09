<?php

namespace App\Jobs;

use App\Domain\Outreach\InboundMailScanner;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

/**
 * Periodically polls the configured IMAP mailbox for replies to outreach messages.
 *
 * Scheduled in routes/console.php (every 15 min). Skips silently when IMAP_HOST
 * is not configured, so dev environments don't break. On IMAP outage, the job
 * re-throws so Laravel marks it failed (visible in failed_jobs table) — this
 * surfaces sustained outages instead of silently missing replies for hours.
 */
class ScanInboundRepliesJob implements ShouldQueue
{
    use Queueable;

    public int $timeout = 120;

    public int $tries = 3;

    public array $backoff = [60, 300, 900];

    public function handle(InboundMailScanner $scanner): void
    {
        $errorId = uniqid('imap-scan-', true);
        try {
            $result = $scanner->scan();
            if (! empty($result['error'])) {
                Log::warning("ScanInboundRepliesJob [{$errorId}]: ".json_encode($result));
            }
        } catch (\Throwable $e) {
            Log::error("ScanInboundRepliesJob failed [{$errorId}]", [
                'exception_class' => get_class($e),
                'message' => $e->getMessage(),
            ]);
            // Re-throw so Laravel marks the job failed and retries with backoff.
            // After 3 tries, it lands in failed_jobs and surfaces in horizon/cli.
            throw $e;
        }
    }
}
