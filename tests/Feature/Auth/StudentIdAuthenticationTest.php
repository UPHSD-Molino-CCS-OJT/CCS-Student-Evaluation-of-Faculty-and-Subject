<?php

use App\Models\User;

test('students can authenticate using student id', function () {
    $student = User::factory()->create([
        'student_id' => '1-2345-678',
        'role' => 'student',
    ]);

    $response = $this->post(route('student.login.store'), [
        'student_id' => $student->student_id,
    ]);

    $this->assertAuthenticatedAs($student);
    $response->assertRedirect(route('dashboard', absolute: false));
});

test('students can authenticate when first group omits leading zero', function () {
    $student = User::factory()->create([
        'student_id' => '01-2345-678',
        'role' => 'student',
    ]);

    $response = $this->post(route('student.login.store'), [
        'student_id' => '1-2345-678',
    ]);

    $this->assertAuthenticatedAs($student);
    $response->assertRedirect(route('dashboard', absolute: false));
});

test('students can authenticate when first group includes leading zero', function () {
    $student = User::factory()->create([
        'student_id' => '1-2345-678',
        'role' => 'student',
    ]);

    $response = $this->post(route('student.login.store'), [
        'student_id' => '01-2345-678',
    ]);

    $this->assertAuthenticatedAs($student);
    $response->assertRedirect(route('dashboard', absolute: false));
});

test('students cannot authenticate with invalid student id', function () {
    User::factory()->create([
        'student_id' => '1-2345-678',
        'role' => 'student',
    ]);

    $response = $this->from(route('student.login'))
        ->post(route('student.login.store'), [
            'student_id' => '9-9999-999',
        ]);

    $response->assertRedirect(route('student.login'));
    $response->assertSessionHasErrors('student_id');
    $this->assertGuest();
});
