<?php

namespace App\Http\Controllers\Webhooks;

use App\Http\Controllers\Controller;
use App\Models\GenerationRun;
use App\Models\PrototypeVersion;
use App\Support\Enums\LeadStatus;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;

class BuildCompletedController extends Controller
{
    public function __invoke(Request $request): Response
    {
        if (!$this->verifySignature($request)) {
            return response('Unauthorized', 401);
        }

        $versionId   = $request->integer('prototype_version_id');
        $status      = $request->string('status')->toString();
        $meta        = $request->input('meta', []);

        $version = PrototypeVersion::find($versionId);
        if (!$version) {
            return response('Not found', 404);
        }

        if ($status === 'success') {
            $version->update([
                'status' => 'built',
                'artifact_path' => $meta['artifact_path'] ?? null,
                'artifact_hash' => $meta['artifact_hash'] ?? null,
                'preview_url' => $meta['preview_url'] ?? null,
                'screenshot_path' => $meta['screenshot_path'] ?? null,
            ]);

            // Promote to current version
            $version->prototype->update(['current_version_id' => $versionId, 'status' => 'deployed']);

            // Mark lead as prototyped
            $version->prototype->lead->update(['status' => LeadStatus::Prototyped]);

            Log::info("Build succeeded version {$versionId}, preview: ".($meta['preview_url'] ?? ''));
        } else {
            $version->update(['status' => 'build_failed', 'notes' => $meta['error'] ?? null]);
            Log::error("Build failed version {$versionId}: ".($meta['error'] ?? ''));
        }

        return response('', 204);
    }

    protected function verifySignature(Request $request): bool
    {
        $secret = (string) config('services.generator.secret', '');
        if (!$secret) {
            return true;
        }
        $timestamp = $request->header('X-WV-Timestamp', '');
        $sig = $request->header('X-WV-Signature', '');
        return hash_equals(hash_hmac('sha256', $timestamp, $secret), $sig);
    }
}
