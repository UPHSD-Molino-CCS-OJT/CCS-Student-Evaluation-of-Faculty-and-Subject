<?php

namespace App\Http\Controllers;

use App\Models\ClassSection;
use App\Models\Section;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DeanFacultyManagementController extends Controller
{
    public function index(): Response
    {
        $facultyOptions = User::query()
            ->where('role', 'faculty')
            ->orderBy('name')
            ->get(['id', 'name', 'email'])
            ->map(fn (User $faculty): array => [
                'id' => $faculty->id,
                'name' => $faculty->name,
                'email' => $faculty->email,
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

        $faculty = User::query()
            ->where('role', 'faculty')
            ->with(['teachingAssignments.subject:id,code,title,program', 'teachingAssignments.section:id,code'])
            ->orderBy('name')
            ->get()
            ->map(function (User $teacher): array {
                $assignments = $teacher->teachingAssignments
                    ->sortByDesc('created_at')
                    ->map(function (ClassSection $assignment): array {
                        return [
                            'classSectionId' => $assignment->id,
                            'subjectCode' => $assignment->subject?->code,
                            'subjectTitle' => $assignment->subject?->title,
                            'program' => $assignment->subject?->program,
                            'section' => $assignment->section?->code,
                            'term' => $assignment->term,
                            'schoolYear' => $assignment->school_year,
                        ];
                    })
                    ->values();

                return [
                    'id' => $teacher->id,
                    'name' => $teacher->name,
                    'email' => $teacher->email,
                    'assignmentCount' => $assignments->count(),
                    'assignments' => $assignments,
                ];
            })
            ->values();

        return Inertia::render('dean/faculty-management/index', [
            'faculty' => $faculty,
            'facultyOptions' => $facultyOptions,
            'subjects' => $subjects,
            'terms' => ['1st Semester', '2nd Semester', 'Summer'],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'faculty_id' => ['required', 'integer', 'exists:users,id'],
            'subject_id' => ['required', 'integer', 'exists:subjects,id'],
            'section_code' => ['required', 'string', 'max:255'],
            'term' => ['required', 'string', 'in:1st Semester,2nd Semester,Summer'],
            'school_year' => ['required', 'string', 'max:255'],
        ]);

        $faculty = User::query()->findOrFail($data['faculty_id']);

        if ($faculty->role !== 'faculty') {
            return back()->withErrors([
                'faculty_id' => 'Selected user is not a faculty member.',
            ]);
        }

        DB::transaction(function () use ($data): void {
            $section = Section::query()->firstOrCreate([
                'code' => $data['section_code'],
            ]);

            ClassSection::query()->firstOrCreate([
                'subject_id' => $data['subject_id'],
                'faculty_id' => $data['faculty_id'],
                'section_id' => $section->id,
                'school_year' => $data['school_year'],
                'term' => $data['term'],
            ]);
        });

        return back()->with('status', 'Faculty assignment saved successfully.');
    }
}
