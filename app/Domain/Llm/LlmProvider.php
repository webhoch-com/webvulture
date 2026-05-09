<?php

namespace App\Domain\Llm;

interface LlmProvider
{
    /**
     * @param  array{model?: string, max_tokens?: int}  $opts
     */
    public function complete(string $systemPrompt, string $userPrompt, array $opts = []): LlmResponse;

    public function name(): string;

    public function defaultModel(bool $cheap = false): string;
}
