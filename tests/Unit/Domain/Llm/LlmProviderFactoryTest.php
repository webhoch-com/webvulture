<?php

namespace Tests\Unit\Domain\Llm;

use App\Domain\Llm\AnthropicProvider;
use App\Domain\Llm\LlmProviderFactory;
use App\Domain\Llm\OpenAiProvider;
use Tests\TestCase;

class LlmProviderFactoryTest extends TestCase
{
    public function test_factory_returns_anthropic_by_default(): void
    {
        config(['services.llm.default' => 'anthropic']);
        $provider = (new LlmProviderFactory)->make();
        $this->assertInstanceOf(AnthropicProvider::class, $provider);
        $this->assertSame('anthropic', $provider->name());
    }

    public function test_factory_returns_openai_when_configured(): void
    {
        config(['services.llm.default' => 'openai']);
        $provider = (new LlmProviderFactory)->make();
        $this->assertInstanceOf(OpenAiProvider::class, $provider);
        $this->assertSame('openai', $provider->name());
    }

    public function test_factory_caches_instance(): void
    {
        $factory = new LlmProviderFactory;
        $a = $factory->make('anthropic');
        $b = $factory->make('anthropic');
        $this->assertSame($a, $b);
    }

    public function test_factory_throws_on_unknown_provider(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        (new LlmProviderFactory)->make('llama-local');
    }
}
