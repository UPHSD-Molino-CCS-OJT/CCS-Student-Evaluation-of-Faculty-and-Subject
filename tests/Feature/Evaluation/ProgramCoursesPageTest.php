<?php

use App\Models\Subject;
use App\Models\User;

test('dean, staff, and system admin can view courses per program page', function (string $role) {
    $user = User::factory()->create([
        'role' => $role,
        'student_id' => null,
    ]);

    Subject::query()->create([
        'code' => 'CCS101',
        'title' => 'Introduction to Computing',
        'semester_offered' => '1st Semester',
        'program' => 'BSCS',
        'curriculum_version' => '2023-2024',
    ]);

    $response = $this->actingAs($user)->get(route('dean.program-courses.index'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page->component('dean/program-courses/index'));
})->with(['dean', 'staff', 'system_admin']);

test('student cannot view courses per program page', function () {
    $user = User::factory()->create([
        'role' => 'student',
        'student_id' => '1-1111-111',
    ]);

    $response = $this->actingAs($user)->get(route('dean.program-courses.index'));

    $response->assertForbidden();
});
