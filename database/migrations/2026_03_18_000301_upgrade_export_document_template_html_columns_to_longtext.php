<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'mysql') {
            DB::statement('ALTER TABLE export_document_templates MODIFY header_html LONGTEXT NULL');
            DB::statement('ALTER TABLE export_document_templates MODIFY footer_html LONGTEXT NULL');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'mysql') {
            DB::statement('ALTER TABLE export_document_templates MODIFY header_html TEXT NULL');
            DB::statement('ALTER TABLE export_document_templates MODIFY footer_html TEXT NULL');
        }
    }
};
