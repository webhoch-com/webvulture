<?php

namespace App\Domain\Discovery;

use App\Exceptions\MapsQuotaExceededException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;

class GoogleMapsClient
{
    public function __construct(
        protected ?string $key = null,
        protected ?string $base = null,
    ) {
        $this->key ??= (string) config('services.google_maps.key');
        $this->base ??= (string) config('services.google_maps.places_base');
    }

    /**
     * Google Places "Text Search (New)" cap `pageSize` at 20 per request. Für
     * höhere Limits paginieren wir über `nextPageToken` (max 3 Seiten = 60
     * Ergebnisse — das ist Google's harte Obergrenze).
     */
    public function searchText(string $query, int $limit = 20): array
    {
        $fieldMask = implode(',', [
            'nextPageToken',
            'places.id',
            'places.displayName',
            'places.formattedAddress',
            'places.internationalPhoneNumber',
            'places.nationalPhoneNumber',
            'places.websiteUri',
            'places.rating',
            'places.userRatingCount',
            'places.primaryType',
            'places.types',
            'places.location',
            'places.addressComponents',
        ]);

        $limit = max(1, min($limit, 60));
        $places = [];
        $pageToken = null;
        $pagesFetched = 0;
        $maxPages = 3;

        while (count($places) < $limit && $pagesFetched < $maxPages) {
            $pageSize = min(20, $limit - count($places));
            $body = ['textQuery' => $query, 'pageSize' => $pageSize];
            if ($pageToken) {
                $body['pageToken'] = $pageToken;
            }

            try {
                $response = $this->request()
                    ->withHeaders(['X-Goog-FieldMask' => $fieldMask])
                    ->post($this->base.'/places:searchText', $body)
                    ->throw();
            } catch (RequestException $e) {
                $status = $e->response?->status();
                if (in_array($status, [403, 429], true)) {
                    $bodyText = (string) $e->response?->body();
                    throw new MapsQuotaExceededException(
                        "Google Maps API quota/rate-limit hit (HTTP {$status}): ".substr($bodyText, 0, 200)
                    );
                }
                throw $e;
            }

            $pagesFetched++;
            $batch = (array) ($response->json('places') ?? []);
            if (empty($batch)) {
                break;
            }
            array_push($places, ...$batch);

            $pageToken = $response->json('nextPageToken');
            if (! $pageToken) {
                break;
            }
            // Google empfiehlt eine kurze Pause zwischen Pagination-Calls;
            // sonst kommt der nextPageToken manchmal noch nicht durch ihre
            // Backend-Replication.
            usleep(200_000);
        }

        return array_slice($places, 0, $limit);
    }

    protected function request(): PendingRequest
    {
        return Http::withHeaders([
            'X-Goog-Api-Key' => $this->key,
            'Content-Type' => 'application/json',
        ])->acceptJson();
    }
}
