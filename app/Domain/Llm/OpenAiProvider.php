<?php

namespace App\Domain\Llm;

use App\Domain\Llm\Concerns\CalculatesCost;
use Illuminate\Support\Facades\Http;

class OpenAiProvider implements LlmProvider
{
    use CalculatesCost;

    public function __construct(
        protected ?string $apiKey = null,
        protected ?string $base = null,
    ) {
        $this->apiKey ??= (string) config('services.openai.key');
        $this->base ??= rtrim((string) config('services.openai.base', 'https://api.openai.com/v1'), '/');
    }

    public function name(): string
    {
        return 'openai';
    }

    public function defaultModel(bool $cheap = false): string
    {
        return (string) config(
            $cheap ? 'services.openai.model_cheap' : 'services.openai.model_default'
        );
    }

    public function complete(string $systemPrompt, string $userPrompt, array $opts = []): LlmResponse
    {
        if ($this->apiKey === '' || str_starts_with($this->apiKey, 'PLACEHOLDER')) {
            throw new \RuntimeException('OpenAI provider selected but OPENAI_API_KEY is not set.');
        }

        $model = $opts['model'] ?? $this->defaultModel();
        $maxTokens = (int) ($opts['max_tokens'] ?? 1024);
        $start = microtime(true);

        $payload = Http::withHeaders([
            'Authorization' => 'Bearer '.$this->apiKey,
            'Content-Type' => 'application/json',
        ])->timeout(60)->post("{$this->base}/chat/completions", [
            'model' => $model,
            'max_tokens' => $maxTokens,
            'messages' => [
                ['role' => 'system', 'content' => $systemPrompt],
                ['role' => 'user', 'content' => $userPrompt],
            ],
        ])->throw()->json();

        $usage = $payload['usage'] ?? [];
        $inputTokens = (int) ($usage['prompt_tokens'] ?? 0);
        $outputTokens = (int) ($usage['completion_tokens'] ?? 0);
        $choice = $payload['choices'][0] ?? null;
        $text = $choice['message']['content'] ?? '';
        $finishReason = $choice['finish_reason'] ?? 'unknown';

        if ($text === '' || $text === null) {
            throw new \RuntimeException(
                "OpenAI returned empty content (finish_reason={$finishReason}, "
                ."prompt_tokens={$inputTokens}, completion_tokens={$outputTokens})"
            );
        }

        return new LlmResponse(
            text: $text,
            model: $model,
            inputTokens: $inputTokens,
            outputTokens: $outputTokens,
            costCents: $this->calcCostCents('openai', $model, $inputTokens, $outputTokens),
            durationMs: (int) ((microtime(true) - $start) * 1000),
            raw: $payload,
        );
    }
}
