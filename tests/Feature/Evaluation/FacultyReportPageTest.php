<?php

use App\Models\ClassSection;
use App\Models\Evaluation;
use App\Models\EvaluationResponse;
use App\Models\Section;
use App\Models\Subject;
use App\Models\User;

test('faculty can view faculty reports page', function () {
    $this->withoutVite();

    $faculty = User::factory()->create([
        'role' => 'faculty',
        'student_id' => null,
    ]);

    $subject = Subject::query()->create([
        'code' => 'CCS321',
        'title' => 'Database Administration',
    ]);

    $section = Section::query()->create([
        'code' => 'BSCS-3B',
    ]);

    ClassSection::query()->create([
        'subject_id' => $subject->id,
        'faculty_id' => $faculty->id,
        'section_id' => $section->id,
        'school_year' => '2025-2026',
        'term' => '2nd Semester',
    ]);

    $response = $this->actingAs($faculty)->get(route('faculty.reports.index'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page->component('faculty/reports/index'));
});

test('non faculty users cannot view faculty reports page', function () {
    $dean = User::factory()->create([
        'role' => 'dean',
        'student_id' => null,
    ]);

    $response = $this->actingAs($dean)->get(route('faculty.reports.index'));

    $response->assertForbidden();
});

test('faculty report respondents counts submitted evaluations only', function () {
    $this->withoutVite();

    $faculty = User::factory()->create([
        'role' => 'faculty',
        'student_id' => null,
    ]);

    $student = User::factory()->create([
        'role' => 'student',
        'student_id' => '1-4567-890',
    ]);

    $subject = Subject::query()->create([
        'code' => 'CCS410',
        'title' => 'Software Engineering',
    ]);

    $section = Section::query()->create([
        'code' => 'BSCS-4B',
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
            'rating' => 4,
        ]);
    }

    $response = $this->actingAs($faculty)->get(route('faculty.reports.index'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('faculty/reports/index')
        ->where('rows.0.respondents', 1)
    );
});
