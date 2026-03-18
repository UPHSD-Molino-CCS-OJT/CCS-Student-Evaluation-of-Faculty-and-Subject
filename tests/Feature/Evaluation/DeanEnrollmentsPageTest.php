<?php

use App\Models\Subject;
use App\Models\User;

test('dean, staff, and system admin can view enrollments page', function (string $role) {
    $user = User::factory()->create([
        'role' => $role,
        'student_id' => null,
    ]);

    $response = $this->actingAs($user)->get(route('dean.enrollments.index'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page->component('dean/enrollments/index'));
})->with(['dean', 'staff', 'system_admin']);

test('student and faculty cannot view enrollments page', function (string $role) {
    $user = User::factory()->create([
        'role' => $role,
        'student_id' => $role === 'student' ? '1-2222-333' : null,
    ]);

    $response = $this->actingAs($user)->get(route('dean.enrollments.index'));

    $response->assertForbidden();
})->with(['student', 'faculty']);

test('authorized user can enroll student with semester, school year, and section details', function () {
    $admin = User::factory()->create([
        'role' => 'dean',
        'student_id' => null,
    ]);

    $student = User::factory()->create([
        'role' => 'student',
        'student_id' => '1-1111-111',
    ]);

    $faculty = User::factory()->create([
        'role' => 'faculty',
        'student_id' => null,
    ]);

    $subject = Subject::query()->create([
        'code' => 'CCS101',
        'title' => 'Introduction to Computing',
        'semester_offered' => '1st Semester',
        'program' => 'BSCS',
        'curriculum_version' => '2023-2024',
    ]);

    $response = $this->actingAs($admin)->post(route('dean.enrollments.store'), [
        'student_id' => $student->id,
        'subject_id' => $subject->id,
        'faculty_id' => $faculty->id,
        'section_code' => 'BSCS-2A',
        'term' => '1st Semester',
        'school_year' => '2025-2026',
    ]);

    $response->assertRedirect();
    $response->assertSessionHas('status', 'Student enrolled successfully.');

    $this->assertDatabaseHas('sections', [
        'code' => 'BSCS-2A',
    ]);

    $this->assertDatabaseHas('class_sections', [
        'subject_id' => $subject->id,
        'faculty_id' => $faculty->id,
        'school_year' => '2025-2026',
        'term' => '1st Semester',
    ]);

    $this->assertDatabaseCount('student_section_enrollments', 1);
});
