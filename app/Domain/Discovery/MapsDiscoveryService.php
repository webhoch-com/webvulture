<?php

namespace App\Domain\Discovery;

use App\Domain\Cost\CostTracker;
use App\Models\Lead;
use App\Models\SearchRun;
use App\Support\CostGuard;
use App\Support\Enums\CostProvider;
use App\Support\Enums\LeadStatus;
use App\Support\Enums\SearchRunStatus;
use Illuminate\Support\Arr;

class MapsDiscoveryService
{
    // Places Text Search (New) pricing ~ $0.032 per request at Essentials SKU.
    // Static USD-cents — converted to EUR cents at record() time using the
    // same rate as the LLM providers (see CalculatesCost trait). Keeping the
    // raw USD here makes pricing-update audits easier (matches Google's docs).
    private const COST_USD_CENTS_PER_REQUEST = 3.2;

    private function eurCentsPerRequest(): int
    {
        $rate = (float) config('services.cost_caps.usd_to_eur', 0.93);

        return (int) round(self::COST_USD_CENTS_PER_REQUEST * $rate);
    }

    public function __construct(
        protected GoogleMapsClient $client,
        protected CostTracker $cost,
        protected CostGuard $costGuard,
    ) {}

    public function run(SearchRun $run): int
    {
        $this->costGuard->assertWithinDailyCap();

        $run->forceFill([
            'status' => SearchRunStatus::Running,
            'started_at' => now(),
        ])->save();

        try {
            $query = trim(($run->keyword ? $run->keyword.' ' : '').'in '.$run->city);
            $places = $this->client->searchText($query, $run->limit);

            // GoogleMapsClient paginiert bei limit > 20 transparent (max 3 Requests à 20).
            // Cost tracking muss die echte Request-Anzahl reflektieren.
            $requestCount = (int) ceil(count($places) / 20);
            $requestCount = max(1, $requestCount);
            $this->cost->record(
                $run,
                CostProvider::Maps,
                $requestCount,
                $requestCount * $this->eurCentsPerRequest(),
                [
                    'endpoint' => 'places:searchText',
                    'query' => $query,
                    'results' => count($places),
                    'pages' => $requestCount,
                ]
            );

            $newCount = 0;
            $totalCount = 0;
            foreach ($places as $place) {
                if ($this->upsertLead($run, $place)) {
                    $newCount++;
                }
                $totalCount++;
            }

            // leads_count = nur die NEUEN Leads die dieser Run angelegt hat.
            // Duplikate (place_id bereits in DB) zählen nicht — sonst würde der
            // Lead-Pool unter den Tisch fallen sobald derselbe Suchbegriff wieder
            // läuft. Total-Hits + Duplikate werden in filters.discovery_meta
            // gepfegt (filters ist die einzige existierende JSON-Spalte).
            $run->forceFill([
                'status' => SearchRunStatus::Done,
                'leads_count' => $newCount,
                'filters' => array_merge($run->filters ?? [], [
                    'discovery_meta' => [
                        'places_found_total' => $totalCount,
                        'duplicates_skipped' => $totalCount - $newCount,
                    ],
                ]),
                'cost_cents' => $run->costLogs()->sum('cost_cents'),
                'finished_at' => now(),
            ])->save();

            return $newCount;
        } catch (\Throwable $e) {
            $run->forceFill([
                'status' => SearchRunStatus::Failed,
                'error' => $e->getMessage(),
                'finished_at' => now(),
            ])->save();

            throw $e;
        }
    }

    /**
     * Insert-or-merge logic for a Place result.
     *
     * - Neuer Lead (place_id unbekannt): voll insertet, status=New, search_run_id=aktueller Run.
     * - Bestehender Lead: NUR "fresh" Google-Daten (rating/review_count/has_website/category/address/phone)
     *   werden aktualisiert. `search_run_id` und `status` bleiben WIE SIE WAREN — sonst würde ein
     *   schon-scraped/prototyped Lead in einer neuen Discovery wieder als "New" auftauchen und sein
     *   ursprünglicher Such-Lauf-Bezug verloren gehen (User-Wahrnehmung: "die alten Leads sind weg").
     *
     * @return bool true wenn neu erstellt, false wenn bereits vorhanden (mergeren).
     */
    protected function upsertLead(SearchRun $run, array $place): bool
    {
        $placeId = Arr::get($place, 'id');
        if (! $placeId) {
            return false;
        }

        $website = Arr::get($place, 'websiteUri');
        $rating = Arr::get($place, 'rating');
        $reviewCount = (int) Arr::get($place, 'userRatingCount', 0);
        $category = Arr::get($place, 'primaryType') ?? Arr::get($place, 'types.0');
        $hasWebsite = (bool) $website;

        $existing = Lead::where('place_id', $placeId)->first();

        if ($existing === null) {
            Lead::create([
                'place_id' => $placeId,
                'search_run_id' => $run->id,
                'name' => Arr::get($place, 'displayName.text', 'Unknown'),
                'category' => $category,
                'city' => $run->city,
                'address' => Arr::get($place, 'formattedAddress'),
                'phone' => Arr::get($place, 'internationalPhoneNumber') ?? Arr::get($place, 'nationalPhoneNumber'),
                'website' => $website,
                'rating' => $rating,
                'review_count' => $reviewCount,
                'has_website' => $hasWebsite,
                'quality_score' => $this->scoreLead($rating, $reviewCount, $hasWebsite),
                'website_stars' => $hasWebsite ? null : 0,
                'status' => LeadStatus::New,
                'meta' => [
                    'location' => Arr::get($place, 'location'),
                    'types' => Arr::get($place, 'types'),
                ],
            ]);

            return true;
        }

        // Merge-Update: nur volatile Felder aus Google refreshen.
        // search_run_id, status, name, city bleiben WIE GESETZT.
        $existing->forceFill([
            'category' => $category ?: $existing->category,
            'address' => Arr::get($place, 'formattedAddress') ?: $existing->address,
            'phone' => Arr::get($place, 'internationalPhoneNumber')
                ?? Arr::get($place, 'nationalPhoneNumber')
                ?? $existing->phone,
            'website' => $website ?: $existing->website,
            'rating' => $rating,
            'review_count' => $reviewCount,
            'has_website' => $hasWebsite,
            'quality_score' => $this->scoreLead($rating, $reviewCount, $hasWebsite),
            'website_stars' => $hasWebsite ? $existing->website_stars : 0,
            'meta' => array_merge($existing->meta ?? [], [
                'location' => Arr::get($place, 'location'),
                'types' => Arr::get($place, 'types'),
                'last_seen_in_run' => $run->id,
                'last_seen_at' => now()->toIso8601String(),
            ]),
        ])->save();

        return false;
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
