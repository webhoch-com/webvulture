<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('website_analyses', function (Blueprint $table) {
            $table->string('logo_path')->nullable()->after('logo_url');
            $table->string('logo_mime', 64)->nullable()->after('logo_path');

            $table->string('primary_color', 16)->nullable()->after('brand_colors');
            $table->string('secondary_color', 16)->nullable()->after('primary_color');
            $table->string('accent_color', 16)->nullable()->after('secondary_color');

            $table->string('heading_font_family')->nullable()->after('accent_color');
            $table->string('body_font_family')->nullable()->after('heading_font_family');
            $table->json('font_imports')->nullable()->after('body_font_family');

            $table->json('hero_images')->nullable()->after('images');
            $table->json('gallery_images')->nullable()->after('hero_images');
            $table->json('downloaded_assets')->nullable()->after('gallery_images');
        });
    }

    public function down(): void
    {
        Schema::table('website_analyses', function (Blueprint $table) {
            $table->dropColumn([
                'logo_path',
                'logo_mime',
                'primary_color',
                'secondary_color',
                'accent_color',
                'heading_font_family',
                'body_font_family',
                'font_imports',
                'hero_images',
                'gallery_images',
                'downloaded_assets',
            ]);
        });
    }
};
