<?php

namespace App\Http\Controllers\Webhooks;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

trait VerifiesGeneratorSignature
{
    protected function verifySignature(Request $request): bool
    {
        $secret = (string) config('services.generator.secret', '');
        if ($secret === '') {
            return false;
        }

        $timestamp = (string) $request->header('X-WV-Timestamp', '');
        $sig = (string) $request->header('X-WV-Signature', '');

        if ($timestamp === '' || $sig === '' || ! ctype_digit($timestamp)) {
            return false;
        }

        $maxAge = (int) config('services.generator.webhook_max_age', 300);
        $age = abs(time() - (int) $timestamp);
        if ($age > $maxAge) {
            return false;
        }

        // Body-signing: signature MUST cover both timestamp AND raw body.
        $body = $request->getContent();
        $expected = hash_hmac('sha256', $timestamp.'.'.$body, $secret);

        if (! hash_equals($expected, $sig)) {
            return false;
        }

        // Replay protection: nonce = sha256(sig); reject if seen recently.
        // Fail-closed on cache errors: if we can't establish uniqueness, reject.
        $nonceKey = 'webhook-nonce:'.hash('sha256', $sig);
        try {
            if (! Cache::add($nonceKey, true, $maxAge + 30)) {
                return false;
            }
        } catch (\Throwable $e) {
            $errorId = uniqid('nonce-cache-', true);
            Log::error("Webhook nonce-cache unavailable [{$errorId}], rejecting request: {$e->getMessage()}");

            return false;
        }

        return true;
    }
}
