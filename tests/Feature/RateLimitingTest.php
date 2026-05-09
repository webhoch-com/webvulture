<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

class RateLimitingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        RateLimiter::clear('discovery');
    }

    public function test_search_route_is_rate_limited(): void
    {
        $user = User::create([
            'name' => 'Hunter',
            'email' => 'hunter@test.local',
            'password' => bcrypt('secret'),
        ]);

        // 3 per minute is the configured limit; 4th must 429
        for ($i = 0; $i < 3; $i++) {
            $this->actingAs($user)->get('/search')->assertOk();
        }

        $this->actingAs($user)->get('/search')->assertStatus(429);
    }
}
