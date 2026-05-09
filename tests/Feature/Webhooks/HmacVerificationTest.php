<?php

namespace Tests\Feature\Webhooks;

use App\Jobs\BuildPrototypeJob;
use App\Models\Lead;
use App\Models\Prototype;
use App\Models\PrototypeVersion;
use App\Models\SearchRun;
use App\Support\Enums\LeadStatus;
use App\Support\Enums\SearchRunStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class HmacVerificationTest extends TestCase
{
    use RefreshDatabase;

    protected string $secret = 'test-secret-please-rotate';

    protected function setUp(): void
    {
        parent::setUp();
        config([
            'services.generator.secret' => $this->secret,
            'services.generator.webhook_max_age' => 300,
        ]);
    }

    public function test_valid_signature_updates_version_status(): void
    {
        $version = $this->makeVersion();

        $body = [
            'prototype_version_id' => $version->id,
            'status' => 'success',
            'meta' => [
                'artifact_path' => 'wv-artifacts/'.$version->id,
                'artifact_hash' => 'abcdef0123456789',
                'preview_url' => 'https://example.com',
            ],
        ];

        $this->signedRequest('/webhooks/build/completed', $body)
            ->assertNoContent(204);

        $fresh = $version->fresh();
        $this->assertSame('built', $fresh->status);
        $this->assertSame(LeadStatus::Prototyped, $fresh->prototype->lead->status);
        // Regression: meta sub-keys must persist. Laravel's validate() strips
        // unvalidated array sub-keys; the controller must read raw input.
        $this->assertSame('wv-artifacts/'.$version->id, $fresh->artifact_path);
        $this->assertSame('abcdef0123456789', $fresh->artifact_hash);
        $this->assertSame('https://example.com', $fresh->preview_url);
    }

    public function test_build_webhook_rejects_dangerous_paths_and_urls(): void
    {
        $version = $this->makeVersion();

        // Each of these meta values should be persisted as null (silently
        // dropped) — they would be RCE / XSS / open-redirect vectors otherwise.
        $body = [
            'prototype_version_id' => $version->id,
            'status' => 'success',
            'meta' => [
                'artifact_path' => '../../etc/passwd',
                'artifact_hash' => 'not-a-hash',
                'preview_url' => 'javascript:alert(1)',
                'screenshot_path' => '//evil.example.com/track.gif',
            ],
        ];

        $this->signedRequest('/webhooks/build/completed', $body)
            ->assertNoContent(204);

        $fresh = $version->fresh();
        $this->assertSame('built', $fresh->status);
        $this->assertNull($fresh->artifact_path);
        $this->assertNull($fresh->artifact_hash);
        $this->assertNull($fresh->preview_url);
        $this->assertNull($fresh->screenshot_path);
    }

    public function test_invalid_signature_rejects_request(): void
    {
        $version = $this->makeVersion();

        $this->postJson('/webhooks/build/completed', [
            'prototype_version_id' => $version->id,
            'status' => 'success',
        ], [
            'X-WV-Timestamp' => (string) time(),
            'X-WV-Signature' => 'totally-bogus-signature',
        ])->assertStatus(401);

        $this->assertSame('pending', $version->fresh()->status);
    }

    public function test_tampered_body_rejects_request(): void
    {
        $version = $this->makeVersion();

        $original = json_encode(['prototype_version_id' => $version->id, 'status' => 'success']);
        $ts = (string) time();
        $sig = hash_hmac('sha256', $ts.'.'.$original, $this->secret);

        // Submit different body with the original signature
        $this->call('POST', '/webhooks/build/completed', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_ACCEPT' => 'application/json',
            'HTTP_X_WV_TIMESTAMP' => $ts,
            'HTTP_X_WV_SIGNATURE' => $sig,
        ], json_encode(['prototype_version_id' => 999, 'status' => 'success']))
            ->assertStatus(401);
    }

    public function test_replay_same_signature_rejects_second_call(): void
    {
        $version = $this->makeVersion();

        $body = ['prototype_version_id' => $version->id, 'status' => 'success'];
        $ts = (string) time();
        $rawBody = json_encode($body);
        $sig = hash_hmac('sha256', $ts.'.'.$rawBody, $this->secret);

        // First call with (ts,sig) succeeds
        $this->call('POST', '/webhooks/build/completed', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_ACCEPT' => 'application/json',
            'HTTP_X_WV_TIMESTAMP' => $ts,
            'HTTP_X_WV_SIGNATURE' => $sig,
        ], $rawBody)->assertNoContent(204);

        // Replay with identical (ts,sig) must be rejected by nonce-cache
        $this->call('POST', '/webhooks/build/completed', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_ACCEPT' => 'application/json',
            'HTTP_X_WV_TIMESTAMP' => $ts,
            'HTTP_X_WV_SIGNATURE' => $sig,
        ], $rawBody)->assertStatus(401);
    }

    public function test_replay_old_timestamp_rejects(): void
    {
        $version = $this->makeVersion();
        $oldTimestamp = (string) (time() - 600); // 10 min ago
        $rawBody = json_encode(['prototype_version_id' => $version->id, 'status' => 'success']);

        $this->call('POST', '/webhooks/build/completed', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_ACCEPT' => 'application/json',
            'HTTP_X_WV_TIMESTAMP' => $oldTimestamp,
            'HTTP_X_WV_SIGNATURE' => hash_hmac('sha256', $oldTimestamp.'.'.$rawBody, $this->secret),
        ], $rawBody)->assertStatus(401);
    }

    public function test_missing_headers_rejects(): void
    {
        $version = $this->makeVersion();

        $this->postJson('/webhooks/build/completed', [
            'prototype_version_id' => $version->id,
            'status' => 'success',
        ])->assertStatus(401);
    }

    public function test_empty_secret_rejects_all(): void
    {
        config(['services.generator.secret' => '']);
        $version = $this->makeVersion();

        $ts = (string) time();
        $rawBody = json_encode(['prototype_version_id' => $version->id, 'status' => 'success']);

        $this->call('POST', '/webhooks/build/completed', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_ACCEPT' => 'application/json',
            'HTTP_X_WV_TIMESTAMP' => $ts,
            'HTTP_X_WV_SIGNATURE' => hash_hmac('sha256', $ts.'.'.$rawBody, ''),
        ], $rawBody)->assertStatus(401);
    }

    public function test_invalid_payload_returns_validation_error(): void
    {
        $this->makeVersion();

        $this->signedRequest('/webhooks/build/completed', [
            // missing required prototype_version_id
            'status' => 'success',
        ])->assertStatus(422);
    }

    public function test_generation_completed_dispatches_build_job(): void
    {
        Queue::fake();

        $version = $this->makeVersion();
        \App\Models\GenerationRun::create([
            'prototype_version_id' => $version->id,
            'status' => 'pending',
            'started_at' => now(),
        ]);

        $this->signedRequest('/webhooks/generation/completed', [
            'prototype_version_id' => $version->id,
            'status' => 'success',
            'site_spec' => ['hero' => ['title' => 'Hello']],
            'meta' => [
                'astro_project_path' => '/tmp/wv-projects/x',
                'model' => 'claude-sonnet-4-6',
                'input_tokens' => 1500,
                'output_tokens' => 800,
                'cost_cents' => 17,
            ],
        ])->assertNoContent(204);

        $fresh = $version->fresh();
        $this->assertSame('generated', $fresh->status);
        // astro_project_path is now pinned to the canonical convention path
        // regardless of what the generator reports — defence-in-depth against
        // generator-compromise → RCE via npm install cwd.
        $this->assertSame(
            "/var/www/webseiten-werkstatt/projects/prototype-{$version->id}",
            $fresh->astro_project_path,
        );

        // Regression: meta sub-keys must reach the GenerationRun row + cost_logs.
        $run = \App\Models\GenerationRun::where('prototype_version_id', $version->id)->first();
        $this->assertSame('claude-sonnet-4-6', $run->model);
        $this->assertSame(1500, $run->input_tokens);
        $this->assertSame(800, $run->output_tokens);
        $this->assertSame(17, $run->cost_cents);

        // Generation cost must be visible to CostGuard via cost_logs.
        $this->assertDatabaseHas('cost_logs', [
            'costable_type' => \App\Models\Lead::class,
            'costable_id' => $version->prototype->lead_id,
            'cost_cents' => 17,
        ]);

        Queue::assertPushed(BuildPrototypeJob::class);
    }

    protected function signedRequest(string $url, array $body)
    {
        $ts = (string) time();
        $rawBody = json_encode($body);

        return $this->call('POST', $url, [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_ACCEPT' => 'application/json',
            'HTTP_X_WV_TIMESTAMP' => $ts,
            'HTTP_X_WV_SIGNATURE' => hash_hmac('sha256', $ts.'.'.$rawBody, $this->secret),
        ], $rawBody);
    }

    protected function makeVersion(): PrototypeVersion
    {
        $run = SearchRun::create([
            'city' => 'Berlin',
            'keyword' => 'test',
            'limit' => 10,
            'status' => SearchRunStatus::Done,
        ]);
        $lead = Lead::create([
            'search_run_id' => $run->id,
            'place_id' => 'place_'.uniqid(),
            'name' => 'Test Biz',
            'city' => 'Berlin',
            'status' => LeadStatus::New,
            'has_website' => false,
            'quality_score' => 50,
        ]);
        $proto = Prototype::create([
            'lead_id' => $lead->id,
            'slug' => 'test-'.uniqid(),
            'status' => 'pending',
        ]);

        return PrototypeVersion::create([
            'prototype_id' => $proto->id,
            'status' => 'pending',
        ]);
    }
}
