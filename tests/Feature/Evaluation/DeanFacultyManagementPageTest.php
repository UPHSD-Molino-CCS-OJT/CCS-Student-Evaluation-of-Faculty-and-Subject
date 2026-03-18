<?php

use App\Models\Subject;
use App\Models\User;

test('dean, staff, and system admin can view faculty management page', function (string $role) {
    $user = User::factory()->create([
        'role' => $role,
        'student_id' => null,
    ]);

    $response = $this->actingAs($user)->get(route('dean.faculty-management.index'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page->component('dean/faculty-management/index'));
})->with(['dean', 'staff', 'system_admin']);

test('student and faculty cannot view faculty management page', function (string $role) {
    $user = User::factory()->create([
        'role' => $role,
        'student_id' => $role === 'student' ? '1-2222-333' : null,
    ]);

    $response = $this->actingAs($user)->get(route('dean.faculty-management.index'));

    $response->assertForbidden();
})->with(['student', 'faculty']);

test('authorized user can assign faculty to subject section term and school year', function () {
    $admin = User::factory()->create([
        'role' => 'dean',
        'student_id' => null,
    ]);

    $faculty = User::factory()->create([
        'role' => 'faculty',
        'student_id' => null,
    ]);

    $subject = Subject::query()->create([
        'code' => 'CCS210',
        'title' => 'Data Structures and Algorithms',
        'semester_offered' => '2nd Semester',
        'program' => 'BSCS',
        'curriculum_version' => '2023-2024',
    ]);

    $response = $this->actingAs($admin)->post(route('dean.faculty-management.store'), [
        'faculty_id' => $faculty->id,
        'subject_id' => $subject->id,
        'section_code' => 'BSCS-2B',
        'term' => '2nd Semester',
        'school_year' => '2025-2026',
    ]);

    $response->assertRedirect();
    $response->assertSessionHas('status', 'Faculty assignment saved successfully.');

    $this->assertDatabaseHas('sections', [
        'code' => 'BSCS-2B',
    ]);

    $this->assertDatabaseHas('class_sections', [
        'subject_id' => $subject->id,
        'faculty_id' => $faculty->id,
        'term' => '2nd Semester',
        'school_year' => '2025-2026',
    ]);
});
