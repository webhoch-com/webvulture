<?php

namespace App\Jobs;

use App\Domain\Prototype\GenerationClient;
use App\Models\PrototypeVersion;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class BuildPrototypeJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 2;
    public array $backoff = [30, 120];
    public int $timeout = 30;

    public function __construct(public int $prototypeVersionId) {}

    public function handle(GenerationClient $client): void
    {
        $version = PrototypeVersion::findOrFail($this->prototypeVersionId);

        if (!$version->astro_project_path) {
            throw new \RuntimeException("Version {$this->prototypeVersionId} has no astro_project_path");
        }

        $version->update(['status' => 'building']);
        $client->build($version->id, $version->astro_project_path);
    }
}
