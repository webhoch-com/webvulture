<?php

namespace App\Domain\Llm\Concerns;

trait CalculatesCost
{
    /**
     * Returns cost in EUR cents (project storage unit). Anthropic + OpenAI
     * publish per-million-token rates in USD; we apply a static USD→EUR rate
     * from `services.cost_caps.usd_to_eur` so cap labels, dashboard KPIs and
     * cost_logs all live in EUR. Rate is intentionally static — fetching live
     * FX would drift the audit trail.
     */
    protected function calcCostCents(string $providerKey, string $model, int $inputTokens, int $outputTokens): int
    {
        $pricing = config("llm-pricing.{$providerKey}.{$model}")
            ?? config('llm-pricing.fallback');

        $usdCents = ($inputTokens / 1_000_000) * $pricing['input']
            + ($outputTokens / 1_000_000) * $pricing['output'];

        $rate = (float) config('services.cost_caps.usd_to_eur', 0.93);

        return (int) round($usdCents * $rate);
    }
}
