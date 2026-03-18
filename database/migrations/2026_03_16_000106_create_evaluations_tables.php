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
        Schema::create('evaluations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('class_section_id')->constrained()->cascadeOnDelete();
            $table->text('comments')->nullable();
            $table->timestamp('submitted_at');
            $table->timestamps();

            $table->unique(['student_id', 'class_section_id']);
        });

        Schema::create('evaluation_responses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('evaluation_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('question_number');
            $table->unsignedTinyInteger('rating');
            $table->timestamps();

            $table->unique(['evaluation_id', 'question_number']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('evaluation_responses');
        Schema::dropIfExists('evaluations');
    }
};
