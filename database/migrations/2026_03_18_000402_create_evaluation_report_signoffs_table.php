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
        Schema::create('evaluation_report_signoffs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('class_section_id')->constrained()->cascadeOnDelete();
            $table->foreignId('faculty_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('faculty_signed_at')->nullable();
            $table->string('faculty_signature_path')->nullable();
            $table->foreignId('dean_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('dean_signed_at')->nullable();
            $table->string('dean_signature_path')->nullable();
            $table->timestamps();

            $table->unique('class_section_id');
            $table->index('faculty_signed_at');
            $table->index('dean_signed_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('evaluation_report_signoffs');
    }
};
