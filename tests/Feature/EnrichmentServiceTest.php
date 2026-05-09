<?php

namespace Tests\Feature;

use App\Domain\Cost\CostTracker;
use App\Domain\Enrichment\EnrichmentService;
use App\Domain\Llm\LlmProvider;
use App\Domain\Llm\LlmProviderFactory;
use App\Domain\Llm\LlmResponse;
use App\Domain\Llm\LlmService;
use App\Domain\Storage\LeadStorageService;
use App\Exceptions\CostCapExceededException;
use App\Models\CostLog;
use App\Models\Lead;
use App\Models\SearchRun;
use App\Support\CostGuard;
use App\Support\Enums\CostProvider;
use App\Support\Enums\LeadStatus;
use App\Support\Enums\SearchRunStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class EnrichmentServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_parses_markdown_fenced_json_response(): void
    {
        Storage::fake('leads');

        $lead = $this->makeLead();
        $service = new EnrichmentService(
            llm: $this->fakeLlm("```json\n".json_encode([
                'niche' => 'Friseursalon',
                'summary' => 'Test summary.',
                'value_prop' => 'Modernes Styling.',
                'tone' => 'modern',
                'weaknesses' => ['veraltetes Design'],
                'headline' => 'Frischer Look',
                'sections' => [],
                'cta' => ['label' => 'Termin', 'sub' => 'jetzt'],
            ])."\n```"),
            cost: app(CostTracker::class),
            store: app(LeadStorageService::class),
        );

        $enrichment = $service->enrich($lead);

        $this->assertSame('Friseursalon', $enrichment->niche);
        $this->assertSame(LeadStatus::Enriched, $lead->fresh()->status);
    }

    public function test_throws_on_non_json_response(): void
    {
        Storage::fake('leads');
        $lead = $this->makeLead();

        $service = new EnrichmentService(
            llm: $this->fakeLlm('this is not JSON at all'),
            cost: app(CostTracker::class),
            store: app(LeadStorageService::class),
        );

        $this->expectException(\RuntimeException::class);
        $service->enrich($lead);
    }

    public function test_cost_cap_blocks_enrichment(): void
    {
        config(['services.cost_caps.daily_eur' => 0.01]);

        CostLog::create([
            'costable_type' => Lead::class,
            'costable_id' => 999,
            'provider' => CostProvider::Claude,
            'units' => 1,
            'cost_cents' => 100,
            'meta' => [],
        ]);

        Storage::fake('leads');
        $lead = $this->makeLead();

        $service = new EnrichmentService(
            llm: $this->fakeLlm('{}'),
            cost: app(CostTracker::class),
            store: app(LeadStorageService::class),
        );

        $this->expectException(CostCapExceededException::class);
        $service->enrich($lead);
    }

    protected function fakeLlm(string $text): LlmService
    {
        $provider = new class($text) implements LlmProvider
        {
            public function __construct(private string $text) {}

            public function complete(string $s, string $u, array $opts = []): LlmResponse
            {
                return new LlmResponse(
                    text: $this->text,
                    model: 'fake-model',
                    inputTokens: 10,
                    outputTokens: 20,
                    costCents: 1,
                    durationMs: 5,
                );
            }

            public function name(): string
            {
                return 'fake';
            }

            public function defaultModel(bool $cheap = false): string
            {
                return 'fake-model';
            }
        };

        $factory = new class($provider) extends LlmProviderFactory
        {
            public function __construct(private LlmProvider $p) {}

            public function make(?string $name = null): LlmProvider
            {
                return $this->p;
            }
        };

        return new LlmService($factory, new CostGuard);
    }

    protected function makeLead(): Lead
    {
        $run = SearchRun::create(['city' => 'Berlin', 'limit' => 5, 'status' => SearchRunStatus::Done]);

        return Lead::create([
            'search_run_id' => $run->id,
            'place_id' => 'p_'.uniqid(),
            'name' => 'Test',
            'city' => 'Berlin',
            'status' => LeadStatus::Scraped,
            'has_website' => true,
            'website' => 'https://example.com',
            'quality_score' => 50,
        ]);
    }
}
