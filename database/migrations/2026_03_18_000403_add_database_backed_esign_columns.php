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
        Schema::table('users', function (Blueprint $table) {
            $table->longText('esign_image_data_uri')->nullable()->after('esign_image_path');
        });

        Schema::table('evaluation_report_signoffs', function (Blueprint $table) {
            $table->longText('faculty_signature_data_uri')->nullable()->after('faculty_signature_path');
            $table->longText('dean_signature_data_uri')->nullable()->after('dean_signature_path');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('evaluation_report_signoffs', function (Blueprint $table) {
            $table->dropColumn(['faculty_signature_data_uri', 'dean_signature_data_uri']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('esign_image_data_uri');
        });
    }
};