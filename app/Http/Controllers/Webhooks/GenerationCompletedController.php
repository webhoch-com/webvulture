<?php

namespace App\Http\Controllers\Webhooks;

use App\Domain\Cost\CostTracker;
use App\Http\Controllers\Controller;
use App\Jobs\BuildPrototypeJob;
use App\Models\GenerationRun;
use App\Models\PrototypeVersion;
use App\Support\Enums\CostProvider;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;

class GenerationCompletedController extends Controller
{
    use VerifiesGeneratorSignature;

    public function __invoke(Request $request, CostTracker $cost): Response
    {
        if (! $this->verifySignature($request)) {
            return response('Unauthorized', 401);
        }

        $request->validate([
            'prototype_version_id' => 'required|integer|min:1',
            'status' => 'required|string|in:success,failed',
            'site_spec' => 'sometimes|array',
            'meta' => 'sometimes|array',
            'meta.error' => 'required_if:status,failed|string|max:2000',
        ]);

        // Read raw inputs rather than `validate()` output: Laravel's validated()
        // strips array sub-keys without explicit rules, which would zero out
        // model/input_tokens/cost_cents/astro_project_path here.
        $versionId = (int) $request->input('prototype_version_id');
        $status = (string) $request->input('status');
        $siteSpec = (array) $request->input('site_spec', []);
        $meta = (array) $request->input('meta', []);

        $version = PrototypeVersion::with('prototype.lead')->find($versionId);
        if (! $version) {
            Log::warning("GenerationCompleted: version {$versionId} not found");

            return response('Not found', 404);
        }

        if ($status === 'success') {
            // Defence-in-depth: NEVER trust the path the generator sends us.
            // BuildPrototypeJob will pass this path as `cwd` to npm install /
            // npx astro build. A compromised generator (or anyone with the
            // HMAC secret) could otherwise set this to "/etc" or to a path
            // containing a malicious package.json — both lead to RCE on build.
            // Pin to the canonical convention; if the generator returns
            // something else we log + still write the canonical value.
            $canonicalPath = "/var/www/webseiten-werkstatt/projects/prototype-{$versionId}";
            $reportedPath = $meta['astro_project_path'] ?? null;
            if ($reportedPath !== null && $reportedPath !== $canonicalPath) {
                Log::warning('GenerationCompleted: non-canonical astro_project_path rejected', [
                    'version_id' => $versionId,
                    'reported' => $reportedPath,
                    'canonical' => $canonicalPath,
                ]);
            }

            $version->update([
                'status' => 'generated',
                'site_spec' => $siteSpec,
                'astro_project_path' => $canonicalPath,
            ]);

            GenerationRun::where('prototype_version_id', $versionId)->update([
                'status' => 'succeeded',
                'model' => $meta['model'] ?? null,
                'input_tokens' => $meta['input_tokens'] ?? 0,
                'output_tokens' => $meta['output_tokens'] ?? 0,
                'cost_cents' => $meta['cost_cents'] ?? 0,
                'tools_used' => $meta['tools_used'] ?? [],
                'finished_at' => now(),
            ]);

            // Record generation cost in cost_logs so daily cap and per-lead spend
            // include it. Without this, the most expensive call (Sonnet generation)
            // is invisible to CostGuard and the lead detail UI.
            $costCents = (int) ($meta['cost_cents'] ?? 0);
            if ($costCents > 0 && $version->prototype?->lead_id) {
                $cost->record(
                    $version->prototype->lead,
                    CostProvider::Claude,
                    1,
                    $costCents,
                    [
                        'phase' => 'generation',
                        'model' => $meta['model'] ?? null,
                        'input_tokens' => $meta['input_tokens'] ?? 0,
                        'output_tokens' => $meta['output_tokens'] ?? 0,
                        'prototype_version_id' => $versionId,
                    ],
                );
            }

            BuildPrototypeJob::dispatch($versionId)->onQueue('generation');

            Log::info("Generation succeeded for version {$versionId}, build queued");
        } else {
            $version->update([
                'status' => 'failed',
                'notes' => $meta['error'] ?? 'Unknown error',
            ]);
            GenerationRun::where('prototype_version_id', $versionId)->update([
                'status' => 'failed',
                'error' => $meta['error'] ?? null,
                'finished_at' => now(),
            ]);
            Log::error("Generation failed for version {$versionId}: ".($meta['error'] ?? ''));
        }

        return response('', 204);
    }
}
