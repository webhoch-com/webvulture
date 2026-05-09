<?php

namespace App\Jobs;

use App\Domain\Discovery\MapsDiscoveryService;
use App\Events\LeadStatusChanged;
use App\Exceptions\MapsQuotaExceededException;
use App\Models\SearchRun;
use App\Support\Enums\SearchRunStatus;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable as FoundationQueueable;
use Illuminate\Support\Facades\Log;

class DiscoverLeadsJob implements ShouldQueue
{
    use FoundationQueueable;

    public int $tries = 3;

    public array $backoff = [30, 120, 600];

    public function __construct(public int $searchRunId) {}

    public function handle(MapsDiscoveryService $service): void
    {
        $run = SearchRun::findOrFail($this->searchRunId);

        try {
            $count = $service->run($run);
        } catch (MapsQuotaExceededException $e) {
            Log::warning("Discovery aborted (quota): {$e->getMessage()}");
            $this->fail($e);

            return;
        }

        if ($count > 0) {
            LeadStatusChanged::dispatch(0, 'discovery_completed');
        }
    }

    public function failed(\Throwable $e): void
    {
        $errorId = uniqid('discover-fail-', true);
        Log::error("DiscoverLeadsJob failed [{$errorId}] run={$this->searchRunId}: {$e->getMessage()}");

        SearchRun::find($this->searchRunId)?->update([
            'status' => SearchRunStatus::Failed,
            'error' => substr($e->getMessage(), 0, 1000),
            'finished_at' => now(),
        ]);
    }
}
