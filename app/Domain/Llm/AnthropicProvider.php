<?php

namespace App\Domain\Llm;

use App\Domain\Llm\Concerns\CalculatesCost;
use Illuminate\Support\Facades\Http;

class AnthropicProvider implements LlmProvider
{
    use CalculatesCost;

    private const API_VERSION = '2023-06-01';

    public function __construct(
        protected ?string $apiKey = null,
        protected ?string $base = null,
    ) {
        $this->apiKey ??= (string) config('services.anthropic.key');
        $this->base ??= 'https://api.anthropic.com/v1';
    }

    public function name(): string
    {
        return 'anthropic';
    }

    public function defaultModel(bool $cheap = false): string
    {
        return (string) config(
            $cheap ? 'services.anthropic.model_cheap' : 'services.anthropic.model_default'
        );
    }

    public function complete(string $systemPrompt, string $userPrompt, array $opts = []): LlmResponse
    {
        $model = $opts['model'] ?? $this->defaultModel();
        $maxTokens = (int) ($opts['max_tokens'] ?? 1024);
        $start = microtime(true);

        $payload = Http::withHeaders([
            'x-api-key' => $this->apiKey,
            'anthropic-version' => self::API_VERSION,
            'content-type' => 'application/json',
        ])->timeout(60)->post("{$this->base}/messages", [
            'model' => $model,
            'max_tokens' => $maxTokens,
            'system' => $systemPrompt,
            'messages' => [['role' => 'user', 'content' => $userPrompt]],
        ])->throw()->json();

        $usage = $payload['usage'] ?? [];
        $inputTokens = (int) ($usage['input_tokens'] ?? 0);
        $outputTokens = (int) ($usage['output_tokens'] ?? 0);

        $contentBlock = $payload['content'][0] ?? null;
        $blockType = $contentBlock['type'] ?? null;
        $text = $contentBlock['text'] ?? '';

        if ($blockType !== 'text' || $text === '') {
            $stopReason = $payload['stop_reason'] ?? 'unknown';
            throw new \RuntimeException(
                "Anthropic returned no usable text (block_type={$blockType}, stop_reason={$stopReason}, "
                ."input_tokens={$inputTokens}, output_tokens={$outputTokens})"
            );
        }

        return new LlmResponse(
            text: $text,
            model: $model,
            inputTokens: $inputTokens,
            outputTokens: $outputTokens,
            costCents: $this->calcCostCents('anthropic', $model, $inputTokens, $outputTokens),
            durationMs: (int) ((microtime(true) - $start) * 1000),
            raw: $payload,
        );
    }
}
