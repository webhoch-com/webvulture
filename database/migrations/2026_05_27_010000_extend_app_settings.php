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
        // SQLite can't `dropPrimary` + add an `id()->first()` + add foreign
        // constraints in successive ALTER TABLE statements. For the test DB
        // (SQLite in-memory via phpunit) we recreate the table from scratch;
        // the existing rows of `legacy` group are reinserted afterwards.
        // MySQL takes the additive path (preserves real data on prod).
        if (DB::connection()->getDriverName() === 'sqlite') {
            $existing = DB::table('app_settings')->get();
            Schema::drop('app_settings');
            Schema::create('app_settings', function (Blueprint $table) {
                $table->id();
                $table->string('group', 64)->nullable()->index();
                $table->string('key');
                $table->text('value')->nullable();
                $table->boolean('is_secret')->default(false);
                $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
                $table->unique(['group', 'key']);
            });
            foreach ($existing as $row) {
                DB::table('app_settings')->insert([
                    'group' => 'legacy',
                    'key' => $row->key,
                    'value' => $row->value ?? null,
                    'is_secret' => false,
                    'updated_by' => null,
                    'created_at' => $row->created_at ?? now(),
                    'updated_at' => $row->updated_at ?? now(),
                ]);
            }

            return;
        }

        // MySQL path — preserves data via additive ALTER TABLE.
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
