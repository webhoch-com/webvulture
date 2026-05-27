<?php

namespace App\Domain\Settings;

use Illuminate\Support\Facades\Http;
use Throwable;

/**
 * Test-Connection-Helpers für API-Keys. Jeder Test macht 1 günstigen
 * Read-Call zum Provider (kein Schreib-Side-Effect, minimale Tokens)
 * und meldet OK/Error mit Kurz-Begründung.
 *
 * Wird von der /settings UI getriggert und blockt nicht (Test-Buttons
 * laufen synchron mit Loading-Indikator — die Calls sind alle < 2s).
 */
class ConnectionTester
{
    public function __construct(protected SettingsRepository $repo) {}

    public function test(string $service): array
    {
        return match ($service) {
            'anthropic' => $this->testAnthropic(),
            'google_maps' => $this->testGoogleMaps(),
            'openai' => $this->testOpenAi(),
            'generator' => $this->testGenerator(),
            'smtp' => $this->testSmtp(),
            default => $this->fail("Unbekannter Service: {$service}"),
        };
    }

    protected function testAnthropic(): array
    {
        $key = $this->repo->get('services.anthropic', 'api_key');
        if (! $key) {
            return $this->fail('Kein API-Key gesetzt.');
        }

        try {
            $r = Http::withHeaders([
                'x-api-key' => $key,
                'anthropic-version' => '2023-06-01',
                'content-type' => 'application/json',
            ])->timeout(10)->post('https://api.anthropic.com/v1/messages', [
                'model' => 'claude-haiku-4-5-20251001',
                'max_tokens' => 16,
                'messages' => [['role' => 'user', 'content' => 'ping']],
            ]);
            if ($r->successful()) {
                return $this->ok('Anthropic API erreichbar, Key gültig.');
            }

            return $this->fail('HTTP '.$r->status().': '.substr($r->body(), 0, 150));
        } catch (Throwable $e) {
            return $this->fail($e->getMessage());
        }
    }

    protected function testGoogleMaps(): array
    {
        $key = $this->repo->get('services.google_maps', 'api_key');
        if (! $key) {
            return $this->fail('Kein API-Key gesetzt.');
        }
        try {
            $r = Http::withHeaders([
                'X-Goog-Api-Key' => $key,
                'X-Goog-FieldMask' => 'places.id',
            ])->timeout(10)->post('https://places.googleapis.com/v1/places:searchText', [
                'textQuery' => 'Cafe in Wien',
                'pageSize' => 1,
            ]);
            if ($r->successful()) {
                return $this->ok('Google Places erreichbar, Key gültig.');
            }

            return $this->fail('HTTP '.$r->status().': '.substr($r->body(), 0, 150));
        } catch (Throwable $e) {
            return $this->fail($e->getMessage());
        }
    }

    protected function testOpenAi(): array
    {
        $key = $this->repo->get('services.openai', 'api_key');
        if (! $key) {
            return $this->fail('Kein API-Key gesetzt.');
        }
        try {
            $r = Http::withToken($key)->timeout(10)->get('https://api.openai.com/v1/models');
            if ($r->successful()) {
                return $this->ok('OpenAI API erreichbar, Key gültig.');
            }

            return $this->fail('HTTP '.$r->status());
        } catch (Throwable $e) {
            return $this->fail($e->getMessage());
        }
    }

    protected function testGenerator(): array
    {
        $url = $this->repo->get('services.generator', 'url', 'http://127.0.0.1:4000');
        try {
            $r = Http::timeout(5)->get(rtrim($url, '/').'/health');
            if ($r->successful()) {
                return $this->ok("Generator unter {$url} erreichbar.");
            }

            return $this->fail("HTTP {$r->status()} von {$url}/health");
        } catch (Throwable $e) {
            return $this->fail("Verbindung zu {$url}: ".$e->getMessage());
        }
    }

    protected function testSmtp(): array
    {
        try {
            $host = config('mail.mailers.smtp.host');
            $port = (int) config('mail.mailers.smtp.port', 587);
            if (! $host) {
                return $this->fail('Kein SMTP-Host konfiguriert.');
            }
            // Test only that the host/port is reachable (TCP). Echtes
            // SMTP-Handshake würde Mailer-Code reimplementieren.
            $errno = $errstr = null;
            $sock = @fsockopen($host, $port, $errno, $errstr, 5);
            if (! $sock) {
                return $this->fail("TCP-Verbindung {$host}:{$port} fehlgeschlagen: {$errstr}");
            }
            fclose($sock);

            return $this->ok("SMTP-Endpoint {$host}:{$port} erreichbar (TCP).");
        } catch (Throwable $e) {
            return $this->fail($e->getMessage());
        }
    }

    private function ok(string $msg): array
    {
        return ['ok' => true, 'message' => $msg];
    }

    private function fail(string $msg): array
    {
        return ['ok' => false, 'message' => $msg];
    }
}
