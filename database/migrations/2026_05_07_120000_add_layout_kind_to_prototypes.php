<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('prototypes', function (Blueprint $table) {
            $table->string('layout_kind', 32)->default('standard')->after('template_family');
            $table->index('layout_kind');
        });
    }

    public function down(): void
    {
        Schema::table('prototypes', function (Blueprint $table) {
            $table->dropIndex(['layout_kind']);
            $table->dropColumn('layout_kind');
        });
    }
};
