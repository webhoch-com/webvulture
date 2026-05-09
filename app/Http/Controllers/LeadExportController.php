<?php

namespace App\Http\Controllers;

use App\Models\Lead;
use App\Support\Enums\LeadStatus;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class LeadExportController extends Controller
{
    public function __invoke(Request $request): StreamedResponse
    {
        $request->validate([
            'q' => 'nullable|string|max:200',
            'status' => ['nullable', Rule::in(array_column(LeadStatus::cases(), 'value'))],
            'website' => 'nullable|in:yes,no',
            'showIrrelevant' => 'nullable|boolean',
        ]);

        $search = (string) $request->string('q');
        $status = (string) $request->string('status');
        $website = (string) $request->string('website');
        $showIrrelevant = $request->boolean('showIrrelevant');

        $filename = 'leads-'.now()->format('Y-m-d-His').'.csv';

        return response()->streamDownload(function () use ($search, $status, $website, $showIrrelevant) {
            $out = fopen('php://output', 'w');

            // BOM for Excel UTF-8 detection
            fwrite($out, chr(0xEF).chr(0xBB).chr(0xBF));

            fputcsv($out, [
                'ID',
                'Unternehmen',
                'Kategorie',
                'Stadt',
                'Adresse',
                'Telefon',
                'Website',
                'E-Mail',
                'Status',
                'Website-Sterne',
                'Quality-Score',
                'Google-Rating',
                'Google-Rezensionen',
                'Erstellt am',
            ], ';');

            $query = Lead::query()
                ->when($search, fn ($q) => $q->where('name', 'like', "%{$search}%"))
                ->when($status, fn ($q) => $q->where('status', $status))
                ->when($website === 'yes', fn ($q) => $q->where('has_website', true))
                ->when($website === 'no', fn ($q) => $q->where('has_website', false))
                ->when(! $showIrrelevant && ! $status, fn ($q) => $q->where('status', '!=', LeadStatus::Irrelevant->value))
                ->with(['websiteAnalysis:id,lead_id,contact'])
                ->orderBy('id');

            // Defuse CSV-formula-injection: cells starting with =, +, -, @, \t, \r execute as formulas
            // in Excel/LibreOffice. Lead names/addresses from Google Maps are untrusted input.
            $safe = static function (mixed $value): string {
                $s = (string) ($value ?? '');
                if ($s === '') {
                    return '';
                }
                if (preg_match('/^[=+\-@\t\r]/', $s) === 1) {
                    return "'".$s;
                }
                return $s;
            };

            $query->chunk(500, function ($leads) use ($out, $safe) {
                foreach ($leads as $lead) {
                    // contact column is JSON-cast to array but persists as null
                    // when nothing was scraped. The previous `?->contact['email']`
                    // raised a PHP 8 warning on every such row.
                    $contact = $lead->websiteAnalysis?->contact;
                    $email = is_array($contact) ? ($contact['email'] ?? null) : null;
                    fputcsv($out, [
                        $lead->id,
                        $safe($lead->name),
                        $safe($lead->category),
                        $safe($lead->city),
                        $safe($lead->address),
                        $safe($lead->phone),
                        $safe($lead->website),
                        $safe($email),
                        $lead->status?->label() ?? '',
                        $lead->website_stars !== null ? number_format($lead->website_stars, 1, ',', '') : '',
                        $lead->quality_score,
                        $lead->rating !== null ? number_format($lead->rating, 1, ',', '') : '',
                        $lead->review_count,
                        $lead->created_at?->format('Y-m-d H:i'),
                    ], ';');
                }
            });

            fclose($out);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }
}
