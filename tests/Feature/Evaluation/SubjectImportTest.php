<?php

use App\Models\Subject;
use App\Models\User;
use Illuminate\Http\UploadedFile;

test('dean, staff, and system admin can download subject import template', function (string $role) {
    $user = User::factory()->create([
        'role' => $role,
        'student_id' => null,
    ]);

    $response = $this->actingAs($user)->get(route('dean.subjects.import-template'));

    $response->assertOk();
    $response->assertHeader('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    $response->assertHeader('content-disposition', 'attachment; filename=subjects-import-template.xlsx');

    $content = $response->streamedContent();
    expect(substr($content, 0, 2))->toBe('PK');
})->with(['dean', 'staff', 'system_admin']);

test('dean, staff, and system admin can import subjects from csv', function (string $role) {
    $user = User::factory()->create([
        'role' => $role,
        'student_id' => null,
    ]);

    $csv = <<<CSV
semester_offered,subject_code,course_name,program,curriculum_version
1st Semester,CCS101,Introduction to Computing,BSCS,2023-2024
2nd Semester,CCS210,Data Structures and Algorithms,BSCS,2023-2024
CSV;

    $file = UploadedFile::fake()->createWithContent('subjects.csv', $csv);

    $response = $this->actingAs($user)->post(route('dean.subjects.import'), [
        'file' => $file,
    ]);

    $response->assertRedirect();
    $response->assertSessionHas('status', 'Subjects imported successfully.');

    $this->assertDatabaseHas('subjects', [
        'code' => 'CCS101',
        'title' => 'Introduction to Computing',
        'semester_offered' => '1st Semester',
        'program' => 'BSCS',
        'curriculum_version' => '2023-2024',
    ]);

    $this->assertDatabaseHas('subjects', [
        'code' => 'CCS210',
        'title' => 'Data Structures and Algorithms',
        'semester_offered' => '2nd Semester',
        'program' => 'BSCS',
        'curriculum_version' => '2023-2024',
    ]);
})->with(['dean', 'staff', 'system_admin']);

test('import updates existing subject record for same code semester program and curriculum version', function () {
    $user = User::factory()->create([
        'role' => 'dean',
        'student_id' => null,
    ]);

    Subject::query()->create([
        'code' => 'CCS101',
        'title' => 'Old Course Name',
        'semester_offered' => '1st Semester',
        'program' => 'BSCS',
        'curriculum_version' => '2023-2024',
    ]);

    $csv = <<<CSV
semester_offered,subject_code,course_name,program,curriculum_version
1st Semester,CCS101,Introduction to Computing,BSCS,2023-2024 Curriculum
CSV;

    $file = UploadedFile::fake()->createWithContent('subjects.csv', $csv);

    $this->actingAs($user)->post(route('dean.subjects.import'), [
        'file' => $file,
    ])->assertRedirect();

    $this->assertDatabaseHas('subjects', [
        'code' => 'CCS101',
        'title' => 'Introduction to Computing',
        'semester_offered' => '1st Semester',
        'program' => 'BSCS',
        'curriculum_version' => '2023-2024',
    ]);

    expect(Subject::query()->where('code', 'CCS101')->count())->toBe(1);
});

test('faculty cannot import subjects', function () {
    $user = User::factory()->create([
        'role' => 'faculty',
        'student_id' => null,
    ]);

    $csv = <<<CSV
semester_offered,subject_code,course_name,program,curriculum_version
1st Semester,CCS101,Introduction to Computing,BSCS,2023-2024
CSV;

    $file = UploadedFile::fake()->createWithContent('subjects.csv', $csv);

    $response = $this->actingAs($user)->post(route('dean.subjects.import'), [
        'file' => $file,
    ]);

    $response->assertForbidden();
});

test('import supports summer values', function () {
    $user = User::factory()->create([
        'role' => 'dean',
        'student_id' => null,
    ]);

    $csv = <<<CSV
semester_offered,subject_code,course_name,program,curriculum_version
summer,CCS398,Practicum,BSCS,2023-2024
CSV;

    $file = UploadedFile::fake()->createWithContent('subjects.csv', $csv);

    $this->actingAs($user)->post(route('dean.subjects.import'), [
        'file' => $file,
    ])->assertRedirect();

    $this->assertDatabaseHas('subjects', [
        'code' => 'CCS398',
        'title' => 'Practicum',
        'semester_offered' => 'Summer',
        'program' => 'BSCS',
        'curriculum_version' => '2023-2024',
    ]);
});
