<?php

namespace Tests\Unit\Domain\Cost;

use App\Exceptions\CostCapExceededException;
use App\Models\CostLog;
use App\Models\Lead;
use App\Models\SearchRun;
use App\Support\CostGuard;
use App\Support\Enums\CostProvider;
use App\Support\Enums\LeadStatus;
use App\Support\Enums\SearchRunStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CostGuardTest extends TestCase
{
    use RefreshDatabase;

    public function test_daily_cap_passes_when_under_limit(): void
    {
        config(['services.cost_caps.daily_eur' => 1.00]);

        $lead = $this->makeLead();
        CostLog::create([
            'costable_type' => Lead::class,
            'costable_id' => $lead->id,
            'provider' => CostProvider::Claude,
            'units' => 1,
            'cost_cents' => 50,
            'meta' => [],
        ]);

        (new CostGuard)->assertWithinDailyCap();
        $this->assertTrue(true);
    }

    public function test_daily_cap_throws_when_exceeded(): void
    {
        config(['services.cost_caps.daily_eur' => 1.00]);

        $lead = $this->makeLead();
        CostLog::create([
            'costable_type' => Lead::class,
            'costable_id' => $lead->id,
            'provider' => CostProvider::Claude,
            'units' => 1,
            'cost_cents' => 100,
            'meta' => [],
        ]);

        $this->expectException(CostCapExceededException::class);
        (new CostGuard)->assertWithinDailyCap();
    }

    public function test_per_lead_cap_throws_when_exceeded(): void
    {
        config(['services.cost_caps.per_lead_eur' => 0.50]);

        $lead = $this->makeLead();
        CostLog::create([
            'costable_type' => Lead::class,
            'costable_id' => $lead->id,
            'provider' => CostProvider::Claude,
            'units' => 1,
            'cost_cents' => 60,
            'meta' => [],
        ]);

        $this->expectException(CostCapExceededException::class);
        (new CostGuard)->assertWithinLeadCap($lead->id);
    }

    public function test_zero_cap_disables_check(): void
    {
        config(['services.cost_caps.daily_eur' => 0]);

        $lead = $this->makeLead();
        CostLog::create([
            'costable_type' => Lead::class,
            'costable_id' => $lead->id,
            'provider' => CostProvider::Claude,
            'units' => 1,
            'cost_cents' => 9_999_999,
            'meta' => [],
        ]);

        (new CostGuard)->assertWithinDailyCap();
        $this->assertTrue(true);
    }

    protected function makeLead(): Lead
    {
        $run = SearchRun::create([
            'city' => 'Berlin',
            'limit' => 10,
            'status' => SearchRunStatus::Done,
        ]);

        return Lead::create([
            'search_run_id' => $run->id,
            'place_id' => 'place_'.uniqid(),
            'name' => 'X',
            'city' => 'Berlin',
            'status' => LeadStatus::New,
            'has_website' => false,
            'quality_score' => 0,
        ]);
    }
}
