<?php

namespace App\Domain\Llm;

use InvalidArgumentException;

class LlmProviderFactory
{
    /** @var array<string, LlmProvider> */
    protected array $instances = [];

    public function make(?string $name = null): LlmProvider
    {
        $name = $name ?: (string) config('services.llm.default', 'anthropic');

        if (isset($this->instances[$name])) {
            return $this->instances[$name];
        }

        return $this->instances[$name] = match ($name) {
            'anthropic' => new AnthropicProvider,
            'openai' => new OpenAiProvider,
            default => throw new InvalidArgumentException("Unknown LLM provider: {$name}"),
        };
    }
}
