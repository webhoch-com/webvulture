<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('website_analyses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lead_id')->constrained()->cascadeOnDelete()->unique();
            $table->timestamp('crawled_at')->nullable();
            $table->string('final_url')->nullable();
            $table->unsignedSmallInteger('http_status')->nullable();
            $table->string('title')->nullable();
            $table->text('meta_description')->nullable();
            $table->string('logo_url')->nullable();
            $table->json('contact')->nullable();
            $table->json('services')->nullable();
            $table->json('images')->nullable();
            $table->json('socials')->nullable();
            $table->json('brand_colors')->nullable();
            $table->longText('text_content')->nullable();
            $table->string('raw_html_path')->nullable();
            $table->text('error')->nullable();
            $table->string('status')->default('pending');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('website_analyses');
    }
};
