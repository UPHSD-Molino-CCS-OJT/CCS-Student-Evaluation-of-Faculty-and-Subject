<?php

use App\Models\User;

test('students can authenticate using student id', function () {
    $student = User::factory()->create([
        'student_id' => '1-2345-678',
        'role' => 'student',
    ]);

    $response = $this->post(route('login.store'), [
        'login' => $student->student_id,
        'password' => 'password',
    ]);

    $this->assertAuthenticatedAs($student);
    $response->assertRedirect(route('dashboard', absolute: false));
});
