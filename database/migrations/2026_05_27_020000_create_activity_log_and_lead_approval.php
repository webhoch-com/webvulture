<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ─── activity_log ─────────────────────────────────────────────────
        // Generischer Audit-Trail. Jede manuell-getriggerte Action (Scrape,
        // Enrich, Generate, Approve, Outreach, Status-Change) bekommt eine
        // Row. Polymorph an `subject` (Lead, Prototype, …).
        Schema::create('activity_log', function (Blueprint $table) {
            $table->id();
            $table->string('subject_type');
            $table->unsignedBigInteger('subject_id');
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action', 64);  // z.B. "lead.scraped", "prototype.approved"
            $table->string('description')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->index(['subject_type', 'subject_id', 'created_at']);
            $table->index('action');
        });

        // ─── leads.approved_at + approved_by ──────────────────────────────
        // Status "approved" existiert schon im Enum aber wurde nie via UI
        // gesetzt. Mit diesen zwei Spalten können wir den Workflow-Switch
        // tracken (wann + von wem).
        Schema::table('leads', function (Blueprint $table) {
            $table->timestamp('approved_at')->nullable()->after('status');
            $table->foreignId('approved_by')->nullable()->after('approved_at')
                ->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->dropForeign(['approved_by']);
            $table->dropColumn(['approved_at', 'approved_by']);
        });
        Schema::dropIfExists('activity_log');
    }
};
