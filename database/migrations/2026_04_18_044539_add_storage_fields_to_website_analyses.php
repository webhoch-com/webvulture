<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('website_analyses', function (Blueprint $table) {
            $table->string('storage_root')->nullable()->after('raw_html_path');
            $table->timestamp('screenshots_taken_at')->nullable()->after('storage_root');
            $table->json('screenshot_paths')->nullable()->after('screenshots_taken_at');
            $table->string('extracted_json_path')->nullable()->after('screenshot_paths');
            $table->string('rebuild_package_path')->nullable()->after('extracted_json_path');
        });
    }

    public function down(): void
    {
        Schema::table('website_analyses', function (Blueprint $table) {
            $table->dropColumn([
                'storage_root',
                'screenshots_taken_at',
                'screenshot_paths',
                'extracted_json_path',
                'rebuild_package_path',
            ]);
        });
    }
};
