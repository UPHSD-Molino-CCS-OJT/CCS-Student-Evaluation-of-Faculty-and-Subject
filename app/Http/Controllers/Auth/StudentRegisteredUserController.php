<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\ClassSection;
use App\Models\StudentSectionEnrollment;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class StudentRegisteredUserController extends Controller
{
    public function create(Request $request): Response|RedirectResponse
    {
        if ($request->user()) {
            return redirect()->route('dashboard');
        }

        return Inertia::render('auth/student-register', [
            'courses' => $this->availableCourses(),
            'subjects' => $this->availableSubjects(),
            'yearLevels' => $this->availableYearLevels(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $availableCoursePrograms = $this->availableCourses();
        $availableSubjectIds = $this->availableSubjectIds();

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'student_id' => ['required', 'regex:/^\d{1,2}-\d{4}-\d{3}$/', 'unique:users,student_id'],
            'course_program' => ['required', 'string', 'max:100', Rule::in($availableCoursePrograms)],
            'year_level' => ['required', 'integer', Rule::in($this->availableYearLevels())],
            'student_type' => ['required', 'string', Rule::in(['regular', 'irregular'])],
            'subject_ids' => ['nullable', 'array'],
            'subject_ids.*' => ['integer', 'distinct', Rule::exists('subjects', 'id')],
        ]);

        $normalizedStudentId = $this->normalizeStudentId($data['student_id']);

        if (User::query()->where('student_id', $normalizedStudentId)->exists()) {
            return back()->withErrors([
                'student_id' => 'The student ID has already been registered.',
            ])->withInput();
        }

        $selectedSubjectIds = collect($data['subject_ids'] ?? [])
            ->map(fn ($subjectId): int => (int) $subjectId)
            ->unique()
            ->values()
            ->all();

        if ($data['student_type'] === 'irregular' && $selectedSubjectIds === []) {
            return back()->withErrors([
                'subject_ids' => 'Please select at least one subject for irregular students.',
            ])->withInput();
        }

        if ($data['student_type'] === 'irregular' && $selectedSubjectIds !== []) {
            $validSelectedSubjectIds = Subject::query()
                ->whereIn('id', $selectedSubjectIds)
                ->whereIn('id', $availableSubjectIds)
                ->where('program', $data['course_program'])
                ->pluck('id')
                ->map(fn ($subjectId): int => (int) $subjectId)
                ->all();

            if (count($validSelectedSubjectIds) !== count($selectedSubjectIds)) {
                return back()->withErrors([
                    'subject_ids' => 'One or more selected subjects are invalid for the chosen course.',
                ])->withInput();
            }
        }

        $classSectionIds = $this->resolveAssignableClassSectionIds(
            $data['course_program'],
            $data['student_type'] === 'irregular' ? $selectedSubjectIds : null,
        );

        if ($classSectionIds === []) {
            return back()->withErrors([
                'course_program' => 'No class offerings are available for the selected course yet.',
            ])->withInput();
        }

        if ($data['student_type'] === 'irregular') {
            $assignedSubjectIds = $this->resolveSubjectIdsForClassSections($classSectionIds);
            $unassignedSubjectIds = array_values(array_diff($selectedSubjectIds, $assignedSubjectIds));

            if ($unassignedSubjectIds !== []) {
                return back()->withErrors([
                    'subject_ids' => 'Some selected subjects do not have active class offerings yet.',
                ])->withInput();
            }
        }

        $student = null;

        DB::transaction(function () use (&$student, $data, $normalizedStudentId, $classSectionIds): void {
            $student = User::query()->create([
                'name' => $data['name'],
                'email' => mb_strtolower(trim($data['email'])),
                'student_id' => $normalizedStudentId,
                'course_program' => $data['course_program'],
                'student_type' => $data['student_type'],
                'year_level' => (int) $data['year_level'],
                'role' => 'student',
                'password' => $normalizedStudentId,
            ]);

            $timestamp = now();

            StudentSectionEnrollment::query()->insert(
                array_map(
                    fn (int $classSectionId): array => [
                        'student_id' => $student->id,
                        'class_section_id' => $classSectionId,
                        'created_at' => $timestamp,
                        'updated_at' => $timestamp,
                    ],
                    $classSectionIds,
                )
            );
        });

        if (! $student instanceof User) {
            return back()->withErrors([
                'name' => 'Unable to complete registration at this time. Please try again.',
            ])->withInput();
        }

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
    private function availableCourses(): array
    {
        return Subject::query()
            ->whereIn('id', $this->availableSubjectIds())
            ->whereNotNull('program')
            ->where('program', '<>', '')
            ->distinct()
            ->orderBy('program')
            ->pluck('program')
            ->values()
            ->all();
    }

    /**
     * @return array<int, array<string, int|string|null>>
     */
    private function availableSubjects(): array
    {
        return Subject::query()
            ->whereIn('id', $this->availableSubjectIds())
            ->whereNotNull('program')
            ->where('program', '<>', '')
            ->orderBy('program')
            ->orderBy('semester_offered')
            ->orderBy('code')
            ->get(['id', 'code', 'title', 'program', 'semester_offered', 'curriculum_version'])
            ->map(fn (Subject $subject): array => [
                'id' => $subject->id,
                'code' => $subject->code,
                'title' => $subject->title,
                'program' => $subject->program,
                'semesterOffered' => $subject->semester_offered,
                'curriculumVersion' => $subject->curriculum_version,
            ])
            ->values()
            ->all();
    }

    /**
     * @return array<int, int>
     */
    private function availableSubjectIds(): array
    {
        return ClassSection::query()
            ->select('subject_id')
            ->distinct()
            ->pluck('subject_id')
            ->map(fn ($subjectId): int => (int) $subjectId)
            ->all();
    }

    /**
     * @param  array<int, int>|null  $subjectIds
     * @return array<int, int>
     */
    private function resolveAssignableClassSectionIds(string $courseProgram, ?array $subjectIds = null): array
    {
        $query = ClassSection::query()
            ->select(['id', 'subject_id'])
            ->whereHas('subject', fn ($subjectQuery) => $subjectQuery->where('program', $courseProgram));

        if ($subjectIds !== null && $subjectIds !== []) {
            $query->whereIn('subject_id', $subjectIds);
        }

        return $query
            ->orderByDesc('id')
            ->get()
            ->groupBy('subject_id')
            ->map(fn ($classSections): int => (int) $classSections->first()->id)
            ->values()
            ->all();
    }

    /**
     * @param  array<int, int>  $classSectionIds
     * @return array<int, int>
     */
    private function resolveSubjectIdsForClassSections(array $classSectionIds): array
    {
        return ClassSection::query()
            ->whereIn('id', $classSectionIds)
            ->pluck('subject_id')
            ->map(fn ($subjectId): int => (int) $subjectId)
            ->all();
    }
}
