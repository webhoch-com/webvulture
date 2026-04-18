<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('prototype_versions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('prototype_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('version')->default(1);
            $table->unsignedBigInteger('parent_version_id')->nullable();
            $table->string('status')->default('queued');
            // generation_run_id FK added after generation_runs exists
            $table->unsignedBigInteger('generation_run_id')->nullable();
            $table->json('site_spec')->nullable();
            // filesystem paths
            $table->string('rebuild_package_path')->nullable();
            $table->string('astro_project_path')->nullable();
            $table->string('artifact_path')->nullable();
            $table->string('artifact_hash', 64)->nullable();
            $table->string('screenshot_path')->nullable();
            $table->string('preview_url')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['prototype_id', 'version']);
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('prototype_versions');
    }
};
