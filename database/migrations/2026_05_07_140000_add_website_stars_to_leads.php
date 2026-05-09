<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->decimal('website_stars', 2, 1)->nullable()->after('quality_score');
            $table->index(['status', 'website_stars']);
        });
    }

    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->dropIndex(['status', 'website_stars']);
            $table->dropColumn('website_stars');
        });
    }
};
