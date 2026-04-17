<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cost_logs', function (Blueprint $table) {
            $table->id();
            $table->morphs('costable');
            $table->string('provider');
            $table->unsignedInteger('units')->default(1);
            $table->unsignedInteger('cost_cents')->default(0);
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->index(['provider', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cost_logs');
    }
};
