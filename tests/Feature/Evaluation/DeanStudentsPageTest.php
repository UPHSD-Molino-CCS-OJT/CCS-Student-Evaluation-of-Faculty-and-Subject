<?php

use App\Models\ClassSection;
use App\Models\Section;
use App\Models\StudentSectionEnrollment;
use App\Models\Subject;
use App\Models\User;

beforeEach(function () {
    $this->withoutVite();
});

test('dean, staff, and system admin can view students page', function (string $role) {
    $user = User::factory()->create([
        'role' => $role,
        'student_id' => null,
    ]);

    $response = $this->actingAs($user)->get(route('dean.students.index'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page->component('dean/students/index'));
})->with(['dean', 'staff', 'system_admin']);

test('student and faculty cannot view students page', function (string $role) {
    $user = User::factory()->create([
        'role' => $role,
        'student_id' => $role === 'student' ? '1-2222-333' : null,
    ]);

    $response = $this->actingAs($user)->get(route('dean.students.index'));

    $response->assertForbidden();
})->with(['student', 'faculty']);

test('students page shows active and inactive status with program and year level', function () {
    $admin = User::factory()->create([
        'role' => 'dean',
        'student_id' => null,
    ]);

    $activeStudent = User::factory()->create([
        'role' => 'student',
        'student_id' => '1-1111-111',
        'name' => 'Active Student',
    ]);

    $inactiveStudent = User::factory()->create([
        'role' => 'student',
        'student_id' => '1-1111-222',
        'name' => 'Inactive Student',
    ]);

    $subject = Subject::query()->create([
        'code' => 'CCS101',
        'title' => 'Introduction to Computing',
        'semester_offered' => '1st Semester',
        'program' => 'BSCS',
        'curriculum_version' => '2023-2024',
    ]);

    $faculty = User::factory()->create([
        'role' => 'faculty',
        'student_id' => null,
    ]);

    $section = Section::query()->create([
        'code' => 'BSCS-2A',
    ]);

    $classSection = ClassSection::query()->create([
        'subject_id' => $subject->id,
        'faculty_id' => $faculty->id,
        'section_id' => $section->id,
        'school_year' => '2025-2026',
        'term' => '1st Semester',
    ]);

    StudentSectionEnrollment::query()->create([
        'student_id' => $activeStudent->id,
        'class_section_id' => $classSection->id,
    ]);

    $response = $this->actingAs($admin)->get(route('dean.students.index'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('dean/students/index')
        ->where('students.0.name', 'Active Student')
        ->where('students.0.program', 'BSCS')
        ->where('students.0.yearLevel', 2)
        ->where('students.0.status', 'Active')
        ->where('students.1.name', 'Inactive Student')
        ->where('students.1.status', 'Inactive')
    );
});

test('dean, staff, and system admin can update student profile from students page', function (string $role) {
    $admin = User::factory()->create([
        'role' => $role,
        'student_id' => null,
    ]);

    $student = User::factory()->create([
        'role' => 'student',
        'name' => 'Old Student Name',
        'student_id' => '1-1111-333',
        'course_program' => 'BSIT',
        'year_level' => 1,
        'student_type' => 'regular',
    ]);

    $response = $this->actingAs($admin)->patch(route('dean.students.update', $student), [
        'name' => 'Updated Student Name',
        'student_id' => '1-1111-444',
        'course_program' => 'BSCS',
        'year_level' => 3,
        'student_type' => 'irregular',
    ]);

    $response->assertRedirect();
    $response->assertSessionHasNoErrors();

    $student->refresh();

    expect($student->name)->toBe('Updated Student Name');
    expect($student->student_id)->toBe('1-1111-444');
    expect($student->course_program)->toBe('BSCS');
    expect($student->year_level)->toBe(3);
    expect($student->student_type)->toBe('irregular');
})->with(['dean', 'staff', 'system_admin']);

test('student and faculty cannot update student profile from students page', function (string $role) {
    $actor = User::factory()->create([
        'role' => $role,
        'student_id' => $role === 'student' ? '1-2222-333' : null,
    ]);

    $student = User::factory()->create([
        'role' => 'student',
        'student_id' => '1-1111-555',
    ]);

    $response = $this->actingAs($actor)->patch(route('dean.students.update', $student), [
        'name' => 'Unauthorized Update',
    ]);

    $response->assertForbidden();
})->with(['student', 'faculty']);

test('students page marks student as active when registration profile is complete even without enrollment', function () {
    $admin = User::factory()->create([
        'role' => 'dean',
        'student_id' => null,
    ]);

    User::factory()->create([
        'role' => 'student',
        'name' => 'Profile Activated Student',
        'student_id' => '1-7777-111',
        'course_program' => 'BSCS',
        'year_level' => 4,
        'student_type' => 'regular',
    ]);

    $response = $this->actingAs($admin)->get(route('dean.students.index'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('dean/students/index')
        ->where('students.0.name', 'Profile Activated Student')
        ->where('students.0.status', 'Active')
    );
});
