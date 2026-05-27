<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // 'admin' kann alles (settings, user-management, alle leads).
            // 'member' kann leads bearbeiten + outreach senden, aber keine
            // settings ändern oder andere User anlegen.
            $table->string('role', 16)->default('member')->after('email');
            $table->boolean('is_active')->default(true)->after('role');
        });

        // Existierende User (vor diesem Patch) bekommen automatisch admin.
        DB::table('users')->update(['role' => 'admin']);
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['role', 'is_active']);
        });
    }
};
