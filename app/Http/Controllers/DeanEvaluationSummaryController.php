<?php

namespace App\Http\Controllers;

use App\Models\ClassSection;
use App\Models\EvaluationSetting;
use App\Models\EvaluationResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Inertia\Inertia;
use Inertia\Response;

class DeanEvaluationSummaryController extends Controller
{
    public function index(): Response
    {
        $classSections = ClassSection::query()
            ->with(['subject', 'section', 'faculty'])
            ->get();

        $questionMap = EvaluationResponse::query()
            ->selectRaw('evaluations.class_section_id, evaluation_responses.question_number, ROUND(AVG(evaluation_responses.rating), 2) AS average_rating')
            ->join('evaluations', 'evaluations.id', '=', 'evaluation_responses.evaluation_id')
            ->whereIn('evaluations.class_section_id', $classSections->pluck('id'))
            ->groupBy('evaluations.class_section_id', 'evaluation_responses.question_number')
            ->orderBy('evaluation_responses.question_number')
            ->get()
            ->groupBy('class_section_id');

        $summaryMap = ClassSection::query()
            ->selectRaw('class_sections.id AS class_section_id, COUNT(evaluations.id) AS respondents, ROUND(AVG(evaluation_responses.rating), 2) AS overall_average')
            ->leftJoin('evaluations', 'evaluations.class_section_id', '=', 'class_sections.id')
            ->leftJoin('evaluation_responses', 'evaluation_responses.evaluation_id', '=', 'evaluations.id')
            ->whereIn('class_sections.id', $classSections->pluck('id'))
            ->groupBy('class_sections.id')
            ->get()
            ->keyBy('class_section_id');

        $rows = $classSections->map(function (ClassSection $classSection) use ($questionMap, $summaryMap): array {
            $summary = $summaryMap->get($classSection->id);

            return [
                'classSectionId' => $classSection->id,
                'subject' => $classSection->subject->code.' - '.$classSection->subject->title,
                'faculty' => $classSection->faculty->name,
                'section' => $classSection->section->code,
                'term' => $classSection->term,
                'schoolYear' => $classSection->school_year,
                'respondents' => (int) ($summary->respondents ?? 0),
                'overallAverage' => $summary?->overall_average !== null
                    ? (float) $summary->overall_average
                    : null,
                'questionAverages' => ($questionMap->get($classSection->id) ?? collect())
                    ->map(fn ($row): array => [
                        'questionNumber' => (int) $row->question_number,
                        'averageRating' => (float) $row->average_rating,
                    ])
                    ->values(),
            ];
        });

        return Inertia::render('dean/summaries/index', [
            'questions' => config('evaluation.questions'),
            'rows' => $rows,
            'evaluationOpen' => EvaluationSetting::isOpen(),
        ]);
    }

    public function exportClassSection(ClassSection $classSection): StreamedResponse
    {
        $classSection->load(['subject', 'section', 'faculty']);
        $questions = collect(config('evaluation.questions'));

        $questionAverages = EvaluationResponse::query()
            ->selectRaw('evaluation_responses.question_number, ROUND(AVG(evaluation_responses.rating), 2) AS average_rating')
            ->join('evaluations', 'evaluations.id', '=', 'evaluation_responses.evaluation_id')
            ->where('evaluations.class_section_id', $classSection->id)
            ->groupBy('evaluation_responses.question_number')
            ->orderBy('evaluation_responses.question_number')
            ->get()
            ->keyBy('question_number');

        $summary = ClassSection::query()
            ->selectRaw('COUNT(evaluations.id) AS respondents, ROUND(AVG(evaluation_responses.rating), 2) AS overall_average')
            ->leftJoin('evaluations', 'evaluations.class_section_id', '=', 'class_sections.id')
            ->leftJoin('evaluation_responses', 'evaluation_responses.evaluation_id', '=', 'evaluations.id')
            ->where('class_sections.id', $classSection->id)
            ->groupBy('class_sections.id')
            ->first();

        $fileName = sprintf(
            'evaluation-summary-%s-%s.csv',
            $classSection->subject?->code ?? 'subject',
            now()->format('Ymd-His')
        );

        return response()->streamDownload(function () use ($classSection, $questions, $questionAverages, $summary): void {
            $output = fopen('php://output', 'w');

            if (! $output) {
                return;
            }

            fputcsv($output, ['Subject', 'Faculty', 'Section', 'Term', 'School Year', 'Respondents', 'Overall Average']);
            fputcsv($output, [
                ($classSection->subject?->code ?? '').' - '.($classSection->subject?->title ?? ''),
                $classSection->faculty?->name,
                $classSection->section?->code,
                $classSection->term,
                $classSection->school_year,
                (int) ($summary?->respondents ?? 0),
                $summary?->overall_average,
            ]);

            fputcsv($output, []);
            fputcsv($output, ['Question Number', 'Category', 'Question', 'Average Rating']);

            foreach ($questions as $question) {
                $questionNumber = (int) ($question['number'] ?? 0);
                fputcsv($output, [
                    $questionNumber,
                    $question['category'] ?? '',
                    $question['text'] ?? '',
                    $questionAverages->get($questionNumber)?->average_rating,
                ]);
            }

            fclose($output);
        }, $fileName, [
            'Content-Type' => 'text/csv',
        ]);
    }

    public function exportOverall(): StreamedResponse
    {
        $classSections = ClassSection::query()
            ->with(['subject', 'section', 'faculty'])
            ->get();

        $summaryMap = ClassSection::query()
            ->selectRaw('class_sections.id AS class_section_id, COUNT(evaluations.id) AS respondents, ROUND(AVG(evaluation_responses.rating), 2) AS overall_average')
            ->leftJoin('evaluations', 'evaluations.class_section_id', '=', 'class_sections.id')
            ->leftJoin('evaluation_responses', 'evaluation_responses.evaluation_id', '=', 'evaluations.id')
            ->whereIn('class_sections.id', $classSections->pluck('id'))
            ->groupBy('class_sections.id')
            ->get()
            ->keyBy('class_section_id');

        $overallQuestionAverages = EvaluationResponse::query()
            ->selectRaw('evaluation_responses.question_number, ROUND(AVG(evaluation_responses.rating), 2) AS average_rating')
            ->groupBy('evaluation_responses.question_number')
            ->orderBy('evaluation_responses.question_number')
            ->get()
            ->keyBy('question_number');

        $questions = collect(config('evaluation.questions'));
        $fileName = 'evaluation-summary-overall-'.now()->format('Ymd-His').'.csv';

        return response()->streamDownload(function () use ($classSections, $summaryMap, $overallQuestionAverages, $questions): void {
            $output = fopen('php://output', 'w');

            if (! $output) {
                return;
            }

            fputcsv($output, ['Class Evaluation Summary']);
            fputcsv($output, ['Subject', 'Faculty', 'Section', 'Term', 'School Year', 'Respondents', 'Overall Average']);

            foreach ($classSections as $classSection) {
                $summary = $summaryMap->get($classSection->id);

                fputcsv($output, [
                    ($classSection->subject?->code ?? '').' - '.($classSection->subject?->title ?? ''),
                    $classSection->faculty?->name,
                    $classSection->section?->code,
                    $classSection->term,
                    $classSection->school_year,
                    (int) ($summary?->respondents ?? 0),
                    $summary?->overall_average,
                ]);
            }

            fputcsv($output, []);
            fputcsv($output, ['Overall Question Averages']);
            fputcsv($output, ['Question Number', 'Category', 'Question', 'Average Rating']);

            foreach ($questions as $question) {
                $questionNumber = (int) ($question['number'] ?? 0);

                fputcsv($output, [
                    $questionNumber,
                    $question['category'] ?? '',
                    $question['text'] ?? '',
                    $overallQuestionAverages->get($questionNumber)?->average_rating,
                ]);
            }

            fclose($output);
        }, $fileName, [
            'Content-Type' => 'text/csv',
        ]);
    }
}
