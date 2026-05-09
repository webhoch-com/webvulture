<?php

namespace Tests\Unit\Domain\Prototype;

use App\Domain\Prototype\GenerationClient;
use App\Domain\Prototype\GeneratorHealthProbe;
use App\Exceptions\GeneratorUnavailableException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class GenerationClientTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
        config([
            'services.generator.url' => 'http://generator.test:4000',
            'services.generator.secret' => 'test-secret',
            'services.generator.health_cache_ttl' => 30,
            'services.generator.circuit_failure_threshold' => 3,
            'services.generator.circuit_open_seconds' => 300,
        ]);
    }

    public function test_generate_throws_when_secret_missing(): void
    {
        config(['services.generator.secret' => '']);

        $this->expectException(GeneratorUnavailableException::class);
        $this->expectExceptionMessage('GENERATOR_SECRET');

        (new GenerationClient(new GeneratorHealthProbe))->generate(1, 'test-slug', []);
    }

    public function test_generate_throws_when_circuit_open(): void
    {
        Cache::put('wv:generator:circuit_open_until', time() + 300);

        $this->expectException(GeneratorUnavailableException::class);
        $this->expectExceptionMessage('circuit is open');

        (new GenerationClient(new GeneratorHealthProbe))->generate(1, 'test-slug', []);
    }

    public function test_generate_records_failure_on_http_error(): void
    {
        Http::fake([
            'http://generator.test:4000/health' => Http::response('ok', 200),
            'http://generator.test:4000/generate' => Http::response('boom', 500),
        ]);

        $probe = new GeneratorHealthProbe;
        $client = new GenerationClient($probe);

        try {
            // Need a valid route() target so the webhook_url helper resolves;
            // we mock all external calls anyway.
            $client->generate(1, 'test-slug', ['data' => 'x']);
            $this->fail('Expected exception');
        } catch (\Throwable $e) {
            // expected
        }

        $this->assertSame(1, (int) Cache::get('wv:generator:failures', 0));
    }
}
