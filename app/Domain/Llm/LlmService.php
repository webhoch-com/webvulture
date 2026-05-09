<?php

namespace App\Domain\Llm;

use App\Models\Lead;
use App\Models\PromptLog;
use App\Support\CostGuard;

/**
 * Provider-agnostic LLM access layer.
 * Replaces the legacy ClaudeClient for all new code.
 *
 * Responsibilities:
 *  - Select provider (default Anthropic, configurable Openai)
 *  - Pre-call cost-cap check (daily + per-lead)
 *  - Post-call PromptLog persistence + cost log
 */
class LlmService
{
    public function __construct(
        protected LlmProviderFactory $factory,
        protected CostGuard $costGuard,
    ) {}

    /**
     * @param  array{model?: string, max_tokens?: int, provider?: string, cheap?: bool}  $opts
     */
    public function complete(
        string $systemPrompt,
        string $userPrompt,
        string $purpose,
        ?Lead $lead = null,
        array $opts = [],
    ): LlmResponse {
        $this->costGuard->assertWithinDailyCap();
        if ($lead) {
            $this->costGuard->assertWithinLeadCap($lead->id);
        }

        $provider = $this->factory->make($opts['provider'] ?? null);

        if (! isset($opts['model'])) {
            $opts['model'] = $provider->defaultModel((bool) ($opts['cheap'] ?? false));
        }

        $response = $provider->complete($systemPrompt, $userPrompt, $opts);

        PromptLog::create([
            'lead_id' => $lead?->id,
            'purpose' => $purpose,
            'model' => $response->model,
            'prompt_hash' => hash('sha256', $systemPrompt.$userPrompt),
            'input_tokens' => $response->inputTokens,
            'output_tokens' => $response->outputTokens,
            'cost_cents' => $response->costCents,
            'request' => [
                'provider' => $provider->name(),
                'system_len' => strlen($systemPrompt),
                'user_len' => strlen($userPrompt),
            ],
            'response' => ['length' => strlen($response->text)],
            'duration_ms' => $response->durationMs,
        ]);

        return $response;
    }
}
