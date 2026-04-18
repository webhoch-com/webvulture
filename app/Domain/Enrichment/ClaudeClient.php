<?php

namespace App\Domain\Enrichment;

use App\Models\Lead;
use App\Models\PromptLog;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ClaudeClient
{
    private const API_BASE = 'https://api.anthropic.com/v1';
    private const ANTHROPIC_VERSION = '2023-06-01';

    // Pricing per million tokens (cents)
    private const PRICING = [
        'claude-haiku-4-5-20251001' => ['input' => 80, 'output' => 400],
        'claude-sonnet-4-6' => ['input' => 300, 'output' => 1500],
    ];

    public function __construct(
        protected ?string $apiKey = null,
        protected ?string $defaultModel = null,
    ) {
        $this->apiKey ??= (string) config('services.anthropic.key');
        $this->defaultModel ??= (string) config('services.anthropic.model_default', 'claude-sonnet-4-6');
    }

    public function complete(
        string $systemPrompt,
        string $userPrompt,
        string $purpose,
        ?Lead $lead = null,
        ?string $model = null,
        int $maxTokens = 1024,
    ): array {
        $model ??= $this->defaultModel;
        $start = microtime(true);

        $response = Http::withHeaders([
            'x-api-key' => $this->apiKey,
            'anthropic-version' => self::ANTHROPIC_VERSION,
            'content-type' => 'application/json',
        ])->timeout(60)->post(self::API_BASE.'/messages', [
            'model' => $model,
            'max_tokens' => $maxTokens,
            'system' => $systemPrompt,
            'messages' => [['role' => 'user', 'content' => $userPrompt]],
        ])->throw()->json();

        $ms = (int) ((microtime(true) - $start) * 1000);
        $usage = $response['usage'] ?? [];
        $inputTokens = $usage['input_tokens'] ?? 0;
        $outputTokens = $usage['output_tokens'] ?? 0;
        $costCents = $this->calcCost($model, $inputTokens, $outputTokens);
        $text = $response['content'][0]['text'] ?? '';

        PromptLog::create([
            'lead_id' => $lead?->id,
            'purpose' => $purpose,
            'model' => $model,
            'prompt_hash' => hash('sha256', $systemPrompt.$userPrompt),
            'input_tokens' => $inputTokens,
            'output_tokens' => $outputTokens,
            'cost_cents' => $costCents,
            'request' => ['system_len' => strlen($systemPrompt), 'user_len' => strlen($userPrompt)],
            'response' => ['length' => strlen($text)],
            'duration_ms' => $ms,
        ]);

        return ['text' => $text, 'input_tokens' => $inputTokens, 'output_tokens' => $outputTokens, 'cost_cents' => $costCents, 'model' => $model];
    }

    protected function calcCost(string $model, int $inputTokens, int $outputTokens): int
    {
        $pricing = self::PRICING[$model] ?? self::PRICING['claude-sonnet-4-6'];
        return (int) round(
            ($inputTokens / 1_000_000) * $pricing['input'] +
            ($outputTokens / 1_000_000) * $pricing['output']
        );
    }
}
