<?php

namespace Tests\Feature;

use App\Models\Lead;
use App\Models\SearchRun;
use App\Models\User;
use App\Support\Enums\LeadStatus;
use App\Support\Enums\SearchRunStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The CSV export crosses two security boundaries:
 *  - Auth: must reject unauthenticated callers (or the public can siphon
 *    the entire prospect database with one curl).
 *  - Excel formula injection: cells starting with `=`, `+`, `-`, `@`, tab,
 *    CR are interpreted as formulas by Excel/LibreOffice. A malicious
 *    business name like `=cmd|' /C calc'!A0` would execute when the
 *    user opens the export. The controller's `$safe()` lambda prefixes
 *    such cells with an apostrophe — this test locks that in.
 */
class LeadExportTest extends TestCase
{
    use RefreshDatabase;

    public function test_unauthenticated_export_redirects_to_login(): void
    {
        $this->get('/leads/export.csv')->assertRedirect('/login');
    }

    public function test_export_authenticated_returns_csv_with_bom(): void
    {
        $this->actingAs(User::factory()->create());
        $this->seedLead('Bäckerei Müller');

        $response = $this->get('/leads/export.csv');

        $response->assertOk();
        // Stream is sent — collect the body.
        $body = $response->streamedContent();
        $this->assertStringStartsWith("\xEF\xBB\xBF", $body, 'UTF-8 BOM missing');
        $this->assertStringContainsString('Bäckerei Müller', $body);
        $this->assertStringContainsString('ID;Unternehmen;Kategorie', $body);
    }

    public function test_csv_injection_payloads_are_neutralised(): void
    {
        $this->actingAs(User::factory()->create());

        $payloads = [
            '=cmd|\' /C calc\'!A0',
            '+1+1',
            '-2+3',
            '@SUM(A1:A5)',
            "\tTAB-leading",
            "\rCR-leading",
        ];
        foreach ($payloads as $name) {
            $this->seedLead($name);
        }

        $body = $this->get('/leads/export.csv')->streamedContent();
        // Every payload should appear in the body prefixed with an apostrophe.
        foreach ($payloads as $name) {
            // The first non-BOM char of each tainted cell must be an apostrophe.
            $this->assertStringContainsString("'".$name, $body, "payload not neutralised: {$name}");
        }
    }

    private function seedLead(string $name): Lead
    {
        $run = SearchRun::firstOrCreate(
            ['city' => 'Test', 'keyword' => 'test'],
            ['limit' => 10, 'status' => SearchRunStatus::Done],
        );

        return Lead::create([
            'search_run_id' => $run->id,
            'place_id' => 'place_'.uniqid(),
            'name' => $name,
            'category' => 'bakery',
            'city' => 'Salzburg',
            'status' => LeadStatus::Scraped,
            'has_website' => true,
            'quality_score' => 50,
        ]);
    }
}
