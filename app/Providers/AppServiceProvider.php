<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        $this->configureRateLimiters();
    }

    protected function configureRateLimiters(): void
    {
        RateLimiter::for('discovery', function (Request $request): Limit {
            $key = $request->user()?->id ?? $request->ip();

            return Limit::perMinute(3)->by($key)
                ->response(fn () => response('Zu viele Suchanfragen. Bitte warten Sie eine Minute.', 429));
        });

        // Login: throttle per IP AND per email to defeat distributed brute-force.
        RateLimiter::for('login', function (Request $request): array {
            $email = strtolower((string) $request->input('email', ''));

            return [
                Limit::perMinute(10)->by('login-ip|'.$request->ip()),
                Limit::perMinute(5)->by('login-email|'.$email),
            ];
        });
    }
}
