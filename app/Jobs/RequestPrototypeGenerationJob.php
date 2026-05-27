<?php

namespace App\Jobs;

use App\Domain\Cost\CostTracker;
use App\Domain\Layout\LayoutMatcher;
use App\Domain\Prototype\GenerationClient;
use App\Domain\Scraping\RebuildPackageBuilder;
use App\Models\GenerationRun;
use App\Models\Lead;
use App\Models\Prototype;
use App\Models\PrototypeVersion;
use App\Support\Enums\LayoutKind;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class RequestPrototypeGenerationJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 2;

    public array $backoff = [30, 120];

    public int $timeout = 30;

    public function __construct(
        public int $leadId,
        public string $templateFamily = 'studio',
        public ?string $layoutKind = null,
        /**
         * Optional: User-Feedback aus einer Revision-Anfrage. Wird im
         * `generation_params.user_revision_notes` an den Generator-Service
         * weitergegeben, der das in den Claude-Prompt als Constraint einbaut
         * ("Bitte berücksichtige zusätzlich: …").
         */
        public ?string $revisionNotes = null,
        /**
         * Wenn vom Revision-UI getriggert: ID der PrototypeRevision-Row die
         * mit dem result_version_id verknüpft werden soll, sobald wir den
         * neuen Version-Datensatz haben.
         */
        public ?int $revisionId = null,
    ) {}

    public function handle(
        GenerationClient $client,
        RebuildPackageBuilder $packageBuilder,
        CostTracker $cost,
        LayoutMatcher $matcher,
    ): void {
        $lead = Lead::with(['websiteAnalysis', 'latestEnrichment'])->findOrFail($this->leadId);

        // Auto-detect layout kind if caller didn't pin one
        $layoutKind = $this->layoutKind
            ? LayoutKind::tryFrom($this->layoutKind) ?? LayoutKind::Standard
            : $matcher->match(
                $lead->latestEnrichment?->niche,
                $lead->category,
                $lead->name,
            );

        $prototype = Prototype::firstOrCreate(
            ['lead_id' => $lead->id],
            [
                'slug' => $this->buildSlug($lead),
                'template_family' => $this->templateFamily,
                'layout_kind' => $layoutKind->value,
                'status' => 'generating',
            ],
        );
        $prototype->update([
            'status' => 'generating',
            'layout_kind' => $layoutKind->value,
        ]);

        $lastVersion = $prototype->versions()->max('version') ?? 0;
        $version = PrototypeVersion::create([
            'prototype_id' => $prototype->id,
            'version' => $lastVersion + 1,
            'status' => 'queued',
            'rebuild_package_path' => $lead->websiteAnalysis?->rebuild_package_path,
        ]);

        // Revision-Backlink: setzen sobald die neue Version existiert,
        // so dass das UI die Revision-Card als "applied" markieren kann.
        if ($this->revisionId) {
            \App\Models\PrototypeRevision::where('id', $this->revisionId)
                ->update(['result_version_id' => $version->id, 'status' => 'applied']);
        }

        GenerationRun::create([
            'prototype_version_id' => $version->id,
            'status' => 'pending',
            'started_at' => now(),
        ]);

        $package = $packageBuilder->build($lead);
        $package['layout_kind'] = $prototype->layout_kind ?? 'standard';

        // Revision-Notes in generation_params — der Node-Generator pickt
        // sie in `orchestrator.ts` aus und fügt sie dem Claude-Prompt
        // als zusätzliche Constraint hinzu.
        if ($this->revisionNotes) {
            $package['generation_params'] = array_merge(
                $package['generation_params'] ?? [],
                ['user_revision_notes' => $this->revisionNotes],
            );
        }

        $version->update(['status' => 'generating']);
        $client->generate($version->id, $prototype->slug, $package);
    }

    /**
     * Build a meaningful slug for the prototype.
     *
     * Priority:
     *   1. Domain root from $lead->website (e.g. "https://www.directors-cut.at" → "directors-cut")
     *   2. Slug of $lead->name (e.g. "Director's Cut" → "directors-cut")
     *   3. Fallback "lead-{id}"
     *
     * If the resulting slug is already taken by another Prototype, append a 4-char random suffix.
     */
    public function buildSlug(Lead $lead): string
    {
        $core = $this->slugFromDomain($lead->website)
            ?: Str::slug((string) $lead->name)
            ?: 'lead-'.$lead->id;

        // Generator regex: must match /^[a-z0-9][a-z0-9-]{0,99}$/
        $core = ltrim($core, '-');
        if ($core === '') {
            $core = 'lead-'.$lead->id;
        }

        // Prefix every demo with "demo-" so the subdomain self-discloses as
        // a demo (per marketing-consistency audit, point 6A). Already-prefixed
        // slugs (legacy or manually set) are not double-prefixed.
        $base = str_starts_with($core, 'demo-') ? $core : 'demo-'.$core;
        $base = substr($base, 0, 80);

        if (! Prototype::where('slug', $base)->exists()) {
            return $base;
        }

        // Collision — append short random suffix
        do {
            $candidate = $base.'-'.Str::lower(Str::random(4));
        } while (Prototype::where('slug', $candidate)->exists());

        return $candidate;
    }

    /**
     * Extract a clean slug from a website URL by stripping protocol, www, and common TLDs.
     * Returns null if no usable host is present.
     */
    public function slugFromDomain(?string $url): ?string
    {
        if (! $url) {
            return null;
        }

        $host = parse_url($url, PHP_URL_HOST);
        if (! $host) {
            // url might be missing protocol — try prepending and parsing again
            $host = parse_url('https://'.$url, PHP_URL_HOST);
        }
        if (! $host) {
            return null;
        }

        $host = strtolower($host);
        $host = preg_replace('/^www\./', '', $host);

        // Strip common TLDs (and second-level domains like .co.uk)
        $host = preg_replace(
            '/\.(at|de|com|ch|eu|net|org|io|info|co|app|shop|wien|berlin|tirol|salzburg)(\.\w{2,3})?$/',
            '',
            $host,
        );

        // Remaining dots (e.g. subdomains) → hyphens
        $host = str_replace('.', '-', (string) $host);

        return Str::slug($host) ?: null;
    }

    public function failed(\Throwable $e): void
    {
        $errorId = uniqid('genreq-fail-', true);
        Log::error("RequestPrototypeGenerationJob failed [{$errorId}] lead={$this->leadId}: {$e->getMessage()}");

        // Mark the latest pending/generating version as failed so UI doesn't hang
        $proto = Prototype::where('lead_id', $this->leadId)->first();
        if ($proto) {
            $proto->update(['status' => 'failed']);
            $proto->versions()
                ->whereIn('status', ['queued', 'generating'])
                ->update(['status' => 'failed', 'notes' => substr($e->getMessage(), 0, 500)]);
        }
    }
}
