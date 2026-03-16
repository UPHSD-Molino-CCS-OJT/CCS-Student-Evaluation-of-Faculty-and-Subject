<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class StudentAuthenticatedSessionController extends Controller
{
    public function create(Request $request): Response|RedirectResponse
    {
        if ($request->user()) {
            return redirect()->route('dashboard');
        }

        return Inertia::render('auth/student-login');
    }

    public function store(Request $request): RedirectResponse
    {
        $payload = $request->validate([
            'student_id' => ['required', 'regex:/^\d{1,2}-\d{4}-\d{3}$/'],
        ]);

        $student = User::query()
            ->where('role', 'student')
            ->where('student_id', $payload['student_id'])
            ->first();

        if (! $student) {
            throw ValidationException::withMessages([
                'student_id' => 'The provided student ID is invalid.',
            ]);
        }

        Auth::login($student);
        $request->session()->regenerate();

        return redirect()->intended(route('dashboard', absolute: false));
    }
}
