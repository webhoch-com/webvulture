<?php

namespace App\Jobs;

use App\Domain\Discovery\MapsDiscoveryService;
use App\Models\SearchRun;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable as FoundationQueueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class DiscoverLeadsJob implements ShouldQueue
{
    use FoundationQueueable;

    public int $tries = 3;
    public array $backoff = [30, 120, 600];

    public function __construct(public int $searchRunId) {}

    public function handle(MapsDiscoveryService $service): void
    {
        $run = SearchRun::findOrFail($this->searchRunId);
        $service->run($run);
    }
}
