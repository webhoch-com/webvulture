<?php

namespace App\Domain\Discovery;

use App\Domain\Cost\CostTracker;
use App\Models\Lead;
use App\Models\SearchRun;
use App\Support\Enums\CostProvider;
use App\Support\Enums\LeadStatus;
use App\Support\Enums\SearchRunStatus;
use Illuminate\Support\Arr;

class MapsDiscoveryService
{
    // Places Text Search (New) pricing ~ $0.032 per request at Essentials SKU.
    private const COST_CENTS_PER_REQUEST = 4;

    public function __construct(
        protected GoogleMapsClient $client,
        protected CostTracker $cost,
    ) {}

    public function run(SearchRun $run): int
    {
        $run->forceFill([
            'status' => SearchRunStatus::Running,
            'started_at' => now(),
        ])->save();

        try {
            $query = trim(($run->keyword ? $run->keyword.' ' : '').'in '.$run->city);
            $places = $this->client->searchText($query, $run->limit);

            $this->cost->record($run, CostProvider::Maps, 1, self::COST_CENTS_PER_REQUEST, [
                'endpoint' => 'places:searchText',
                'query' => $query,
                'results' => count($places),
            ]);

            $count = 0;
            foreach ($places as $place) {
                $this->upsertLead($run, $place);
                $count++;
            }

            $run->forceFill([
                'status' => SearchRunStatus::Done,
                'leads_count' => $count,
                'cost_cents' => $run->costLogs()->sum('cost_cents'),
                'finished_at' => now(),
            ])->save();

            return $count;
        } catch (\Throwable $e) {
            $run->forceFill([
                'status' => SearchRunStatus::Failed,
                'error' => $e->getMessage(),
                'finished_at' => now(),
            ])->save();

            throw $e;
        }
    }

    protected function upsertLead(SearchRun $run, array $place): void
    {
        $placeId = Arr::get($place, 'id');
        if (! $placeId) {
            return;
        }

        $website = Arr::get($place, 'websiteUri');
        $rating = Arr::get($place, 'rating');
        $reviewCount = (int) Arr::get($place, 'userRatingCount', 0);
        $category = Arr::get($place, 'primaryType') ?? Arr::get($place, 'types.0');

        Lead::updateOrCreate(
            ['place_id' => $placeId],
            [
                'search_run_id' => $run->id,
                'name' => Arr::get($place, 'displayName.text', 'Unknown'),
                'category' => $category,
                'city' => $run->city,
                'address' => Arr::get($place, 'formattedAddress'),
                'phone' => Arr::get($place, 'internationalPhoneNumber') ?? Arr::get($place, 'nationalPhoneNumber'),
                'website' => $website,
                'rating' => $rating,
                'review_count' => $reviewCount,
                'has_website' => (bool) $website,
                'quality_score' => $this->scoreLead($rating, $reviewCount, (bool) $website),
                'status' => LeadStatus::New,
                'meta' => [
                    'location' => Arr::get($place, 'location'),
                    'types' => Arr::get($place, 'types'),
                ],
            ],
        );
    }

    protected function scoreLead(?float $rating, int $reviewCount, bool $hasWebsite): int
    {
        // Target: no website + real traction.
        $score = 0;
        if (! $hasWebsite) {
            $score += 40;
        }
        if ($rating !== null) {
            $score += (int) round($rating * 8); // max 40
        }
        $score += min(20, (int) round(log(max($reviewCount, 1)) * 6));

        return max(0, min(100, $score));
    }
}
