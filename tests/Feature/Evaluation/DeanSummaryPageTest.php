<?php

use App\Models\ClassSection;
use App\Models\Evaluation;
use App\Models\EvaluationResponse;
use App\Models\Section;
use App\Models\Subject;
use App\Models\User;

beforeEach(function () {
    $this->withoutVite();
});

test('dean summary respondents counts submitted evaluations only', function () {
    $dean = User::factory()->create([
        'role' => 'dean',
        'student_id' => null,
    ]);

    $faculty = User::factory()->create([
        'role' => 'faculty',
        'student_id' => null,
    ]);

    $student = User::factory()->create([
        'role' => 'student',
        'student_id' => '1-5678-901',
    ]);

    $subject = Subject::query()->create([
        'code' => 'CCS430',
        'title' => 'Capstone Project 2',
    ]);

    $section = Section::query()->create([
        'code' => 'BSCS-4C',
    ]);

    $classSection = ClassSection::query()->create([
        'subject_id' => $subject->id,
        'faculty_id' => $faculty->id,
        'section_id' => $section->id,
        'school_year' => '2025-2026',
        'term' => '2nd Semester',
    ]);

    $evaluation = Evaluation::query()->create([
        'student_id' => $student->id,
        'class_section_id' => $classSection->id,
        'submitted_at' => now(),
    ]);

    foreach (range(1, 25) as $questionNumber) {
        EvaluationResponse::query()->create([
            'evaluation_id' => $evaluation->id,
            'question_number' => $questionNumber,
            'rating' => 5,
        ]);
    }

    $response = $this->actingAs($dean)->get(route('dean.summaries.index'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('dean/summaries/index')
        ->where('rows.0.respondents', 1)
    );
});
