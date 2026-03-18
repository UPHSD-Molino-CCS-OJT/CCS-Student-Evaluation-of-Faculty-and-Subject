<?php

namespace App\Http\Controllers;

use App\Models\ClassSection;
use App\Models\EvaluationReportSignoff;
use App\Models\EvaluationResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class FacultyEvaluationReportController extends Controller
{
    public function index(Request $request): Response
    {
        $faculty = $request->user();

        $assignments = ClassSection::query()
            ->with(['subject', 'section', 'reportSignoff'])
            ->where('faculty_id', $faculty->id)
            ->get();

        $questionMap = EvaluationResponse::query()
            ->selectRaw('evaluations.class_section_id, evaluation_responses.question_number, ROUND(AVG(evaluation_responses.rating), 2) AS average_rating')
            ->join('evaluations', 'evaluations.id', '=', 'evaluation_responses.evaluation_id')
            ->whereIn('evaluations.class_section_id', $assignments->pluck('id'))
            ->groupBy('evaluations.class_section_id', 'evaluation_responses.question_number')
            ->orderBy('evaluation_responses.question_number')
            ->get()
            ->groupBy('class_section_id');

        $respondentMap = ClassSection::query()
            ->selectRaw('class_sections.id AS class_section_id, COUNT(evaluations.id) AS respondents, ROUND(AVG(evaluation_responses.rating), 2) AS overall_average')
            ->leftJoin('evaluations', 'evaluations.class_section_id', '=', 'class_sections.id')
            ->leftJoin('evaluation_responses', 'evaluation_responses.evaluation_id', '=', 'evaluations.id')
            ->whereIn('class_sections.id', $assignments->pluck('id'))
            ->groupBy('class_sections.id')
            ->get()
            ->keyBy('class_section_id');

        $rows = $assignments->map(function (ClassSection $assignment) use ($questionMap, $respondentMap): array {
            $summary = $respondentMap->get($assignment->id);

            return [
                'classSectionId' => $assignment->id,
                'subject' => $assignment->subject->code.' - '.$assignment->subject->title,
                'section' => $assignment->section->code,
                'term' => $assignment->term,
                'schoolYear' => $assignment->school_year,
                'respondents' => (int) ($summary->respondents ?? 0),
                'overallAverage' => $summary?->overall_average !== null
                    ? (float) $summary->overall_average
                    : null,
                'facultySignedAt' => $assignment->reportSignoff?->faculty_signed_at?->toDateTimeString(),
                'deanSignedAt' => $assignment->reportSignoff?->dean_signed_at?->toDateTimeString(),
                'canSign' => $faculty->esign_image_path !== null,
                'questionAverages' => ($questionMap->get($assignment->id) ?? collect())
                    ->map(fn ($row): array => [
                        'questionNumber' => (int) $row->question_number,
                        'averageRating' => (float) $row->average_rating,
                    ])
                    ->values(),
            ];
        });

        return Inertia::render('faculty/reports/index', [
            'questions' => config('evaluation.questions'),
            'rows' => $rows,
        ]);
    }

    public function signAndSubmit(Request $request, ClassSection $classSection): RedirectResponse
    {
        $faculty = $request->user();

        if ($classSection->faculty_id !== $faculty->id) {
            abort(403);
        }

        if ($faculty->esign_image_path === null || ! Storage::disk('public')->exists($faculty->esign_image_path)) {
            return back()->withErrors([
                'esign' => 'Upload your e-sign in Settings before signing a report.',
            ]);
        }

        $signoff = EvaluationReportSignoff::query()->firstOrNew([
            'class_section_id' => $classSection->id,
        ]);

        $signoff->fill([
            'faculty_user_id' => $faculty->id,
            'faculty_signed_at' => now(),
            'faculty_signature_path' => $faculty->esign_image_path,
            'dean_user_id' => null,
            'dean_signed_at' => null,
            'dean_signature_path' => null,
        ]);
        $signoff->save();

        return back()->with('status', 'Report signed and submitted to dean.');
    }
}
