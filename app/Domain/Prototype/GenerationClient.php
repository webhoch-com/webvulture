<?php

namespace App\Domain\Prototype;

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
        protected ?string $baseUrl = null,
        protected ?string $secret = null,
    ) {
        $this->baseUrl ??= rtrim((string) config('services.generator.url', 'http://localhost:4000'), '/');
        $this->secret ??= (string) config('services.generator.secret', '');
    }

    /**
     * POST /generate — kick off Claude generation + Astro build.
     * Returns immediately with 202 + { job_id }.
     * Node calls back via webhook when done.
     */
    public function generate(int $prototypeVersionId, array $rebuildPackage): string
    {
        $payload = [
            'prototype_version_id' => $prototypeVersionId,
            'rebuild_package' => $rebuildPackage,
            'webhook_url' => route('webhooks.generation.completed'),
        ];

        $response = $this->request()
            ->post("{$this->baseUrl}/generate", $payload)
            ->throw();

        return $response->json('job_id', '');
    }

    /**
     * POST /build — request Astro build of an already-generated project.
     */
    public function build(int $prototypeVersionId, string $astroProjectPath): string
    {
        $payload = [
            'prototype_version_id' => $prototypeVersionId,
            'astro_project_path' => $astroProjectPath,
            'webhook_url' => route('webhooks.build.completed'),
        ];

        $response = $this->request()
            ->post("{$this->baseUrl}/build", $payload)
            ->throw();

        return $response->json('job_id', '');
    }

    public function healthCheck(): bool
    {
        try {
            return $this->request()->get("{$this->baseUrl}/health")->successful();
        } catch (\Throwable $e) {
            Log::warning("Generator health check failed: {$e->getMessage()}");
            return false;
        }
    }

    protected function request(): \Illuminate\Http\Client\PendingRequest
    {
        $timestamp = (string) time();
        return Http::withHeaders([
            'Content-Type' => 'application/json',
            'X-WV-Timestamp' => $timestamp,
            'X-WV-Signature' => $this->sign($timestamp),
        ])->timeout(30)->acceptJson();
    }

    protected function sign(string $timestamp): string
    {
        return hash_hmac('sha256', $timestamp, $this->secret);
    }
}
