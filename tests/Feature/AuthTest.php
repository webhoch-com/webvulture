<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_unauthenticated_user_is_redirected_from_dashboard(): void
    {
        $this->get('/')->assertRedirect(route('login'));
    }

    public function test_unauthenticated_user_is_redirected_from_leads(): void
    {
        $this->get('/leads')->assertRedirect(route('login'));
    }

    public function test_login_page_loads_for_guests(): void
    {
        $this->get('/login')->assertOk();
    }

    public function test_authenticated_user_can_access_dashboard(): void
    {
        $user = User::create([
            'name' => 'Admin',
            'email' => 'admin@test.local',
            'password' => bcrypt('secret'),
        ]);

        $this->actingAs($user)->get('/')->assertOk();
    }

    public function test_logout_terminates_session(): void
    {
        $user = User::create([
            'name' => 'Admin',
            'email' => 'admin@test.local',
            'password' => bcrypt('secret'),
        ]);

        $this->actingAs($user)
            ->post('/logout')
            ->assertRedirect(route('login'));

        $this->assertGuest();
    }

    public function test_webhooks_remain_accessible_without_login(): void
    {
        // Webhook routes must not be behind 'auth' middleware (HMAC handles auth)
        config(['services.generator.secret' => 'x']);

        // Posting without auth shouldn't trigger a redirect to /login
        $response = $this->postJson('/webhooks/build/completed', []);
        $this->assertNotEquals(302, $response->status(), 'Webhooks must not redirect to login');
    }
}
