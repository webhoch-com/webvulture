<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\RateLimiter;
use Livewire\Livewire;
use Tests\TestCase;

class LoginThrottleTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        RateLimiter::clear('login-email|test@example.com');
        RateLimiter::clear('login-ip|127.0.0.1');
    }

    public function test_login_blocked_after_five_failed_attempts_per_email(): void
    {
        User::create([
            'name' => 'Test',
            'email' => 'test@example.com',
            'password' => bcrypt('correct-password'),
        ]);

        for ($i = 0; $i < 5; $i++) {
            Livewire::test('auth.login')
                ->set('email', 'test@example.com')
                ->set('password', 'wrong-password')
                ->call('login');
        }

        // 6th attempt — even with the CORRECT password — must be throttled
        $component = Livewire::test('auth.login')
            ->set('email', 'test@example.com')
            ->set('password', 'correct-password')
            ->call('login');

        $errors = $component->errors()->get('email');
        $this->assertNotEmpty($errors, 'Expected throttle error on 6th attempt');
        $this->assertStringContainsString('Anmeldeversuche', $errors[0] ?? '');
    }
}
