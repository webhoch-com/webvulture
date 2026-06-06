<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds a `logo_color` column to website_analyses for the dominant non-neutral
 * colour extracted from the scraped logo (via LogoColorExtractor). Templates
 * use it as the per-demo accent so each Bauunternehmen page reads as branded
 * to its company instead of falling back on a generic accent.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('website_analyses', function (Blueprint $table) {
            $table->string('logo_color', 9)->nullable()->after('logo_mime');
        });
    }

    public function down(): void
    {
        Schema::table('website_analyses', function (Blueprint $table) {
            $table->dropColumn('logo_color');
        });
    }
};
