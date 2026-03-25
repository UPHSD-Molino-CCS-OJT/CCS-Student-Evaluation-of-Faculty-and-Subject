<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class StudentRegisteredUserController extends Controller
{
    public function create(Request $request): Response|RedirectResponse
    {
        if ($request->user()) {
            return redirect()->route('dashboard');
        }

        return Inertia::render('auth/student-register');
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'student_id' => ['required', 'regex:/^\d{1,2}-\d{4}-\d{3}$/', 'unique:users,student_id'],
        ]);

        $normalizedStudentId = $this->normalizeStudentId($data['student_id']);

        if (User::query()->where('student_id', $normalizedStudentId)->exists()) {
            return back()->withErrors([
                'student_id' => 'The student ID has already been registered.',
            ])->withInput();
        }

        $student = User::query()->create([
            'name' => $data['name'],
            'email' => mb_strtolower(trim($data['email'])),
            'student_id' => $normalizedStudentId,
            'role' => 'student',
            'password' => $normalizedStudentId,
        ]);

        Auth::login($student);
        $request->session()->regenerate();

        return redirect()->route('dashboard');
    }

    private function normalizeStudentId(string $studentId): string
    {
        [$first, $second, $third] = explode('-', $studentId);

        $normalizedFirst = ltrim($first, '0');
        $normalizedFirst = $normalizedFirst === '' ? '0' : $normalizedFirst;

        return sprintf('%s-%s-%s', $normalizedFirst, $second, $third);
    }
}
