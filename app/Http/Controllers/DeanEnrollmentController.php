<?php

namespace App\Http\Controllers;

use App\Models\ClassSection;
use App\Models\Section;
use App\Models\StudentSectionEnrollment;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class DeanEnrollmentController extends Controller
{
    public function index(): Response
    {
        $students = User::query()
            ->where('role', 'student')
            ->orderBy('name')
            ->get(['id', 'name', 'student_id'])
            ->map(fn (User $student): array => [
                'id' => $student->id,
                'name' => $student->name,
                'studentNumber' => $student->student_id,
            ])
            ->values();

        $faculty = User::query()
            ->where('role', 'faculty')
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (User $teacher): array => [
                'id' => $teacher->id,
                'name' => $teacher->name,
            ])
            ->values();

        $subjects = Subject::query()
            ->orderBy('code')
            ->get(['id', 'code', 'title', 'program'])
            ->map(fn (Subject $subject): array => [
                'id' => $subject->id,
                'code' => $subject->code,
                'title' => $subject->title,
                'program' => $subject->program,
            ])
            ->values();

        $enrollments = StudentSectionEnrollment::query()
            ->with([
                'student:id,name,student_id',
                'classSection.subject:id,code,title,program',
                'classSection.section:id,code',
                'classSection.faculty:id,name',
            ])
            ->latest()
            ->get()
            ->map(function (StudentSectionEnrollment $enrollment): array {
                return [
                    'id' => $enrollment->id,
                    'studentId' => $enrollment->student?->id,
                    'studentName' => $enrollment->student?->name,
                    'studentNumber' => $enrollment->student?->student_id,
                    'subjectId' => $enrollment->classSection?->subject?->id,
                    'subjectCode' => $enrollment->classSection?->subject?->code,
                    'subjectTitle' => $enrollment->classSection?->subject?->title,
                    'program' => $enrollment->classSection?->subject?->program,
                    'facultyId' => $enrollment->classSection?->faculty?->id,
                    'facultyName' => $enrollment->classSection?->faculty?->name,
                    'section' => $enrollment->classSection?->section?->code,
                    'term' => $enrollment->classSection?->term,
                    'schoolYear' => $enrollment->classSection?->school_year,
                ];
            })
            ->values();

        return Inertia::render('dean/enrollments/index', [
            'students' => $students,
            'faculty' => $faculty,
            'subjects' => $subjects,
            'enrollments' => $enrollments,
            'terms' => ['1st Semester', '2nd Semester', 'Summer'],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validatePayload($request);

        $this->assertRoleConstraints($data['student_id'], $data['faculty_id']);

        DB::transaction(function () use ($data): void {
            $classSection = $this->resolveClassSection($data);

            StudentSectionEnrollment::query()->firstOrCreate([
                'student_id' => $data['student_id'],
                'class_section_id' => $classSection->id,
            ]);
        });

        return back()->with('status', 'Student enrolled successfully.');
    }

    public function update(Request $request, StudentSectionEnrollment $enrollment): RedirectResponse
    {
        $data = $this->validatePayload($request);

        $this->assertRoleConstraints($data['student_id'], $data['faculty_id']);

        DB::transaction(function () use ($data, $enrollment): void {
            $classSection = $this->resolveClassSection($data);

            $enrollment->update([
                'student_id' => $data['student_id'],
                'class_section_id' => $classSection->id,
            ]);
        });

        return back()->with('status', 'Enrollment updated successfully.');
    }

    public function destroy(StudentSectionEnrollment $enrollment): RedirectResponse
    {
        $enrollment->delete();

        return back()->with('status', 'Enrollment removed successfully.');
    }

    /**
     * @return array<string, string|int>
     */
    private function validatePayload(Request $request): array
    {
        return $request->validate([
            'student_id' => ['required', 'integer', 'exists:users,id'],
            'subject_id' => ['required', 'integer', 'exists:subjects,id'],
            'faculty_id' => ['required', 'integer', 'exists:users,id'],
            'section_code' => ['required', 'string', 'max:255'],
            'term' => ['required', 'string', 'in:1st Semester,2nd Semester,Summer'],
            'school_year' => ['required', 'string', 'max:255'],
        ]);
    }

    private function assertRoleConstraints(int $studentId, int $facultyId): void
    {
        $student = User::query()->findOrFail($studentId);
        if ($student->role !== 'student') {
            throw ValidationException::withMessages([
                'student_id' => 'Selected user is not a student.',
            ]);
        }

        $faculty = User::query()->findOrFail($facultyId);
        if ($faculty->role !== 'faculty') {
            throw ValidationException::withMessages([
                'faculty_id' => 'Selected user is not a faculty member.',
            ]);
        }
    }

    /**
     * @param  array<string, string|int>  $data
     */
    private function resolveClassSection(array $data): ClassSection
    {
        $section = Section::query()->firstOrCreate([
            'code' => (string) $data['section_code'],
        ]);

        return ClassSection::query()->firstOrCreate([
            'subject_id' => (int) $data['subject_id'],
            'faculty_id' => (int) $data['faculty_id'],
            'section_id' => $section->id,
            'school_year' => (string) $data['school_year'],
            'term' => (string) $data['term'],
        ]);
    }
}
