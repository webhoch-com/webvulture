<?php

namespace App\Jobs;

use App\Domain\Enrichment\EnrichmentService;
use App\Events\LeadStatusChanged;
use App\Models\Lead;
use App\Support\Enums\LeadStatus;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

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

    public function failed(\Throwable $e): void
    {
        $errorId = uniqid('enrich-fail-', true);
        Log::error("EnrichLeadJob failed [{$errorId}] lead={$this->leadId}", [
            'exception_class' => get_class($e),
            'message' => $e->getMessage(),
            'file' => $e->getFile().':'.$e->getLine(),
        ]);

        $lead = Lead::find($this->leadId);
        if (! $lead) {
            return;
        }

        // Distinguish business-logic rejection (Claude said "no good lead") from
        // transient/infrastructure failure (rate limit, parse error, cost cap).
        // Only Rejected on genuine business-logic outcomes; otherwise revert
        // to previous state so user can retry manually.
        $message = $e->getMessage();
        $isBusinessRejection =
            $e instanceof \App\Exceptions\LeadRejectedByLlmException
            || str_contains($message, 'Lead rejected')
            || str_contains($message, 'not relevant');

        if ($isBusinessRejection) {
            $lead->update(['status' => LeadStatus::Rejected]);
            LeadStatusChanged::dispatch($lead->id, LeadStatus::Rejected->value);
        } else {
            // Transient — keep previous status so the user can retry from the lead page.
            // Store the error reason in meta for visibility.
            $meta = $lead->meta ?? [];
            $meta['last_enrich_error'] = [
                'id' => $errorId,
                'class' => get_class($e),
                'message' => substr($message, 0, 500),
                'at' => now()->toIso8601String(),
            ];
            $lead->update(['meta' => $meta]);
        }
    }
}
