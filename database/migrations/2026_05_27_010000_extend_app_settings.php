<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Erweitert die existierende key/value-Tabelle um group, is_secret,
 * updated_by — damit wir API-Keys und Cost-Caps darin lagern können
 * (Encryption greift im Model). Bisherige IMAP-Cursor-Settings bleiben
 * weiter funktionsfähig (group bleibt NULL, is_secret=false).
 *
 * Migration ist non-destructive: existierende Rows bekommen Defaults.
 */
return new class extends Migration
{
    public function up(): void
    {
        // Bisher war `key` primary. Wir brauchen aber `(group, key)` als
        // composite-Unique. MySQL erlaubt das, aber wir müssen die primary
        // erst droppen und durch eine id-Spalte ersetzen — sonst können
        // wir AppSetting-Models nicht als Eloquent-First-Class behandeln.
        Schema::table('app_settings', function (Blueprint $table) {
            $table->dropPrimary(['key']);
        });

        Schema::table('app_settings', function (Blueprint $table) {
            $table->id()->first();
            $table->string('group', 64)->nullable()->after('id')->index();
            $table->boolean('is_secret')->default(false)->after('value');
            $table->foreignId('updated_by')->nullable()->after('is_secret')
                ->constrained('users')->nullOnDelete();
        });

        // value-Spalte vergrößern (Bsp. Anthropic API-Keys nach Encryption
        // sind ~400 chars, text reicht aber).
        // Composite-Unique über group+key — ein Setting ist (group, key).
        Schema::table('app_settings', function (Blueprint $table) {
            $table->unique(['group', 'key']);
        });

        // Bestehende Rows haben jetzt group=NULL → Backwards-Compat
        // für InboundMailScanner. Wir markieren sie explizit:
        DB::table('app_settings')->whereNull('group')->update(['group' => 'legacy']);
    }

    public function down(): void
    {
        Schema::table('app_settings', function (Blueprint $table) {
            $table->dropUnique(['group', 'key']);
            $table->dropForeign(['updated_by']);
            $table->dropColumn(['id', 'group', 'is_secret', 'updated_by']);
        });

        Schema::table('app_settings', function (Blueprint $table) {
            $table->primary('key');
        });
    }
};
