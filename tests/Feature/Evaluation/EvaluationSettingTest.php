<?php

use App\Models\ClassSection;
use App\Models\Evaluation;
use App\Models\EvaluationSetting;
use App\Models\Section;
use App\Models\StudentSectionEnrollment;
use App\Models\Subject;
use App\Models\User;

test('dean, staff, and system admin can start or stop evaluations', function (string $role) {
    $user = User::factory()->create([
        'role' => $role,
        'student_id' => null,
    ]);

    $response = $this->actingAs($user)->patch(route('evaluation-settings.update'), [
        'is_open' => true,
    ]);

    $response->assertRedirect();
    expect(EvaluationSetting::isOpen())->toBeTrue();

    $this->actingAs($user)->patch(route('evaluation-settings.update'), [
        'is_open' => false,
    ])->assertRedirect();

    expect(EvaluationSetting::isOpen())->toBeFalse();
})->with(['dean', 'staff', 'system_admin']);

test('faculty cannot start or stop evaluations', function () {
    $faculty = User::factory()->create([
        'role' => 'faculty',
        'student_id' => null,
    ]);

    $response = $this->actingAs($faculty)->patch(route('evaluation-settings.update'), [
        'is_open' => true,
    ]);

    $response->assertForbidden();
});

test('student cannot submit evaluation when evaluations are closed', function () {
    EvaluationSetting::query()->create(['is_open' => false]);

    $student = User::factory()->create([
        'role' => 'student',
        'student_id' => '1-9876-543',
    ]);

    $faculty = User::factory()->create([
        'role' => 'faculty',
        'student_id' => null,
    ]);

    $subject = Subject::query()->create([
        'code' => 'CCS360',
        'title' => 'Compiler Design',
    ]);

    $section = Section::query()->create([
        'code' => 'BSCS-3B',
    ]);

    $classSection = ClassSection::query()->create([
        'subject_id' => $subject->id,
        'faculty_id' => $faculty->id,
        'section_id' => $section->id,
        'school_year' => '2025-2026',
        'term' => '2nd Semester',
    ]);

    StudentSectionEnrollment::query()->create([
        'student_id' => $student->id,
        'class_section_id' => $classSection->id,
    ]);

    $responses = [];
    foreach (range(1, 25) as $question) {
        $responses[$question] = 4;
    }

    $response = $this->actingAs($student)->post(route('student.evaluations.store', $classSection), [
        'responses' => $responses,
        'comments' => 'Great class',
    ]);

    $response->assertRedirect(route('student.evaluations.index'));
    $response->assertSessionHas('status', 'Evaluation is currently closed.');
    expect(Evaluation::query()->count())->toBe(0);
});
