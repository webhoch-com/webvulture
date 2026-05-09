<?php

namespace Tests\Unit\Domain\Prototype;

use App\Domain\Prototype\GeneratorHealthProbe;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class GeneratorHealthProbeTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
        config([
            'services.generator.url' => 'http://generator.test:4000',
            'services.generator.health_cache_ttl' => 30,
            'services.generator.circuit_failure_threshold' => 3,
            'services.generator.circuit_open_seconds' => 300,
        ]);
    }

    public function test_healthy_when_endpoint_returns_200(): void
    {
        Http::fake(['http://generator.test:4000/health' => Http::response('ok', 200)]);

        $this->assertTrue((new GeneratorHealthProbe)->isHealthy());
    }

    public function test_unhealthy_when_endpoint_returns_500(): void
    {
        Http::fake(['http://generator.test:4000/health' => Http::response('boom', 500)]);

        $this->assertFalse((new GeneratorHealthProbe)->isHealthy());
    }

    public function test_circuit_opens_after_threshold_failures(): void
    {
        $probe = new GeneratorHealthProbe;
        for ($i = 0; $i < 3; $i++) {
            $probe->recordFailure();
        }

        $this->assertTrue($probe->isCircuitOpen());
        $this->assertFalse($probe->isHealthy());
    }

    public function test_record_success_resets_failure_counter(): void
    {
        $probe = new GeneratorHealthProbe;
        $probe->recordFailure();
        $probe->recordFailure();
        $probe->recordSuccess();
        $probe->recordFailure();

        $this->assertFalse($probe->isCircuitOpen(), 'Circuit should not be open after only one fresh failure');
    }
}
