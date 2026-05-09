<?php

namespace App\Domain\Prototype;

use App\Exceptions\GeneratorUnavailableException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Laravel-side HTTP client to the Node generator service.
 * Node service runs at GENERATOR_URL (default http://localhost:4000).
 * Auth: HMAC-SHA256 signed header X-WV-Signature.
 */
class GenerationClient
{
    public function __construct(
        protected GeneratorHealthProbe $probe,
        protected ?string $baseUrl = null,
        protected ?string $secret = null,
    ) {
        $this->baseUrl ??= rtrim((string) config('services.generator.url', 'http://localhost:4000'), '/');
        $this->secret ??= (string) config('services.generator.secret', '');
    }

    public function generate(int $prototypeVersionId, string $slug, array $rebuildPackage): string
    {
        $this->guard();

        $payload = [
            'prototype_version_id' => $prototypeVersionId,
            'slug' => $slug,
            'rebuild_package' => $rebuildPackage,
            'webhook_url' => route('webhooks.generation.completed'),
        ];

        return $this->dispatch('/generate', $payload);
    }

    public function build(int $prototypeVersionId, string $slug, string $astroProjectPath): string
    {
        $this->guard();

        $payload = [
            'prototype_version_id' => $prototypeVersionId,
            'slug' => $slug,
            'astro_project_path' => $astroProjectPath,
            'webhook_url' => route('webhooks.build.completed'),
        ];

        return $this->dispatch('/build', $payload);
    }

    public function healthCheck(): bool
    {
        return $this->probe->isHealthy();
    }

    protected function guard(): void
    {
        if ($this->secret === '') {
            throw new GeneratorUnavailableException('GENERATOR_SECRET is not configured.');
        }

        if (! $this->probe->isHealthy()) {
            throw new GeneratorUnavailableException(
                $this->probe->isCircuitOpen()
                    ? 'Generator circuit is open; refusing to call until '.date('H:i:s', $this->probe->circuitOpenUntil()).'.'
                    : 'Generator service is currently unhealthy.'
            );
        }
    }

    protected function dispatch(string $path, array $payload): string
    {
        $timestamp = (string) time();
        $body = json_encode($payload, JSON_UNESCAPED_SLASHES);
        $signature = hash_hmac('sha256', $timestamp.'.'.$body, $this->secret);

        try {
            $response = Http::withHeaders([
                'Content-Type' => 'application/json',
                'X-WV-Timestamp' => $timestamp,
                'X-WV-Signature' => $signature,
            ])
                ->timeout(30)
                ->acceptJson()
                ->withBody($body, 'application/json')
                ->post("{$this->baseUrl}{$path}")
                ->throw();

            $this->probe->recordSuccess();

            return (string) $response->json('job_id', '');
        } catch (ConnectionException|RequestException $e) {
            // Only network/HTTP errors should open the circuit.
            // Programming bugs (TypeError, JsonException) propagate without poisoning the breaker.
            $this->probe->recordFailure();
            Log::error("Generator call to {$path} failed: {$e->getMessage()}");
            throw $e;
        }
    }
}
