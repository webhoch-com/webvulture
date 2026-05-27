<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Änderungswünsche / Revision-Requests pro Prototype-Version.
 *
 * Workflow:
 *   1. User klickt auf "/leads/{id}/prototype" → sieht den aktuellen Build.
 *   2. Trägt Feedback ein ("Hero-Bild ist zu groß, bitte ohne Gallery").
 *   3. Re-Generate → neuer Job mit `user_revision_notes` im generation_params.
 *      Der Generator-Service liest das aus und füttert es in den Claude-Prompt
 *      als zusätzliche Constraint.
 *   4. Neuer PrototypeVersion wird angelegt → result_version_id verlinkt.
 *   5. Revision-Status: applied (Re-Generate erfolgreich), failed, dismissed
 *      (User hat Feedback selbst gelöscht ohne neuen Build).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('prototype_revisions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('prototype_version_id')->constrained('prototype_versions')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('feedback');
            $table->string('status', 32)->default('pending'); // pending|applied|failed|dismissed
            $table->foreignId('result_version_id')->nullable()
                ->constrained('prototype_versions')->nullOnDelete();
            $table->timestamps();

            $table->index(['prototype_version_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('prototype_revisions');
    }
};
