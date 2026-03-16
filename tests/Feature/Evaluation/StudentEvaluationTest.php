<?php

use App\Models\ClassSection;
use App\Models\Section;
use App\Models\StudentSectionEnrollment;
use App\Models\Subject;
use App\Models\User;

test('student can view evaluation dashboard', function () {
    $student = User::factory()->create([
        'role' => 'student',
        'student_id' => '1-2345-678',
    ]);

    $faculty = User::factory()->create([
        'role' => 'faculty',
        'student_id' => null,
    ]);

    $subject = Subject::create([
        'code' => 'CCS350',
        'title' => 'Software Engineering',
    ]);

    $section = Section::create([
        'code' => 'BSCS-3A',
    ]);

    $classSection = ClassSection::create([
        'subject_id' => $subject->id,
        'faculty_id' => $faculty->id,
        'section_id' => $section->id,
        'school_year' => '2025-2026',
        'term' => '2nd Semester',
    ]);

    StudentSectionEnrollment::create([
        'student_id' => $student->id,
        'class_section_id' => $classSection->id,
    ]);

    $response = $this->actingAs($student)->get(route('student.evaluations.index'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page->component('student/evaluations/index'));
});

test('faculty cannot access student evaluation routes', function () {
    $faculty = User::factory()->create([
        'role' => 'faculty',
        'student_id' => null,
    ]);

    $response = $this->actingAs($faculty)->get(route('student.evaluations.index'));

    $response->assertForbidden();
});
