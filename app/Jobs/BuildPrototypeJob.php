<?php

namespace App\Jobs;

use App\Domain\Prototype\GenerationClient;
use App\Models\PrototypeVersion;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class BuildPrototypeJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 2;

    public array $backoff = [30, 120];

    // GenerationClient::dispatch already uses Http::timeout(30); the worker
    // needs headroom to write back to the DB after the call returns.
    public int $timeout = 45;

    public function __construct(public int $prototypeVersionId) {}

    public function handle(GenerationClient $client): void
    {
        $version = PrototypeVersion::with('prototype')->findOrFail($this->prototypeVersionId);

        // Fallback: if webhook lost astro_project_path, recover via convention.
        // Generator scaffolds at /var/www/webseiten-werkstatt/projects/prototype-{id}.
        $path = $version->astro_project_path;
        if (! $path) {
            $convention = "/var/www/webseiten-werkstatt/projects/prototype-{$this->prototypeVersionId}";
            if (is_dir($convention) && is_dir("{$convention}/src")) {
                $path = $convention;
                $version->update(['astro_project_path' => $path]);
                Log::info("BuildPrototypeJob: recovered astro_project_path via convention", [
                    'version_id' => $this->prototypeVersionId,
                    'path' => $path,
                ]);
            } else {
                throw new \RuntimeException("Version {$this->prototypeVersionId} has no astro_project_path (convention {$convention} also missing)");
            }
        }

        $slug = $version->prototype->slug;
        if (! $slug) {
            throw new \RuntimeException("Prototype for version {$this->prototypeVersionId} has no slug");
        }

        $version->update(['status' => 'building']);
        $client->build($version->id, $slug, $path);
    }

    public function failed(\Throwable $e): void
    {
        $errorId = uniqid('build-fail-', true);
        Log::error("BuildPrototypeJob failed [{$errorId}] version={$this->prototypeVersionId}: {$e->getMessage()}");

        PrototypeVersion::find($this->prototypeVersionId)?->update([
            'status' => 'build_failed',
            'notes' => substr($e->getMessage(), 0, 500),
        ]);
    }
}
