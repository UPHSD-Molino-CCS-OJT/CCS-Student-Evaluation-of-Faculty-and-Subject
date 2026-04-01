<?php

namespace App\Http\Controllers;

use App\Models\Subject;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class DeanStudentsController extends Controller
{
    public function index(): Response
    {
        $students = User::query()
            ->where('role', 'student')
            ->with([
                'enrollments.classSection.section',
                'enrollments.classSection.subject',
            ])
            ->orderBy('name')
            ->get()
            ->map(function (User $student): array {
                $latestEnrollment = $student->enrollments
                    ->sortByDesc('created_at')
                    ->first();

                $program = $latestEnrollment?->classSection?->subject?->program ?: $student->course_program;
                $yearLevel = $student->year_level;

                $sectionCode = $latestEnrollment?->classSection?->section?->code;
                if (is_string($sectionCode) && preg_match('/^([A-Za-z]+)-(\d)/', $sectionCode, $matches) === 1) {
                    if ($program === null || $program === '') {
                        $program = strtoupper($matches[1]);
                    }

                    if ($yearLevel === null) {
                        $yearLevel = (int) $matches[2];
                    }
                }

                $isActive = $student->enrollments->isNotEmpty();

                return [
                    'id' => $student->id,
                    'name' => $student->name,
                    'studentNumber' => $student->student_id,
                    'yearLevel' => $yearLevel,
                    'courseProgram' => $student->course_program,
                    'studentType' => $student->student_type,
                    'program' => $program ?: 'Unassigned',
                    'status' => $isActive ? 'Active' : 'Inactive',
                    'statusNote' => $isActive
                        ? 'Currently enrolled'
                        : 'No class enrollments found. May be graduated or no longer under a program.',
                ];
            })
            ->values();

        return Inertia::render('dean/students/index', [
            'students' => $students,
            'programOptions' => $this->programOptions(),
            'yearLevels' => $this->availableYearLevels(),
            'studentTypes' => ['regular', 'irregular'],
        ]);
    }

    public function update(Request $request, User $student): RedirectResponse
    {
        if ($student->role !== 'student') {
            abort(404);
        }

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'student_id' => ['nullable', 'regex:/^\d{1,2}-\d{4}-\d{3}$/', Rule::unique('users', 'student_id')->ignore($student->id)],
            'course_program' => ['nullable', 'string', 'max:100'],
            'year_level' => ['nullable', 'integer', Rule::in($this->availableYearLevels())],
            'student_type' => ['nullable', 'string', Rule::in(['regular', 'irregular'])],
        ]);

        $student->update([
            'name' => $data['name'],
            'student_id' => $data['student_id'] ?: null,
            'course_program' => $data['course_program'] ?: null,
            'year_level' => $data['year_level'] ?? null,
            'student_type' => $data['student_type'] ?: null,
        ]);

        return back()->with('status', 'Student updated successfully.');
    }

    /**
     * @return array<int, int>
     */
    private function availableYearLevels(): array
    {
        return [1, 2, 3, 4, 5];
    }

    /**
     * @return array<int, string>
     */
    private function programOptions(): array
    {
        return Subject::query()
            ->whereNotNull('program')
            ->where('program', '<>', '')
            ->distinct()
            ->orderBy('program')
            ->pluck('program')
            ->values()
            ->all();
    }
}
