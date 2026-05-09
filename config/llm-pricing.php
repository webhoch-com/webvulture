<?php

/**
 * Per-million-token pricing in cents.
 * Source-of-truth for cost calculation across LLM providers.
 * Update when providers change pricing.
 */
return [

    'anthropic' => [
        'claude-haiku-4-5-20251001' => ['input' => 80, 'output' => 400],
        'claude-haiku-4-5' => ['input' => 80, 'output' => 400],
        'claude-sonnet-4-6' => ['input' => 300, 'output' => 1500],
        'claude-opus-4-7' => ['input' => 1500, 'output' => 7500],
    ],

    'openai' => [
        'gpt-4o' => ['input' => 250, 'output' => 1000],
        'gpt-4o-mini' => ['input' => 15, 'output' => 60],
        'gpt-4.1' => ['input' => 200, 'output' => 800],
    ],

    'fallback' => ['input' => 300, 'output' => 1500],
];
