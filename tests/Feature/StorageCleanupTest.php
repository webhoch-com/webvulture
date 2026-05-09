<?php

namespace Tests\Feature;

use App\Jobs\CleanupLeadStorageJob;
use App\Models\Lead;
use App\Models\Prototype;
use App\Models\PrototypeVersion;
use App\Models\SearchRun;
use App\Support\Enums\LeadStatus;
use App\Support\Enums\SearchRunStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class StorageCleanupTest extends TestCase
{
    use RefreshDatabase;

    public function test_deleting_lead_dispatches_cleanup_job_with_version_ids(): void
    {
        Queue::fake();

        $run = SearchRun::create([
            'city' => 'Berlin',
            'limit' => 10,
            'status' => SearchRunStatus::Done,
        ]);
        $lead = Lead::create([
            'search_run_id' => $run->id,
            'place_id' => 'place_'.uniqid(),
            'name' => 'Cleanup Biz',
            'city' => 'Berlin',
            'status' => LeadStatus::Prototyped,
            'has_website' => true,
            'quality_score' => 80,
        ]);
        $proto = Prototype::create(['lead_id' => $lead->id, 'slug' => 'cleanup-'.uniqid(), 'status' => 'deployed']);
        $v1 = PrototypeVersion::create(['prototype_id' => $proto->id, 'status' => 'built']);
        $v2 = PrototypeVersion::create(['prototype_id' => $proto->id, 'status' => 'built']);

        $lead->delete();

        Queue::assertPushed(CleanupLeadStorageJob::class, function (CleanupLeadStorageJob $job) use ($lead, $v1, $v2) {
            return $job->leadId === $lead->id
                && in_array($v1->id, $job->prototypeVersionIds, true)
                && in_array($v2->id, $job->prototypeVersionIds, true);
        });
    }
}
