<?php

namespace Tests\Feature;

use App\Domain\Cost\CostTracker;
use App\Domain\Discovery\GoogleMapsClient;
use App\Domain\Discovery\MapsDiscoveryService;
use App\Exceptions\CostCapExceededException;
use App\Exceptions\MapsQuotaExceededException;
use App\Models\CostLog;
use App\Models\SearchRun;
use App\Support\CostGuard;
use App\Support\Enums\CostProvider;
use App\Support\Enums\SearchRunStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class MapsDiscoveryTest extends TestCase
{
    use RefreshDatabase;

    public function test_aborts_when_daily_cost_cap_exceeded(): void
    {
        config(['services.cost_caps.daily_eur' => 0.01]);

        CostLog::create([
            'costable_type' => 'App\\Models\\Lead',
            'costable_id' => 1,
            'provider' => CostProvider::Maps,
            'units' => 1,
            'cost_cents' => 100,
            'meta' => [],
        ]);

        Http::fake();

        $run = SearchRun::create(['city' => 'Berlin', 'limit' => 5, 'status' => SearchRunStatus::Queued]);

        $service = new MapsDiscoveryService(
            new GoogleMapsClient('fake-key', 'https://places.test'),
            app(CostTracker::class),
            new CostGuard,
        );

        $this->expectException(CostCapExceededException::class);
        $service->run($run);

        Http::assertNothingSent();
    }

    public function test_quota_exception_translates_to_quota_exceeded(): void
    {
        Http::fake([
            'https://places.test/places:searchText' => Http::response('{"error":"quota"}', 429),
        ]);

        $client = new GoogleMapsClient('fake-key', 'https://places.test');

        $this->expectException(MapsQuotaExceededException::class);
        $client->searchText('Berlin', 5);
    }
}
