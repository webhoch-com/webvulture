<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('outreach_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lead_id')->constrained()->cascadeOnDelete();
            $table->string('channel', 16)->default('email');           // email|whatsapp|manual
            $table->string('kind', 16)->default('initial');            // initial|followup|custom
            $table->string('subject');
            $table->text('body');
            $table->string('to_email');
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('replied_at')->nullable();
            $table->string('status', 16)->default('queued');           // queued|sent|failed|bounced
            $table->text('error')->nullable();
            $table->string('message_id')->nullable();                  // SMTP Message-ID for thread tracking
            $table->timestamps();

            $table->index(['lead_id', 'kind']);
            $table->index(['sent_at', 'replied_at']);
        });

        Schema::table('leads', function (Blueprint $table) {
            $table->timestamp('last_outreach_at')->nullable()->after('website_stars');
            $table->timestamp('awaiting_response_since')->nullable()->after('last_outreach_at');
            $table->timestamp('replied_at')->nullable()->after('awaiting_response_since');
            $table->index('awaiting_response_since');
        });
    }

    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->dropIndex(['awaiting_response_since']);
            $table->dropColumn(['last_outreach_at', 'awaiting_response_since', 'replied_at']);
        });
        Schema::dropIfExists('outreach_messages');
    }
};
