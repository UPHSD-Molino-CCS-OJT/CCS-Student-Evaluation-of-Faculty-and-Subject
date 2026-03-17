<?php

namespace App\Http\Controllers;

use App\Models\Subject;
use Inertia\Inertia;
use Inertia\Response;

class DeanProgramCoursesController extends Controller
{
    public function index(): Response
    {
        $programs = Subject::query()
            ->orderBy('program')
            ->orderBy('curriculum_version')
            ->orderBy('semester_offered')
            ->orderBy('code')
            ->get()
            ->groupBy(fn (Subject $subject): string => $subject->program ?: 'Unassigned Program')
            ->map(function ($subjects, string $program): array {
                return [
                    'program' => $program,
                    'subjects' => $subjects->map(fn (Subject $subject): array => [
                        'id' => $subject->id,
                        'code' => $subject->code,
                        'title' => $subject->title,
                        'semesterOffered' => $subject->semester_offered,
                        'curriculumVersion' => $subject->curriculum_version,
                    ])->values(),
                ];
            })
            ->values();

        return Inertia::render('dean/program-courses/index', [
            'programs' => $programs,
        ]);
    }
}
