<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('prototypes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lead_id')->constrained()->cascadeOnDelete();
            $table->string('slug')->unique();
            $table->string('template_family')->default('studio');
            $table->string('status')->default('new');
            // current_version_id set after first version created
            $table->unsignedBigInteger('current_version_id')->nullable();
            $table->timestamps();

            $table->index('lead_id');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('prototypes');
    }
};
