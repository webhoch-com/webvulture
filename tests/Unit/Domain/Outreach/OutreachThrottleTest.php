<?php

namespace Tests\Unit\Domain\Outreach;

use App\Domain\Outreach\OutreachService;
use App\Exceptions\OutreachThrottledException;
use App\Models\Lead;
use App\Models\OutreachMessage;
use App\Models\SearchRun;
use App\Models\WebsiteAnalysis;
use App\Support\Enums\LeadStatus;
use App\Support\Enums\SearchRunStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * Locks the two-layer outreach throttle (per-domain cooldown + daily cap).
 * Drift here turns the agency's outreach into a deliverability liability.
 */
class OutreachThrottleTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Cache::flush();
        config([
            'services.outreach.throttle.domain_window_seconds' => 30,
            'services.outreach.throttle.daily_cap' => 50,
        ]);
    }

    public function test_first_send_to_domain_succeeds(): void
    {
        $lead = $this->makeLead('hello@bakery.at');

        $msg = $this->app->make(OutreachService::class)->send($lead, 'Hi', 'Body');

        $this->assertSame('sent', $msg->status);
        $this->assertNotNull($msg->sent_at);
    }

    public function test_second_send_to_same_domain_within_window_throws(): void
    {
        $lead1 = $this->makeLead('hello@bakery.at');
        $lead2 = $this->makeLead('contact@bakery.at');

        $svc = $this->app->make(OutreachService::class);
        $svc->send($lead1, 'A', 'a');

        $this->expectException(OutreachThrottledException::class);
        $svc->send($lead2, 'B', 'b');
    }

    public function test_different_domains_can_send_in_parallel(): void
    {
        $svc = $this->app->make(OutreachService::class);
        $svc->send($this->makeLead('a@bakery.at'), 'A', 'a');
        $svc->send($this->makeLead('b@florist.at'), 'B', 'b');
        $svc->send($this->makeLead('c@cafe.at'), 'C', 'c');

        $this->assertSame(3, OutreachMessage::where('status', 'sent')->count());
    }

    public function test_daily_cap_blocks_when_reached(): void
    {
        // Pre-seed sent rows to push us up to the cap, then expect the next
        // send to throw without writing a new row.
        config(['services.outreach.throttle.daily_cap' => 2]);

        $svc = $this->app->make(OutreachService::class);
        $svc->send($this->makeLead('a@a.at'), 'A', 'a');
        $svc->send($this->makeLead('b@b.at'), 'B', 'b');

        $before = OutreachMessage::count();
        try {
            $svc->send($this->makeLead('c@c.at'), 'C', 'c');
            $this->fail('expected OutreachThrottledException');
        } catch (OutreachThrottledException $e) {
            $this->assertSame('daily_cap', $e->reason);
        }
        // No new OutreachMessage row should be created when throttled.
        $this->assertSame($before, OutreachMessage::count());
    }

    private function makeLead(string $email): Lead
    {
        $run = SearchRun::firstOrCreate(
            ['city' => 'Test', 'keyword' => 'test'],
            ['limit' => 10, 'status' => SearchRunStatus::Done],
        );
        $lead = Lead::create([
            'search_run_id' => $run->id,
            'place_id' => 'place_'.uniqid(),
            'name' => 'Test '.uniqid(),
            'category' => 'bakery',
            'city' => 'Salzburg',
            'status' => LeadStatus::Scraped,
            'has_website' => true,
            'quality_score' => 50,
        ]);
        WebsiteAnalysis::create([
            'lead_id' => $lead->id,
            'contact' => ['email' => $email],
            'crawled_at' => now(),
            'status' => 'done',
        ]);

        return $lead;
    }
}
