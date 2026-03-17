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
        ]);
    }
}
