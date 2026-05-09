<?php

namespace App\Support;

use App\Exceptions\CostCapExceededException;
use App\Models\CostLog;
use App\Models\Lead;

class CostGuard
{
    public function assertWithinDailyCap(): void
    {
        $capCents = $this->dailyCapCents();
        if ($capCents <= 0) {
            return;
        }

        $spent = $this->spentTodayCents();
        if ($spent >= $capCents) {
            throw CostCapExceededException::daily($spent, $capCents);
        }
    }

    public function assertWithinLeadCap(int $leadId): void
    {
        $capCents = $this->perLeadCapCents();
        if ($capCents <= 0) {
            return;
        }

        $spent = $this->spentForLeadCents($leadId);
        if ($spent >= $capCents) {
            throw CostCapExceededException::perLead($leadId, $spent, $capCents);
        }
    }

    public function dailyCapCents(): int
    {
        return (int) round(((float) config('services.cost_caps.daily_eur', 0)) * 100);
    }

    public function perLeadCapCents(): int
    {
        return (int) round(((float) config('services.cost_caps.per_lead_eur', 0)) * 100);
    }

    public function spentTodayCents(): int
    {
        return (int) CostLog::query()
            ->whereDate('created_at', today())
            ->sum('cost_cents');
    }

    public function spentForLeadCents(int $leadId): int
    {
        return (int) CostLog::query()
            ->where('costable_type', Lead::class)
            ->where('costable_id', $leadId)
            ->sum('cost_cents');
    }
}
