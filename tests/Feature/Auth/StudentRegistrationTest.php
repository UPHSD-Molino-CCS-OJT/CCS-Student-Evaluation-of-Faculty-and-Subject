<?php

use App\Models\ClassSection;
use App\Models\Section;
use App\Models\StudentSectionEnrollment;
use App\Models\Subject;
use App\Models\User;

beforeEach(function () {
    $this->withoutVite();
});

function createSubjectOffering(string $program, string $code, string $title): ClassSection
{
    $faculty = User::factory()->create([
        'role' => 'faculty',
        'student_id' => null,
    ]);

    $subject = Subject::query()->create([
        'code' => $code,
        'title' => $title,
        'semester_offered' => '1st Semester',
        'program' => $program,
        'curriculum_version' => '2024',
    ]);

    $section = Section::query()->create([
        'code' => $code.'-SEC',
    ]);

    return ClassSection::query()->create([
        'subject_id' => $subject->id,
        'faculty_id' => $faculty->id,
        'section_id' => $section->id,
        'school_year' => '2025-2026',
        'term' => '1st Semester',
    ]);
}

function createSubjectWithoutOffering(string $program, string $code, string $title): Subject
{
    return Subject::query()->create([
        'code' => $code,
        'title' => $title,
        'semester_offered' => '1st Semester',
        'program' => $program,
        'curriculum_version' => '2024',
    ]);
}

test('student registration screen loads with course and subject options', function () {
    createSubjectWithoutOffering('BSCS', 'CCS101', 'Intro to Computing');
    createSubjectOffering('BSIT', 'IT101', 'Fundamentals of IT');

    $response = $this->get(route('student.register'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('auth/student-register')
        ->where('courses', ['BSCS', 'BSIT'])
        ->where('yearLevels', [1, 2, 3, 4, 5])
        ->has('subjects', 2));
});

test('regular students can register and are auto-enrolled to available subjects in their selected course', function () {
    $classSectionOne = createSubjectOffering('BSCS', 'CCS101', 'Intro to Computing');
    $classSectionTwo = createSubjectOffering('BSCS', 'CCS210', 'Data Structures');
    createSubjectOffering('BSIT', 'IT101', 'Fundamentals of IT');

    $response = $this->post(route('student.register.store'), [
        'name' => 'Regular Student',
        'email' => 'regular.student@example.com',
        'student_id' => '01-1234-567',
        'course_program' => 'BSCS',
        'year_level' => 2,
        'student_type' => 'regular',
    ]);

    $response->assertRedirect(route('dashboard', absolute: false));
    $this->assertAuthenticated();

    $student = User::query()->where('email', 'regular.student@example.com')->firstOrFail();

    expect($student->role)->toBe('student')
        ->and($student->student_id)->toBe('1-1234-567')
        ->and($student->course_program)->toBe('BSCS')
        ->and($student->year_level)->toBe(2)
        ->and($student->student_type)->toBe('regular');

    expect(StudentSectionEnrollment::query()->where('student_id', $student->id)->count())->toBe(2);

    $this->assertDatabaseHas('student_section_enrollments', [
        'student_id' => $student->id,
        'class_section_id' => $classSectionOne->id,
    ]);

    $this->assertDatabaseHas('student_section_enrollments', [
        'student_id' => $student->id,
        'class_section_id' => $classSectionTwo->id,
    ]);
});

test('irregular students must choose subjects and are enrolled only in selected subjects', function () {
    $selectedClass = createSubjectOffering('BSCS', 'CCS301', 'Networks');
    $otherClass = createSubjectOffering('BSCS', 'CCS302', 'Operating Systems');

    $invalidResponse = $this->from(route('student.register'))->post(route('student.register.store'), [
        'name' => 'Irregular Student',
        'email' => 'irregular.no.subjects@example.com',
        'student_id' => '1-5555-111',
        'course_program' => 'BSCS',
        'year_level' => 3,
        'student_type' => 'irregular',
    ]);

    $invalidResponse->assertRedirect(route('student.register'));
    $invalidResponse->assertSessionHasErrors('subject_ids');
    $this->assertGuest();

    $response = $this->post(route('student.register.store'), [
        'name' => 'Irregular Student',
        'email' => 'irregular.student@example.com',
        'student_id' => '1-5555-222',
        'course_program' => 'BSCS',
        'year_level' => 3,
        'student_type' => 'irregular',
        'subject_ids' => [$selectedClass->subject_id],
    ]);

    $response->assertRedirect(route('dashboard', absolute: false));
    $this->assertAuthenticated();

    $student = User::query()->where('email', 'irregular.student@example.com')->firstOrFail();

    expect(StudentSectionEnrollment::query()->where('student_id', $student->id)->count())->toBe(1)
        ->and($student->year_level)->toBe(3)
        ->and($student->student_type)->toBe('irregular');

    $this->assertDatabaseHas('student_section_enrollments', [
        'student_id' => $student->id,
        'class_section_id' => $selectedClass->id,
    ]);

    $this->assertDatabaseMissing('student_section_enrollments', [
        'student_id' => $student->id,
        'class_section_id' => $otherClass->id,
    ]);
});
