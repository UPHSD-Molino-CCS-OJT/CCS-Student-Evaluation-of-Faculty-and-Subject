<?php

use App\Models\Subject;
use App\Models\User;

beforeEach(function () {
    $this->withoutVite();
});

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

test('authorized user can remove an entire program and all its courses', function () {
    $user = User::factory()->create([
        'role' => 'dean',
        'student_id' => null,
    ]);

    Subject::query()->create([
        'code' => 'CCS101',
        'title' => 'Introduction to Computing',
        'semester_offered' => '1st Semester',
        'program' => 'BSCS',
        'curriculum_version' => '2023-2024',
    ]);

    Subject::query()->create([
        'code' => 'CCS102',
        'title' => 'Computer Programming 1',
        'semester_offered' => '1st Semester',
        'program' => 'BSCS',
        'curriculum_version' => '2023-2024',
    ]);

    Subject::query()->create([
        'code' => 'IT101',
        'title' => 'Fundamentals of IT',
        'semester_offered' => '1st Semester',
        'program' => 'BSIT',
        'curriculum_version' => '2023-2024',
    ]);

    $response = $this->actingAs($user)->delete(route('dean.program-courses.destroy-program'), [
        'program' => 'BSCS',
    ]);

    $response->assertRedirect();
    $response->assertSessionHas('status', 'Program and its courses removed successfully.');

    $this->assertDatabaseMissing('subjects', [
        'code' => 'CCS101',
        'program' => 'BSCS',
    ]);

    $this->assertDatabaseMissing('subjects', [
        'code' => 'CCS102',
        'program' => 'BSCS',
    ]);

    $this->assertDatabaseHas('subjects', [
        'code' => 'IT101',
        'program' => 'BSIT',
    ]);
});

test('authorized user can create course with year level', function () {
    $user = User::factory()->create([
        'role' => 'dean',
        'student_id' => null,
    ]);

    $response = $this->actingAs($user)->post(route('dean.program-courses.store'), [
        'code' => 'CCS201',
        'title' => 'Object-Oriented Programming',
        'program' => 'BSCS',
        'curriculum_version' => '2024',
        'semester_offered' => '2nd Semester',
        'year_level' => 2,
    ]);

    $response->assertRedirect();
    $response->assertSessionHas('status', 'Course created successfully.');

    $this->assertDatabaseHas('subjects', [
        'code' => 'CCS201',
        'program' => 'BSCS',
        'curriculum_version' => '2024',
        'semester_offered' => '2nd Semester',
        'year_level' => 2,
    ]);
});
