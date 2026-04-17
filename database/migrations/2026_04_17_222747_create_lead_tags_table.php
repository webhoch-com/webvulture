<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lead_tags', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lead_id')->constrained()->cascadeOnDelete();
            $table->string('tag');
            $table->timestamps();

            $table->unique(['lead_id', 'tag']);
            $table->index('tag');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lead_tags');
    }
};
