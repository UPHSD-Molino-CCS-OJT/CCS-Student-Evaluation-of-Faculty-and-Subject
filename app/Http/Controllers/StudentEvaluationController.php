<?php

namespace App\Http\Controllers;

use App\Models\ClassSection;
use App\Models\Evaluation;
use App\Models\EvaluationResponse;
use App\Models\StudentSectionEnrollment;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class StudentEvaluationController extends Controller
{
    public function index(Request $request): Response
    {
        $student = $request->user();

        $enrollments = StudentSectionEnrollment::query()
            ->with([
                'classSection.subject',
                'classSection.section',
                'classSection.faculty',
                'classSection.evaluations' => fn ($query) => $query->where('student_id', $student->id),
            ])
            ->where('student_id', $student->id)
            ->get();

        $items = $enrollments->map(function (StudentSectionEnrollment $enrollment): array {
            $classSection = $enrollment->classSection;
            $submitted = $classSection->evaluations->isNotEmpty();

            return [
                'classSectionId' => $classSection->id,
                'subject' => $classSection->subject->code.' - '.$classSection->subject->title,
                'faculty' => $classSection->faculty->name,
                'section' => $classSection->section->code,
                'term' => $classSection->term,
                'schoolYear' => $classSection->school_year,
                'submitted' => $submitted,
            ];
        });

        return Inertia::render('student/evaluations/index', [
            'items' => $items,
        ]);
    }

    public function create(Request $request, ClassSection $classSection): Response
    {
        $student = $request->user();

        $enrolled = StudentSectionEnrollment::query()
            ->where('student_id', $student->id)
            ->where('class_section_id', $classSection->id)
            ->exists();

        abort_unless($enrolled, 403);

        $alreadySubmitted = Evaluation::query()
            ->where('student_id', $student->id)
            ->where('class_section_id', $classSection->id)
            ->exists();

        if ($alreadySubmitted) {
            return Inertia::render('student/evaluations/already-submitted', [
                'subject' => $classSection->subject->code.' - '.$classSection->subject->title,
            ]);
        }

        $classSection->load(['subject', 'section', 'faculty']);

        return Inertia::render('student/evaluations/create', [
            'classSection' => [
                'id' => $classSection->id,
                'subject' => $classSection->subject->code.' - '.$classSection->subject->title,
                'faculty' => $classSection->faculty->name,
                'section' => $classSection->section->code,
                'term' => $classSection->term,
                'schoolYear' => $classSection->school_year,
            ],
            'legend' => config('evaluation.legend'),
            'questions' => config('evaluation.questions'),
        ]);
    }

    public function store(Request $request, ClassSection $classSection): RedirectResponse
    {
        $student = $request->user();

        $enrolled = StudentSectionEnrollment::query()
            ->where('student_id', $student->id)
            ->where('class_section_id', $classSection->id)
            ->exists();

        abort_unless($enrolled, 403);

        $questionCount = count(config('evaluation.questions'));

        $payload = $request->validate([
            'responses' => ['required', 'array', 'size:'.$questionCount],
            'responses.*' => ['required', 'integer', 'between:1,5'],
            'comments' => ['nullable', 'string', 'max:1000'],
        ]);

        $alreadySubmitted = Evaluation::query()
            ->where('student_id', $student->id)
            ->where('class_section_id', $classSection->id)
            ->exists();

        if ($alreadySubmitted) {
            return redirect()
                ->route('student.evaluations.index')
                ->with('status', 'You already submitted this evaluation.');
        }

        DB::transaction(function () use ($student, $classSection, $payload): void {
            $evaluation = Evaluation::create([
                'student_id' => $student->id,
                'class_section_id' => $classSection->id,
                'comments' => $payload['comments'] ?? null,
                'submitted_at' => now(),
            ]);

            foreach ($payload['responses'] as $questionNumber => $rating) {
                EvaluationResponse::create([
                    'evaluation_id' => $evaluation->id,
                    'question_number' => (int) $questionNumber,
                    'rating' => $rating,
                ]);
            }
        });

        return redirect()
            ->route('student.evaluations.index')
            ->with('status', 'Evaluation submitted successfully.');
    }
}
