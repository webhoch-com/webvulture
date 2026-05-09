<?php

namespace Tests\Unit\Jobs;

use App\Jobs\RequestPrototypeGenerationJob;
use App\Models\Lead;
use App\Models\Prototype;
use App\Models\SearchRun;
use App\Support\Enums\LeadStatus;
use App\Support\Enums\SearchRunStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class SlugBuilderTest extends TestCase
{
    use RefreshDatabase;

    private RequestPrototypeGenerationJob $job;

    protected function setUp(): void
    {
        parent::setUp();
        $this->job = new RequestPrototypeGenerationJob(0);
    }

    #[DataProvider('domainProvider')]
    public function test_extracts_slug_from_domain(?string $url, ?string $expected): void
    {
        $this->assertSame($expected, $this->job->slugFromDomain($url));
    }

    public static function domainProvider(): array
    {
        return [
            'AT domain' => ['https://www.directors-cut.at/', 'directors-cut'],
            'DE domain' => ['https://malermeister-mueller.de', 'malermeister-mueller'],
            'COM domain' => ['https://example.com', 'example'],
            'CH domain' => ['https://hairsalon.ch/preise', 'hairsalon'],
            'no www' => ['https://anwaltskanzlei-wien.at', 'anwaltskanzlei-wien'],
            'no protocol' => ['friseur-graz.at', 'friseur-graz'],
            'subdomain' => ['https://shop.example.com', 'shop-example'],
            'multi-level TLD' => ['https://example.co.uk', 'example'],
            'with path' => ['https://www.zahnarzt-salzburg.at/team/dr-mueller', 'zahnarzt-salzburg'],
            'empty' => [null, null],
            'invalid' => ['', null],
        ];
    }

    public function test_uses_business_name_when_no_website(): void
    {
        $lead = $this->makeLead(['website' => null, 'name' => "Director's Cut"]);
        $this->assertSame('demo-directors-cut', $this->job->buildSlug($lead));
    }

    public function test_prefers_domain_over_business_name(): void
    {
        $lead = $this->makeLead([
            'name' => 'Hairdesign Kaufmann',
            'website' => 'https://www.hairdesignkaufmann.at/',
        ]);
        $this->assertSame('demo-hairdesignkaufmann', $this->job->buildSlug($lead));
    }

    public function test_appends_suffix_on_collision(): void
    {
        $lead1 = $this->makeLead(['name' => 'Director\'s Cut']);
        $lead2 = $this->makeLead(['name' => 'Director\'s Cut']);

        Prototype::create([
            'lead_id' => $lead1->id,
            'slug' => 'demo-directors-cut',
            'status' => 'generating',
        ]);

        $slug = $this->job->buildSlug($lead2);
        $this->assertNotSame('demo-directors-cut', $slug);
        $this->assertStringStartsWith('demo-directors-cut-', $slug);
        $this->assertSame(1, preg_match('/^demo-directors-cut-[a-z0-9]{4}$/', $slug));
    }

    public function test_falls_back_to_lead_id_when_name_unslugifiable(): void
    {
        $lead = $this->makeLead(['name' => '!!!', 'website' => null]);
        $this->assertSame('demo-lead-'.$lead->id, $this->job->buildSlug($lead));
    }

    public function test_does_not_double_prefix_already_prefixed_slug(): void
    {
        // Domain that already starts with "demo-" — must not become "demo-demo-…"
        $lead = $this->makeLead([
            'name' => 'Demo Studio',
            'website' => 'https://demo-studio.at/',
        ]);
        $this->assertSame('demo-studio', $this->job->buildSlug($lead));
    }

    protected function makeLead(array $overrides = []): Lead
    {
        $run = SearchRun::firstOrCreate(['city' => 'Test'], ['limit' => 5, 'status' => SearchRunStatus::Done]);

        return Lead::create(array_merge([
            'search_run_id' => $run->id,
            'place_id' => 'p_'.uniqid(),
            'name' => 'Test Business',
            'city' => 'Salzburg',
            'status' => LeadStatus::Enriched,
            'has_website' => false,
            'quality_score' => 50,
        ], $overrides));
    }
}
