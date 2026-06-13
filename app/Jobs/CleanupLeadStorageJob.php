<?php

namespace App\Jobs;

use App\Domain\Storage\LeadStorageService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class CleanupLeadStorageJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $timeout = 120;

    public array $backoff = [10, 30, 120];

    public function __construct(
        public int $leadId,
        public array $prototypeVersionIds = [],
    ) {}

    public function handle(LeadStorageService $storage): void
    {
        // Lock TTL must outlive the worst-case job duration (timeout + buffer)
        $lock = Cache::lock("lead-cleanup-{$this->leadId}", $this->timeout + 30);

        if (! $lock->get()) {
            Log::info("CleanupLeadStorageJob: lock busy for lead {$this->leadId}, releasing back to queue.");
            $this->release(20);

            return;
        }

        try {
            $storage->deleteAll($this->leadId);

            if ($this->prototypeVersionIds !== []) {
                $storage->deletePrototypeFiles($this->prototypeVersionIds);
            }

            $count = count($this->prototypeVersionIds);
            Log::info("CleanupLeadStorageJob: cleaned lead {$this->leadId} ({$count} prototype versions).", [
                'count' => $count,
            ]);
        } finally {
            $lock->release();
        }
    }
}
