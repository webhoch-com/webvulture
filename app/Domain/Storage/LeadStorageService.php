<?php

namespace App\Domain\Storage;

use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Support\Facades\Storage;

/**
 * Deterministic filesystem layout under storage/app/leads/{lead_id}/:
 *
 *   raw/
 *     homepage.html
 *     about.html
 *   extracted/
 *     content.json
 *   screenshots/
 *     homepage-desktop.png
 *     homepage-mobile.png
 *     homepage-atf.png
 *   generation/
 *     rebuild-package.json
 *     claude-input.json
 *     claude-output.json
 *
 * Backed by the 'leads' filesystem disk (set LEADS_DISK=local|s3 in .env).
 */
class LeadStorageService
{
    protected function disk(): Filesystem
    {
        return Storage::disk('leads');
    }

    protected function publicDisk(): Filesystem
    {
        return Storage::disk('public');
    }

    // ─── Path helpers ─────────────────────────────────────────────────────────

    public function root(int $leadId): string
    {
        return "leads/{$leadId}";
    }

    /**
     * Public-asset path (image cache for the preview pipeline). Lives under the
     * `public` disk so the rendered Astro mockups can `<img src=…>` it directly
     * without auth and without CORS friction.
     */
    public function publicAssetPath(int $leadId, string $filename): string
    {
        return "{$this->root($leadId)}/assets/{$filename}";
    }

    public function writePublicAsset(int $leadId, string $filename, string $contents): string
    {
        // Path-traversal guard: only allow restricted filenames (alphanumeric + . _ -)
        $safe = basename($filename);
        if ($safe !== $filename || !preg_match('/^[A-Za-z0-9._-]{1,128}$/', $safe)) {
            throw new \InvalidArgumentException("Invalid asset filename: {$filename}");
        }
        $path = $this->publicAssetPath($leadId, $safe);
        $this->publicDisk()->put($path, $contents);
        return $path;
    }

    public function publicAssetUrl(string $relativePath): string
    {
        return $this->publicDisk()->url($relativePath);
    }

    public function publicAssetExists(int $leadId, string $filename): bool
    {
        return $this->publicDisk()->exists($this->publicAssetPath($leadId, $filename));
    }

    public function rawPath(int $leadId, string $filename): string
    {
        return "{$this->root($leadId)}/raw/{$filename}";
    }

    public function extractedPath(int $leadId): string
    {
        return "{$this->root($leadId)}/extracted/content.json";
    }

    public function screenshotPath(int $leadId, string $filename): string
    {
        return "{$this->root($leadId)}/screenshots/{$filename}";
    }

    public function generationPath(int $leadId, string $filename): string
    {
        return "{$this->root($leadId)}/generation/{$filename}";
    }

    // ─── Absolute paths (for Browsershot which needs full OS path) ───────────

    public function absolutePath(string $relativePath): string
    {
        return storage_path("app/{$relativePath}");
    }

    // ─── Read / write ─────────────────────────────────────────────────────────

    public function writeRaw(int $leadId, string $filename, string $content): string
    {
        $path = $this->rawPath($leadId, $filename);
        $this->disk()->put($path, $content);

        return $path;
    }

    public function writeExtracted(int $leadId, array $data): string
    {
        $path = $this->extractedPath($leadId);
        $this->disk()->put($path, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

        return $path;
    }

    public function readExtracted(int $leadId): ?array
    {
        $path = $this->extractedPath($leadId);
        if (! $this->disk()->exists($path)) {
            return null;
        }

        return json_decode($this->disk()->get($path), true);
    }

    public function writeGeneration(int $leadId, string $filename, array $data): string
    {
        $path = $this->generationPath($leadId, $filename);
        $this->disk()->put($path, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

        return $path;
    }

    public function readGeneration(int $leadId, string $filename): ?array
    {
        $path = $this->generationPath($leadId, $filename);
        if (! $this->disk()->exists($path)) {
            return null;
        }

        return json_decode($this->disk()->get($path), true);
    }

    // ─── Freshness check ─────────────────────────────────────────────────────

    public function rawExists(int $leadId, string $filename): bool
    {
        return $this->disk()->exists($this->rawPath($leadId, $filename));
    }

    public function screenshotsExist(int $leadId): bool
    {
        return $this->disk()->exists($this->screenshotPath($leadId, 'homepage-desktop.png'));
    }

    public function extractedExists(int $leadId): bool
    {
        return $this->disk()->exists($this->extractedPath($leadId));
    }

    // ─── Delete all lead files ───────────────────────────────────────────────

    public function deleteAll(int $leadId): void
    {
        $root = $this->root($leadId);
        if (! $this->disk()->exists($root)) {
            return;
        }
        if (! $this->disk()->deleteDirectory($root)) {
            throw new \RuntimeException(
                "LeadStorageService::deleteAll failed for lead {$leadId} (path {$root}). "
                ."Files may remain on disk — Job will retry."
            );
        }
    }

    // ─── Delete Node generator artifacts (projects + built artifacts) ────────

    public function deletePrototypeFiles(array $versionIds): void
    {
        $projectsDir = (string) config('services.storage.projects_dir', '/tmp/wv-projects');
        $artifactsDir = (string) config('services.storage.artifacts_dir', '/tmp/wv-artifacts');

        $missingCount = 0;
        $deletedCount = 0;
        foreach ($versionIds as $id) {
            $project = "{$projectsDir}/prototype-{$id}";
            $artifact = "{$artifactsDir}/{$id}";
            $foundAny = false;
            if (is_dir($project)) {
                $this->rmrf($project);
                $foundAny = true;
            }
            if (is_dir($artifact)) {
                $this->rmrf($artifact);
                $foundAny = true;
            }
            if ($foundAny) {
                $deletedCount++;
            } else {
                $missingCount++;
            }
        }

        if (! empty($versionIds) && $deletedCount === 0) {
            \Illuminate\Support\Facades\Log::warning(
                'LeadStorageService::deletePrototypeFiles found no files for any version — possible config drift',
                ['version_ids' => $versionIds, 'projects_dir' => $projectsDir, 'artifacts_dir' => $artifactsDir]
            );
        } elseif ($missingCount > 0) {
            \Illuminate\Support\Facades\Log::info(
                "LeadStorageService::deletePrototypeFiles deleted {$deletedCount}, {$missingCount} versions had no files"
            );
        }
    }

    private function rmrf(string $path): void
    {
        $files = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($path, \FilesystemIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::CHILD_FIRST,
        );
        foreach ($files as $file) {
            $file->isDir() ? rmdir($file->getRealPath()) : unlink($file->getRealPath());
        }
        rmdir($path);
    }

    // ─── List screenshots for rebuild package ────────────────────────────────

    public function listScreenshots(int $leadId): array
    {
        $dir = "{$this->root($leadId)}/screenshots";
        if (! $this->disk()->exists($dir)) {
            return [];
        }

        return array_map(
            fn ($f) => ['path' => $f, 'name' => basename($f)],
            $this->disk()->files($dir),
        );
    }
}
