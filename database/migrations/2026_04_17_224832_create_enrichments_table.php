<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('enrichments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lead_id')->constrained()->cascadeOnDelete();
            $table->string('niche')->nullable();
            $table->text('summary')->nullable();
            $table->text('value_prop')->nullable();
            $table->string('tone')->nullable();
            $table->json('weaknesses')->nullable();
            $table->text('headline')->nullable();
            $table->json('sections')->nullable();
            $table->json('cta')->nullable();
            $table->string('model')->nullable();
            $table->unsignedInteger('input_tokens')->default(0);
            $table->unsignedInteger('output_tokens')->default(0);
            $table->unsignedInteger('cost_cents')->default(0);
            $table->timestamps();

            $table->index('lead_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('enrichments');
    }
};
