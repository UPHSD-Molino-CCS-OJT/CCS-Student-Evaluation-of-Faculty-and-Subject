<?php

namespace App\Http\Controllers;

use App\Models\Subject;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class DeanProgramCoursesController extends Controller
{
    public function index(): Response
    {
        $canManage = in_array((string) request()->user()?->role, ['dean', 'system_admin', 'staff', 'faculty'], true);

        $programs = Subject::query()
            ->orderBy('program')
            ->orderBy('curriculum_version')
            ->orderBy('semester_offered')
            ->orderBy('code')
            ->get()
            ->groupBy(fn (Subject $subject): string => $subject->program ?: 'Unassigned Program')
            ->map(function ($subjects, string $program): array {
                $curriculums = $subjects
                    ->groupBy(fn (Subject $subject): string => $subject->curriculum_version ?: 'Unassigned Curriculum')
                    ->map(function ($curriculumSubjects, string $curriculum): array {
                        return [
                            'curriculum' => $curriculum,
                            'subjects' => $curriculumSubjects->map(fn (Subject $subject): array => [
                                'id' => $subject->id,
                                'code' => $subject->code,
                                'title' => $subject->title,
                                'semesterOffered' => $subject->semester_offered,
                            ])->values(),
                        ];
                    })
                    ->values();

                return [
                    'program' => $program,
                    'courseCount' => $subjects->count(),
                    'curriculums' => $curriculums,
                ];
            })
            ->values();

        return Inertia::render('dean/program-courses/index', [
            'programs' => $programs,
            'canManage' => $canManage,
            'terms' => ['1st Semester', '2nd Semester', 'Summer'],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:100'],
            'title' => ['required', 'string', 'max:255'],
            'program' => ['required', 'string', 'max:100'],
            'curriculum_version' => ['required', 'string', 'max:100'],
            'semester_offered' => ['required', 'string', 'in:1st Semester,2nd Semester,Summer'],
            'id' => ['nullable', 'integer', 'exists:subjects,id'],
        ]);

        $subjectId = isset($data['id']) ? (int) $data['id'] : null;

        $uniqueRule = Rule::unique('subjects')
            ->where(fn ($query) => $query
                ->where('code', $data['code'])
                ->where('semester_offered', $data['semester_offered'])
                ->where('program', $data['program'])
                ->where('curriculum_version', $data['curriculum_version']));

        if ($subjectId !== null) {
            $uniqueRule = $uniqueRule->ignore($subjectId);
        }

        Validator::make($data, [
            'code' => [$uniqueRule],
        ])->validate();

        $payload = [
            'code' => $data['code'],
            'title' => $data['title'],
            'program' => $data['program'],
            'curriculum_version' => $data['curriculum_version'],
            'semester_offered' => $data['semester_offered'],
        ];

        if ($subjectId !== null) {
            Subject::query()->findOrFail($subjectId)->update($payload);

            return back()->with('status', 'Course updated successfully.');
        }

        Subject::query()->create($payload);

        return back()->with('status', 'Course created successfully.');
    }

    public function destroy(Subject $subject): RedirectResponse
    {
        $subject->delete();

        return back()->with('status', 'Course removed successfully.');
    }
}
