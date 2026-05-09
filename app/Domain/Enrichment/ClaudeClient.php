<?php

namespace App\Domain\Enrichment;

use App\Domain\Llm\LlmService;
use App\Models\Lead;

/**
 * Backwards-compatibility shim.
 * New code should depend on \App\Domain\Llm\LlmService directly.
 */
class ClaudeClient
{
    public function __construct(
        protected LlmService $llm,
    ) {}

    public function complete(
        string $systemPrompt,
        string $userPrompt,
        string $purpose,
        ?Lead $lead = null,
        ?string $model = null,
        int $maxTokens = 1024,
    ): array {
        $opts = ['max_tokens' => $maxTokens, 'provider' => 'anthropic'];
        if ($model !== null) {
            $opts['model'] = $model;
        }

        $response = $this->llm->complete($systemPrompt, $userPrompt, $purpose, $lead, $opts);

        return [
            'text' => $response->text,
            'input_tokens' => $response->inputTokens,
            'output_tokens' => $response->outputTokens,
            'cost_cents' => $response->costCents,
            'model' => $response->model,
        ];
    }
}
