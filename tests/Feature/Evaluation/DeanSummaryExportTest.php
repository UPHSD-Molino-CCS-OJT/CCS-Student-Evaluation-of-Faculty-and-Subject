<?php

use App\Models\ClassSection;
use App\Models\Evaluation;
use App\Models\EvaluationResponse;
use App\Models\Section;
use App\Models\Subject;
use App\Models\User;

function createClassSectionWithEvaluation(): ClassSection
{
    $faculty = User::factory()->create([
        'role' => 'faculty',
        'student_id' => null,
    ]);

    $student = User::factory()->create([
        'role' => 'student',
        'student_id' => '1-1234-567',
    ]);

    $subject = Subject::query()->create([
        'code' => 'CCS320',
        'title' => 'Database Systems',
    ]);

    $section = Section::query()->create([
        'code' => 'BSCS-3A',
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
        'comments' => 'Great course',
        'submitted_at' => now(),
    ]);

    foreach (range(1, 25) as $questionNumber) {
        EvaluationResponse::query()->create([
            'evaluation_id' => $evaluation->id,
            'question_number' => $questionNumber,
            'rating' => 4,
        ]);
    }

    return $classSection;
}

test('dean staff and system admin can export overall summary', function (string $role) {
    createClassSectionWithEvaluation();

    $user = User::factory()->create([
        'role' => $role,
        'student_id' => null,
    ]);

    $response = $this->actingAs($user)->get(route('dean.summaries.export-overall'));

    $response->assertOk();
    $response->assertHeader('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    $response->assertHeader('content-disposition');

    $content = $response->streamedContent();
    expect(substr($content, 0, 2))->toBe('PK');
})->with(['dean', 'staff', 'system_admin']);

test('dean staff and system admin can export class section summary', function (string $role) {
    $classSection = createClassSectionWithEvaluation();

    $user = User::factory()->create([
        'role' => $role,
        'student_id' => null,
    ]);

    $response = $this->actingAs($user)->get(route('dean.summaries.export-class-section', $classSection));

    $response->assertOk();
    $response->assertHeader('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    $response->assertHeader('content-disposition');

    $content = $response->streamedContent();
    expect(substr($content, 0, 2))->toBe('PK');
})->with(['dean', 'staff', 'system_admin']);

test('faculty cannot export dean summaries', function () {
    $classSection = createClassSectionWithEvaluation();

    $faculty = User::factory()->create([
        'role' => 'faculty',
        'student_id' => null,
    ]);

    $overallResponse = $this->actingAs($faculty)->get(route('dean.summaries.export-overall'));
    $overallResponse->assertForbidden();

    $classResponse = $this->actingAs($faculty)->get(route('dean.summaries.export-class-section', $classSection));
    $classResponse->assertForbidden();
});
