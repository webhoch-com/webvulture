<?php

namespace App\Domain\Enrichment;

use App\Domain\Cost\CostTracker;
use App\Domain\Llm\LlmService;
use App\Domain\Storage\LeadStorageService;
use App\Events\LeadStatusChanged;
use App\Models\Enrichment;
use App\Models\Lead;
use App\Support\Enums\CostProvider;
use App\Support\Enums\LeadStatus;

class EnrichmentService
{
    private const SYSTEM = <<<'PROMPT'
Du analysierst lokale Unternehmen im deutschsprachigen Raum (DACH) und extrahierst strukturierte Lead-Generation-Daten.
Schreibe ALLE Ausgaben auf DEUTSCH (Sie-Form, professionell, präzise).
Antworte NUR mit gültigem JSON entsprechend dem Schema. Keine Prosa, kein Markdown, keine Code-Fences.

Schema:
{
  "niche": "max. 4 Wörter, spezifisch — z.B. 'Familien-Zahnarztpraxis' statt 'Zahnarzt'",
  "summary": "2 Sätze neutrale Beschreibung",
  "value_prop": "ein Satz kundenorientiertes Nutzenversprechen",
  "tone": "einer von: premium|freundlich|technisch|rustikal|modern|preiswert|luxuriös",
  "weaknesses": ["Liste beobachteter Website-/Online-Präsenz-Schwächen, max. 5"],
  "headline": "verbesserte Überschrift für Redesign, max. 70 Zeichen",
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
        protected LlmService $llm,
        protected CostTracker $cost,
        protected LeadStorageService $store,
    ) {}

    public function enrich(Lead $lead): Enrichment
    {
        $lead->loadMissing(['websiteAnalysis']);
        $analysis = $lead->websiteAnalysis;

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
            $lead->website ? "Website: {$lead->website}" : 'Has no website.',
            $lead->rating ? "Rating: {$lead->rating} ({$lead->review_count} reviews)" : null,
            $analysis?->title ? "Page title: {$analysis->title}" : null,
            $analysis?->meta_description ? "Meta desc: {$analysis->meta_description}" : null,
            $textContent ? "Site text (truncated):\n".mb_substr($textContent, 0, 3000) : null,
            $services ? 'Detected services: '.implode(', ', (array) $services) : null,
            $analysis?->screenshot_paths
                ? 'Screenshots captured: '.implode(', ', array_keys((array) $analysis->screenshot_paths))
                : null,
        ]));

        $response = $this->llm->complete(
            systemPrompt: self::SYSTEM,
            userPrompt: $userPrompt,
            purpose: 'enrichment',
            lead: $lead,
            opts: ['cheap' => true, 'max_tokens' => 2000],
        );

        // Cost first — real money was spent on the LLM call. Even if downstream DB writes
        // fail, the cap enforcement on the next call must see this expense.
        try {
            $this->cost->record($lead, CostProvider::Claude, 1, $response->costCents, [
                'purpose' => 'enrichment',
                'model' => $response->model,
                'input_tokens' => $response->inputTokens,
                'output_tokens' => $response->outputTokens,
            ]);
        } catch (\Throwable $costError) {
            \Log::error('EnrichmentService: cost record failed (LLM call already billed)', [
                'lead_id' => $lead->id,
                'cost_cents' => $response->costCents,
                'error' => $costError->getMessage(),
            ]);
            // Do not re-throw — losing one log entry is better than rolling back successful enrichment.
        }

        $data = $this->parseJson($response->text);

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
            'model' => $response->model,
            'input_tokens' => $response->inputTokens,
            'output_tokens' => $response->outputTokens,
            'cost_cents' => $response->costCents,
        ]);

        $this->store->writeGeneration($lead->id, 'claude-input.json', [
            'purpose' => 'enrichment',
            'model' => $response->model,
            'prompt_len' => strlen($userPrompt),
        ]);
        $this->store->writeGeneration($lead->id, 'claude-output.json', $data);

        $lead->update(['status' => LeadStatus::Enriched]);
        LeadStatusChanged::dispatch($lead->id, LeadStatus::Enriched->value);

        return $enrichment;
    }

    protected function parseJson(string $text): array
    {
        $text = preg_replace('/^```(?:json)?\s*/m', '', $text);
        $text = preg_replace('/```\s*$/m', '', $text);
        $data = json_decode(trim($text), true);

        if (! is_array($data)) {
            throw new \RuntimeException('LLM returned non-JSON: '.substr($text, 0, 200));
        }

        return $data;
    }
}
