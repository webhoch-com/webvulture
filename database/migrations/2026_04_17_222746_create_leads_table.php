<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('leads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('search_run_id')->nullable()->constrained()->nullOnDelete();
            $table->string('place_id')->unique();
            $table->string('name');
            $table->string('category')->nullable();
            $table->string('city')->nullable();
            $table->string('address')->nullable();
            $table->string('phone')->nullable();
            $table->string('website')->nullable();
            $table->decimal('rating', 2, 1)->nullable();
            $table->unsignedInteger('review_count')->default(0);
            $table->boolean('has_website')->default(false);
            $table->unsignedTinyInteger('quality_score')->default(0);
            $table->string('status')->default('new');
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->index('status');
            $table->index(['has_website', 'rating']);
            $table->index(['city', 'category']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('leads');
    }
};
