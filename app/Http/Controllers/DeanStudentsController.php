<?php

namespace App\Http\Controllers;

use App\Models\User;
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
                $yearLevel = null;

                $sectionCode = $latestEnrollment?->classSection?->section?->code;
                if (is_string($sectionCode) && preg_match('/^([A-Za-z]+)-(\d)/', $sectionCode, $matches) === 1) {
                    if ($program === null || $program === '') {
                        $program = strtoupper($matches[1]);
                    }

                    $yearLevel = (int) $matches[2];
                }

                $isActive = $student->enrollments->isNotEmpty();

                return [
                    'id' => $student->id,
                    'name' => $student->name,
                    'studentNumber' => $student->student_id,
                    'yearLevel' => $yearLevel,
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
        ]);
    }
}
