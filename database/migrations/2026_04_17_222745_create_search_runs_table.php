<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('search_runs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('city');
            $table->string('keyword')->nullable();
            $table->unsignedInteger('limit')->default(20);
            $table->json('filters')->nullable();
            $table->string('status')->default('queued');
            $table->unsignedInteger('cost_cents')->default(0);
            $table->unsignedInteger('leads_count')->default(0);
            $table->text('error')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('finished_at')->nullable();
            $table->timestamps();

            $table->index('status');
            $table->index(['city', 'keyword']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('search_runs');
    }
};
