<?php

namespace App\Domain\Discovery;

use Illuminate\Http\Client\PendingRequest;
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

        $response = $this->request()
            ->withHeaders(['X-Goog-FieldMask' => $fieldMask])
            ->post($this->base.'/places:searchText', [
                'textQuery' => $query,
                'pageSize' => min($limit, 20),
            ])
            ->throw();

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
