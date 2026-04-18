<?php

namespace App\Domain\Scraping;

use App\Domain\Storage\LeadStorageService;
use App\Models\Lead;

/**
 * Assembles the structured rebuild package that Claude receives for prototype generation.
 *
 * Schema stored at storage/app/leads/{id}/generation/rebuild-package.json:
 * {
 *   "version": 1,
 *   "generated_at": "ISO8601",
 *   "business": { name, category, city, address, phone, website, rating, review_count },
 *   "extracted": { title, meta_description, contact, services, socials, text_content },
 *   "screenshots": [ { name, path, slot } ],
 *   "logo_url": null|string,
 *   "brand_colors": [],
 *   "generation_params": { tone_hint, niche, weaknesses, headline_suggestion }
 * }
 */
class RebuildPackageBuilder
{
    public function __construct(protected LeadStorageService $store) {}

    public function build(Lead $lead): array
    {
        $lead->loadMissing(['websiteAnalysis', 'latestEnrichment']);
        $analysis = $lead->websiteAnalysis;
        $enrichment = $lead->latestEnrichment;

        $screenshots = $analysis?->screenshot_paths
            ? $this->formatScreenshots((array) $analysis->screenshot_paths)
            : [];

        $package = [
            'version' => 1,
            'generated_at' => now()->toIso8601String(),
            'business' => [
                'name' => $lead->name,
                'category' => $lead->category,
                'city' => $lead->city,
                'address' => $lead->address,
                'phone' => $lead->phone,
                'website' => $lead->website,
                'rating' => $lead->rating,
                'review_count' => $lead->review_count,
                'has_website' => $lead->has_website,
            ],
            'extracted' => [
                'title' => $analysis?->title,
                'meta_description' => $analysis?->meta_description,
                'contact' => $analysis?->contact ?? [],
                'services' => $analysis?->services ?? [],
                'socials' => $analysis?->socials ?? [],
                'text_content' => $analysis?->text_content
                    ? mb_substr($analysis->text_content, 0, 6000)
                    : null,
            ],
            'logo_url' => $analysis?->logo_url,
            'brand_colors' => $analysis?->brand_colors ?? [],
            'screenshots' => $screenshots,
            'generation_params' => [
                'niche' => $enrichment?->niche,
                'tone_hint' => $enrichment?->tone,
                'weaknesses' => $enrichment?->weaknesses ?? [],
                'headline_suggestion' => $enrichment?->headline,
                'value_prop' => $enrichment?->value_prop,
            ],
        ];

        // Persist to FS for debugging + regen reuse
        $path = $this->store->writeGeneration($lead->id, 'rebuild-package.json', $package);

        if ($analysis) {
            $analysis->update(['rebuild_package_path' => $path]);
        }

        return $package;
    }

    protected function formatScreenshots(array $paths): array
    {
        $slots = [
            'homepage-desktop' => 'desktop_full',
            'homepage-mobile' => 'mobile_full',
            'homepage-atf' => 'desktop_atf',
        ];

        $result = [];
        foreach ($paths as $name => $path) {
            $result[] = [
                'name' => $name,
                'path' => $path,
                'slot' => $slots[$name] ?? $name,
            ];
        }
        return $result;
    }
}
