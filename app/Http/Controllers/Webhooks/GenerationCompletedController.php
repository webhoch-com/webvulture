<?php

namespace App\Http\Controllers\Webhooks;

use App\Http\Controllers\Controller;
use App\Jobs\BuildPrototypeJob;
use App\Models\GenerationRun;
use App\Models\Prototype;
use App\Models\PrototypeVersion;
use App\Support\Enums\LeadStatus;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;

class GenerationCompletedController extends Controller
{
    public function __invoke(Request $request): Response
    {
        if (!$this->verifySignature($request)) {
            return response('Unauthorized', 401);
        }

        $versionId = $request->integer('prototype_version_id');
        $status    = $request->string('status')->toString();
        $siteSpec  = $request->input('site_spec', []);
        $meta      = $request->input('meta', []);

        $version = PrototypeVersion::find($versionId);
        if (!$version) {
            Log::warning("GenerationCompleted: version {$versionId} not found");
            return response('Not found', 404);
        }

        if ($status === 'success') {
            $version->update([
                'status' => 'generated',
                'site_spec' => $siteSpec,
                'astro_project_path' => $meta['astro_project_path'] ?? null,
            ]);

            // Update generation_run
            GenerationRun::where('prototype_version_id', $versionId)->update([
                'status' => 'succeeded',
                'model' => $meta['model'] ?? null,
                'input_tokens' => $meta['input_tokens'] ?? 0,
                'output_tokens' => $meta['output_tokens'] ?? 0,
                'cost_cents' => $meta['cost_cents'] ?? 0,
                'tools_used' => $meta['tools_used'] ?? [],
                'finished_at' => now(),
            ]);

            // Kick off Astro build
            BuildPrototypeJob::dispatch($versionId)->onQueue('generation');

            Log::info("Generation succeeded for version {$versionId}, build queued");
        } else {
            $version->update(['status' => 'failed', 'notes' => $meta['error'] ?? 'Unknown error']);
            GenerationRun::where('prototype_version_id', $versionId)->update([
                'status' => 'failed',
                'error' => $meta['error'] ?? null,
                'finished_at' => now(),
            ]);
            Log::error("Generation failed for version {$versionId}: ".($meta['error'] ?? ''));
        }

        return response('', 204);
    }

    protected function verifySignature(Request $request): bool
    {
        $secret = (string) config('services.generator.secret', '');
        if (!$secret) {
            return true; // dev mode: no secret configured → allow
        }
        $timestamp = $request->header('X-WV-Timestamp', '');
        $sig = $request->header('X-WV-Signature', '');
        $expected = hash_hmac('sha256', $timestamp, $secret);
        return hash_equals($expected, $sig);
    }
}
