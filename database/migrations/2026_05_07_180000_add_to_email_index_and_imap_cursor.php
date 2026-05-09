<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('outreach_messages', function (Blueprint $table) {
            $table->index('to_email');                    // speeds up inbound reply matching
            $table->string('in_reply_to_id')->nullable()->after('message_id'); // captured Message-ID for thread match
            $table->index('in_reply_to_id');
        });

        // Lightweight key-value table for cursors and IMAP state that must survive cache eviction.
        Schema::create('app_settings', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->text('value')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::table('outreach_messages', function (Blueprint $table) {
            $table->dropIndex(['to_email']);
            $table->dropIndex(['in_reply_to_id']);
            $table->dropColumn('in_reply_to_id');
        });
        Schema::dropIfExists('app_settings');
    }
};
