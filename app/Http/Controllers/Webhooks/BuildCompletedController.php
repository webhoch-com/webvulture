<?php

namespace App\Http\Controllers\Webhooks;

use App\Events\LeadStatusChanged;
use App\Http\Controllers\Controller;
use App\Models\PrototypeVersion;
use App\Support\Enums\LeadStatus;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;

class BuildCompletedController extends Controller
{
    use VerifiesGeneratorSignature;

    public function __invoke(Request $request): Response
    {
        if (! $this->verifySignature($request)) {
            return response('Unauthorized', 401);
        }

        $request->validate([
            'prototype_version_id' => 'required|integer|min:1',
            'status' => 'required|string|in:success,failed',
            'meta' => 'sometimes|array',
            'meta.error' => 'required_if:status,failed|string|max:2000',
        ]);

        // Read raw inputs rather than validated() output — Laravel strips
        // array sub-keys without explicit rules, which would zero out
        // artifact_path, preview_url, screenshot_path here.
        $versionId = (int) $request->input('prototype_version_id');
        $status = (string) $request->input('status');
        $meta = (array) $request->input('meta', []);

        $version = PrototypeVersion::find($versionId);
        if (! $version) {
            return response('Not found', 404);
        }

        if ($status === 'success') {
            // Defence-in-depth: validate path/url shape on intake so that a
            // compromised generator cannot inject `javascript:`, `//evil.tld/`
            // or path-traversal values that later get echoed in admin Blade.
            $artifactPath = $this->safeRelativePath($meta['artifact_path'] ?? null);
            $screenshotPath = $this->safeRelativePath($meta['screenshot_path'] ?? null);
            $previewUrl = $this->safeHttpUrl($meta['preview_url'] ?? null);
            $artifactHash = is_string($meta['artifact_hash'] ?? null)
                && preg_match('/^[a-f0-9]{8,64}$/i', $meta['artifact_hash'])
                ? $meta['artifact_hash']
                : null;

            $version->update([
                'status' => 'built',
                'artifact_path' => $artifactPath,
                'artifact_hash' => $artifactHash,
                'preview_url' => $previewUrl,
                'screenshot_path' => $screenshotPath,
            ]);

            $version->prototype->update([
                'current_version_id' => $versionId,
                'status' => 'deployed',
            ]);

            $lead = $version->prototype->lead;
            $lead->update(['status' => LeadStatus::Prototyped]);
            LeadStatusChanged::dispatch($lead->id, LeadStatus::Prototyped->value);

            Log::info("Build succeeded version {$versionId}, preview: ".($meta['preview_url'] ?? ''));
        } else {
            $version->update([
                'status' => 'build_failed',
                'notes' => $meta['error'] ?? null,
            ]);
            Log::error("Build failed version {$versionId}: ".($meta['error'] ?? ''));
        }

        return response('', 204);
    }

    /**
     * Allow only relative file paths (no scheme, no leading "/", no traversal).
     * Returns null if the value is missing or unsafe.
     */
    private function safeRelativePath(mixed $value): ?string
    {
        if (! is_string($value) || $value === '' || strlen($value) > 512) {
            return null;
        }
        // Reject absolute URLs (`https://…`, `//evil.tld/…`), schemes
        // (`javascript:…`, `data:…`) and path traversal.
        if (preg_match('#^([a-z][a-z0-9+.-]*:|//)#i', $value)) {
            return null;
        }
        if (str_contains($value, '..')) {
            return null;
        }
        // Conservative whitelist for filesystem-safe relative paths.
        if (! preg_match('#^[A-Za-z0-9_/.\-]+$#', $value)) {
            return null;
        }
        return ltrim($value, '/');
    }

    private function safeHttpUrl(mixed $value): ?string
    {
        if (! is_string($value) || $value === '' || strlen($value) > 512) {
            return null;
        }
        if (! preg_match('#^https?://#i', $value)) {
            return null;
        }
        return filter_var($value, FILTER_VALIDATE_URL) ?: null;
    }
}
