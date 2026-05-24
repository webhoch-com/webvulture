<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Persist the scraped navigation links so the generator can mirror the
 * prospect's actual site structure (e.g. "Aktuelles", "Mitgliederbereich",
 * "Sponsoren") instead of always emitting the templates' generic 2-item nav.
 *
 * The extractor already produces a label → URL map; this migration just adds
 * the column. The ScraperService and RebuildPackageBuilder are updated
 * separately to write/read it.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('website_analyses', function (Blueprint $table) {
            $table->json('nav_links')->nullable()->after('socials');
        });
    }

    public function down(): void
    {
        Schema::table('website_analyses', function (Blueprint $table) {
            $table->dropColumn('nav_links');
        });
    }
};
