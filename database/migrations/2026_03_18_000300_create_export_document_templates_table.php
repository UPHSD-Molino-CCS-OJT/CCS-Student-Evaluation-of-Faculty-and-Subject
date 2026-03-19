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
        Schema::create('export_document_templates', function (Blueprint $table) {
            $table->id();
            $table->text('header_html')->nullable();
            $table->text('footer_html')->nullable();
            $table->text('header_text')->nullable();
            $table->text('footer_text')->nullable();
            $table->string('source_filename')->nullable();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('export_document_templates');
    }
};
