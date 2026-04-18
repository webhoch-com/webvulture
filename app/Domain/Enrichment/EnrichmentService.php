<?php

namespace App\Domain\Enrichment;

use App\Domain\Cost\CostTracker;
use App\Domain\Storage\LeadStorageService;
use App\Models\Enrichment;
use App\Models\Lead;
use App\Support\Enums\CostProvider;
use App\Support\Enums\LeadStatus;

class EnrichmentService
{
    private const SYSTEM = <<<'PROMPT'
You analyze local businesses and extract structured lead-generation data.
Output ONLY valid JSON matching the schema. No prose, no markdown, no code fences.
Schema:
{
  "niche": "max 4 words, specific e.g. 'family dentistry' not 'dentist'",
  "summary": "2 sentence neutral description",
  "value_prop": "one sentence customer-facing value proposition",
  "tone": "one of: premium|friendly|technical|rustic|modern|budget|luxury",
  "weaknesses": ["list of observed website/online presence weaknesses, max 5"],
  "headline": "improved headline for redesigned site, max 70 chars",
  "sections": [
    {"type": "hero", "copy": ""},
    {"type": "services", "items": [""]},
    {"type": "about", "copy": ""},
    {"type": "cta", "copy": ""}
  ],
  "cta": {"label": "", "sub": ""}
}
PROMPT;

    public function __construct(
        protected ClaudeClient $claude,
        protected CostTracker $cost,
        protected LeadStorageService $store,
    ) {}

    public function enrich(Lead $lead): Enrichment
    {
        $lead->loadMissing(['websiteAnalysis']);
        $analysis = $lead->websiteAnalysis;
        $model = (string) config('services.anthropic.model_cheap', 'claude-haiku-4-5-20251001');

        // Prefer filesystem extracted JSON (richer + reusable) over DB field
        $extracted = $this->store->readExtracted($lead->id);
        $textContent = $extracted['text_content']
            ?? $analysis?->text_content
            ?? null;
        $services = $extracted['services']
            ?? $analysis?->services
            ?? [];

        $userPrompt = implode("\n", array_filter([
            "Business name: {$lead->name}",
            "Category: {$lead->category}",
            "City: {$lead->city}",
            $lead->website ? "Website: {$lead->website}" : "Has no website.",
            $lead->rating ? "Rating: {$lead->rating} ({$lead->review_count} reviews)" : null,
            $analysis?->title ? "Page title: {$analysis->title}" : null,
            $analysis?->meta_description ? "Meta desc: {$analysis->meta_description}" : null,
            $textContent ? "Site text (truncated):\n".mb_substr($textContent, 0, 3000) : null,
            $services ? "Detected services: ".implode(', ', (array) $services) : null,
            $analysis?->screenshot_paths
                ? "Screenshots captured: ".implode(', ', array_keys((array) $analysis->screenshot_paths))
                : null,
        ]));

        $result = $this->claude->complete(
            systemPrompt: self::SYSTEM,
            userPrompt: $userPrompt,
            purpose: 'enrichment',
            lead: $lead,
            model: $model,
            maxTokens: 1200,
        );

        $data = $this->parseJson($result['text']);

        $enrichment = Enrichment::create([
            'lead_id' => $lead->id,
            'niche' => $data['niche'] ?? null,
            'summary' => $data['summary'] ?? null,
            'value_prop' => $data['value_prop'] ?? null,
            'tone' => $data['tone'] ?? null,
            'weaknesses' => $data['weaknesses'] ?? [],
            'headline' => $data['headline'] ?? null,
            'sections' => $data['sections'] ?? [],
            'cta' => $data['cta'] ?? null,
            'model' => $result['model'],
            'input_tokens' => $result['input_tokens'],
            'output_tokens' => $result['output_tokens'],
            'cost_cents' => $result['cost_cents'],
        ]);

        // Persist Claude I/O for debugging
        $this->store->writeGeneration($lead->id, 'claude-input.json', [
            'purpose' => 'enrichment',
            'model' => $model,
            'prompt_len' => strlen($userPrompt),
        ]);
        $this->store->writeGeneration($lead->id, 'claude-output.json', $data);

        $this->cost->record($lead, CostProvider::Claude, 1, $result['cost_cents'], [
            'purpose' => 'enrichment',
            'model' => $result['model'],
            'input_tokens' => $result['input_tokens'],
            'output_tokens' => $result['output_tokens'],
        ]);

        $lead->update(['status' => LeadStatus::Enriched]);

        return $enrichment;
    }

    protected function parseJson(string $text): array
    {
        $text = preg_replace('/^```(?:json)?\s*/m', '', $text);
        $text = preg_replace('/```\s*$/m', '', $text);
        $data = json_decode(trim($text), true);

        if (!is_array($data)) {
            throw new \RuntimeException("Claude returned non-JSON: ".substr($text, 0, 200));
        }

        return $data;
    }
}
