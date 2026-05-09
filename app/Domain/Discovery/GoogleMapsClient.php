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

    public function searchText(string $query, int $limit = 20): array
    {
        $fieldMask = implode(',', [
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

        try {
            $response = $this->request()
                ->withHeaders(['X-Goog-FieldMask' => $fieldMask])
                ->post($this->base.'/places:searchText', [
                    'textQuery' => $query,
                    'pageSize' => min($limit, 20),
                ])
                ->throw();
        } catch (RequestException $e) {
            $status = $e->response?->status();
            if (in_array($status, [403, 429], true)) {
                $body = (string) $e->response?->body();
                throw new MapsQuotaExceededException(
                    "Google Maps API quota/rate-limit hit (HTTP {$status}): ".substr($body, 0, 200)
                );
            }
            throw $e;
        }

        return (array) ($response->json('places') ?? []);
    }

    protected function request(): PendingRequest
    {
        return Http::withHeaders([
            'X-Goog-Api-Key' => $this->key,
            'Content-Type' => 'application/json',
        ])->acceptJson();
    }
}
