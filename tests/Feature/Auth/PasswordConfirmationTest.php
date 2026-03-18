<?php

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;

test('confirm password screen can be rendered', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get(route('password.confirm'));

    $response->assertOk();

    $response->assertInertia(fn (Assert $page) => $page
        ->component('auth/confirm-password'),
    );
});

test('password confirmation requires authentication', function () {
    $response = $this->get(route('password.confirm'));

    $response->assertRedirect(route('login'));
});

test('student can confirm password with current account password', function () {
    $student = User::factory()->create([
        'student_id' => '1-2345-678',
        'role' => 'student',
        'password' => Hash::make('password'),
    ]);

    $response = $this->actingAs($student)
        ->post(route('password.confirm.store'), [
            'password' => 'password',
        ]);

    $response->assertSessionHasNoErrors();
    expect(session()->has('auth.password_confirmed_at'))->toBeTrue();
});

test('student cannot confirm password with wrong password', function () {
    $student = User::factory()->create([
        'student_id' => '1-2345-678',
        'role' => 'student',
    ]);

    $response = $this->actingAs($student)
        ->from(route('password.confirm'))
        ->post(route('password.confirm.store'), [
            'password' => 'wrong-password',
        ]);

    $response->assertRedirect(route('password.confirm'));
    $response->assertSessionHasErrors('password');
});