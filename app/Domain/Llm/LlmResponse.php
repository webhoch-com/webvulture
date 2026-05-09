<?php

namespace App\Domain\Llm;

class LlmResponse
{
    public function __construct(
        public readonly string $text,
        public readonly string $model,
        public readonly int $inputTokens,
        public readonly int $outputTokens,
        public readonly int $costCents,
        public readonly int $durationMs,
        public readonly array $raw = [],
    ) {}

    public function toArray(): array
    {
        return [
            'text' => $this->text,
            'model' => $this->model,
            'input_tokens' => $this->inputTokens,
            'output_tokens' => $this->outputTokens,
            'cost_cents' => $this->costCents,
            'duration_ms' => $this->durationMs,
        ];
    }
}
