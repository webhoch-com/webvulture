<?php

namespace App\Domain\Prototype;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Health probe + simple circuit breaker for the Node generator service.
 *
 * State stored in cache:
 *   wv:generator:health → 'ok'|'fail' (TTL = health_cache_ttl)
 *   wv:generator:failures → int  (rolling 60s window)
 *   wv:generator:circuit_open_until → unix timestamp
 */
class GeneratorHealthProbe
{
    private const KEY_HEALTH = 'wv:generator:health';

    private const KEY_FAILURES = 'wv:generator:failures';

    private const KEY_OPEN_UNTIL = 'wv:generator:circuit_open_until';

    private const KEY_LAST_ERROR = 'wv:generator:last_error';

    public function __construct(
        protected ?string $baseUrl = null,
    ) {
        $this->baseUrl ??= rtrim((string) config('services.generator.url', 'http://localhost:4000'), '/');
    }

    public function isCircuitOpen(): bool
    {
        $openUntil = (int) Cache::get(self::KEY_OPEN_UNTIL, 0);
        if ($openUntil > time()) {
            return true;
        }
        if ($openUntil > 0) {
            Cache::forget(self::KEY_OPEN_UNTIL);
            Cache::forget(self::KEY_FAILURES);
        }

        return false;
    }

    public function isHealthy(): bool
    {
        if ($this->isCircuitOpen()) {
            return false;
        }

        $ttl = (int) config('services.generator.health_cache_ttl', 30);
        $cached = Cache::get(self::KEY_HEALTH);
        if ($cached === 'ok') {
            return true;
        }
        if ($cached === 'fail') {
            return false;
        }

        try {
            $resp = Http::timeout(5)->get("{$this->baseUrl}/health");
            $ok = $resp->successful();
            if (! $ok) {
                Cache::put(self::KEY_LAST_ERROR, "HTTP {$resp->status()} on /health", now()->addSeconds(600));
                Log::error("Generator health probe HTTP {$resp->status()} on /health");
            } else {
                Cache::forget(self::KEY_LAST_ERROR);
            }
        } catch (\Throwable $e) {
            Cache::put(self::KEY_LAST_ERROR, get_class($e).': '.$e->getMessage(), now()->addSeconds(600));
            Log::error("Generator health probe error", ['exception' => get_class($e), 'message' => $e->getMessage()]);
            $ok = false;
        }

        Cache::put(self::KEY_HEALTH, $ok ? 'ok' : 'fail', now()->addSeconds($ttl));

        if (! $ok) {
            $this->recordFailure();
        }

        return $ok;
    }

    public function lastError(): ?string
    {
        $err = Cache::get(self::KEY_LAST_ERROR);
        return is_string($err) ? $err : null;
    }

    public function recordSuccess(): void
    {
        Cache::forget(self::KEY_FAILURES);
    }

    public function recordFailure(): void
    {
        $current = (int) Cache::get(self::KEY_FAILURES, 0);
        $current++;
        Cache::put(self::KEY_FAILURES, $current, now()->addSeconds(60));

        $threshold = (int) config('services.generator.circuit_failure_threshold', 3);
        if ($current >= $threshold) {
            $openSeconds = (int) config('services.generator.circuit_open_seconds', 300);
            Cache::put(self::KEY_OPEN_UNTIL, time() + $openSeconds, now()->addSeconds($openSeconds + 5));
            Log::warning("Generator circuit OPEN for {$openSeconds}s after {$current} failures.");
        }
    }

    public function circuitOpenUntil(): int
    {
        return (int) Cache::get(self::KEY_OPEN_UNTIL, 0);
    }
}
