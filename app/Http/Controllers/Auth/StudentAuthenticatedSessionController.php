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

        $candidateStudentIds = $this->candidateStudentIds($payload['student_id']);

        $student = User::query()
            ->where('role', 'student')
            ->whereIn('student_id', $candidateStudentIds)
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

    /**
     * Accept both 1-xxxx-xxx and 01-xxxx-xxx as equivalent student IDs.
     *
     * @return array<int, string>
     */
    private function candidateStudentIds(string $studentId): array
    {
        [$first, $second, $third] = explode('-', $studentId);

        $normalizedFirst = ltrim($first, '0');
        $normalizedFirst = $normalizedFirst === '' ? '0' : $normalizedFirst;
        $paddedFirst = str_pad($normalizedFirst, 2, '0', STR_PAD_LEFT);

        return array_values(array_unique([
            $studentId,
            sprintf('%s-%s-%s', $normalizedFirst, $second, $third),
            sprintf('%s-%s-%s', $paddedFirst, $second, $third),
        ]));
    }
}
