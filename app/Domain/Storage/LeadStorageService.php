<?php

namespace App\Domain\Storage;

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
 * All paths are relative to storage/app (Laravel local disk).
 * Swap Storage::disk('local') → Storage::disk('s3') later without changing callers.
 */
class LeadStorageService
{
    protected function disk(): \Illuminate\Contracts\Filesystem\Filesystem
    {
        return Storage::disk('local');
    }

    // ─── Path helpers ─────────────────────────────────────────────────────────

    public function root(int $leadId): string
    {
        return "leads/{$leadId}";
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
        if (!$this->disk()->exists($path)) {
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
        if (!$this->disk()->exists($path)) {
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
        if ($this->disk()->exists($root)) {
            $this->disk()->deleteDirectory($root);
        }
    }

    // ─── Delete Node generator artifacts (projects + built artifacts) ────────

    public function deletePrototypeFiles(array $versionIds): void
    {
        $projectsDir = env('PROJECTS_DIR', '/tmp/wv-projects');
        $artifactsDir = env('ARTIFACTS_DIR', '/tmp/wv-artifacts');

        foreach ($versionIds as $id) {
            $project  = "{$projectsDir}/prototype-{$id}";
            $artifact = "{$artifactsDir}/{$id}";
            if (is_dir($project))  $this->rmrf($project);
            if (is_dir($artifact)) $this->rmrf($artifact);
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
        if (!$this->disk()->exists($dir)) {
            return [];
        }
        return array_map(
            fn ($f) => ['path' => $f, 'name' => basename($f)],
            $this->disk()->files($dir),
        );
    }
}
