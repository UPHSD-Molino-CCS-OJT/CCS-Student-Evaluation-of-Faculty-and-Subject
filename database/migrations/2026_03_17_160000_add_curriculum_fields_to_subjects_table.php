<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('subjects', function (Blueprint $table) {
            $table->dropUnique('subjects_code_unique');

            $table->string('semester_offered', 100)->nullable()->after('title');
            $table->string('program', 100)->nullable()->after('semester_offered');
            $table->string('curriculum_version', 100)->nullable()->after('program');

            $table->unique(
                ['code', 'semester_offered', 'program', 'curriculum_version'],
                'subjects_import_unique'
            );
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('subjects', function (Blueprint $table) {
            $table->dropUnique('subjects_import_unique');
            $table->dropColumn(['semester_offered', 'program', 'curriculum_version']);

            $table->unique('code');
        });
    }
};
