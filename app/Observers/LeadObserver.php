<?php

namespace App\Observers;

use App\Domain\Activity\ActivityLogger;
use App\Models\Lead;

/**
 * Auto-Audit-Trail für Lead-Status-Changes. Sobald irgendein Job/Service
 * `$lead->update(['status' => ...])` macht, landet das automatisch im
 * activity_log — ohne dass jeder Caller das selber aufrufen muss.
 *
 * Manuelle Actions (approve, mark_irrelevant) loggen zusätzlich eine
 * eigene action mit Description direkt am Callsite — die sind explizit
 * (User-Intent), der Observer ergänzt nur den generischen status-change.
 */
class LeadObserver
{
    public function __construct(protected ActivityLogger $logger) {}

    public function updated(Lead $lead): void
    {
        if (! $lead->wasChanged('status')) {
            return;
        }

        $from = $lead->getOriginal('status');
        $to = $lead->status?->value ?? null;
        if ($from === $to) {
            return;
        }

        $fromValue = $from instanceof \BackedEnum ? $from->value : (string) $from;

        $this->logger->log(
            $lead,
            'lead.status_changed',
            "Status: {$fromValue} → {$to}",
            ['from' => $fromValue, 'to' => $to],
        );
    }
}
