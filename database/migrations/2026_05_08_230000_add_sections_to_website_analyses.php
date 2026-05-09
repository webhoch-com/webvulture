<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('website_analyses', function (Blueprint $table) {
            $table->json('sections')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('website_analyses', function (Blueprint $table) {
            $table->dropColumn('sections');
        });
    }
};
