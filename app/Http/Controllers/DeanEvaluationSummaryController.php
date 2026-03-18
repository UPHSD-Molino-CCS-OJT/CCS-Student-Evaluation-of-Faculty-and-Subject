<?php

namespace App\Http\Controllers;

use App\Models\ClassSection;
use App\Models\Evaluation;
use App\Models\EvaluationSetting;
use App\Models\EvaluationResponse;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
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

        $questionRows = $questions->map(function (array $question) use ($questionAverages): array {
            $questionNumber = (int) ($question['number'] ?? 0);
            $average = $questionAverages->get($questionNumber)?->average_rating;

            return [
                'number' => $questionNumber,
                'category' => $question['category'] ?? '',
                'text' => $question['text'] ?? '',
                'average' => $average !== null ? (float) $average : null,
            ];
        })->values();

        $comments = Evaluation::query()
            ->where('class_section_id', $classSection->id)
            ->whereNotNull('comments')
            ->where('comments', '!=', '')
            ->orderBy('submitted_at')
            ->pluck('comments')
            ->map(fn (string $comment): string => trim($comment))
            ->filter(fn (string $comment): bool => $comment !== '')
            ->values();

        $fileName = sprintf(
            'evaluation-summary-%s-%s.xlsx',
            $classSection->subject?->code ?? 'subject',
            now()->format('Ymd-His')
        );

        return response()->streamDownload(function () use ($classSection, $questionRows, $summary, $comments): void {
            $spreadsheet = new Spreadsheet();
            $sheet = $spreadsheet->getActiveSheet();
            $sheet->setTitle('Summary');

            $this->buildClassSummarySheet(
                $sheet,
                $classSection,
                (int) ($summary?->respondents ?? 0),
                $summary?->overall_average !== null ? (float) $summary->overall_average : null,
                $questionRows->all(),
                $comments->all(),
            );

            $continuationSheet = new Worksheet($spreadsheet, 'Comments & Plan');
            $spreadsheet->addSheet($continuationSheet);
            $this->buildCommentsAndPlanSheet($continuationSheet, $comments->all(), $questionRows->all());

            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');
        }, $fileName, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
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
        $fileName = 'evaluation-summary-overall-'.now()->format('Ymd-His').'.xlsx';

        $overallQuestionRows = $questions->map(function (array $question) use ($overallQuestionAverages): array {
            $questionNumber = (int) ($question['number'] ?? 0);
            $average = $overallQuestionAverages->get($questionNumber)?->average_rating;

            return [
                'number' => $questionNumber,
                'category' => $question['category'] ?? '',
                'text' => $question['text'] ?? '',
                'average' => $average !== null ? (float) $average : null,
            ];
        })->values();

        return response()->streamDownload(function () use ($classSections, $summaryMap, $overallQuestionRows): void {
            $spreadsheet = new Spreadsheet();
            $sheet = $spreadsheet->getActiveSheet();
            $sheet->setTitle('Overall Summary');

            $this->buildOverallSummarySheet($sheet, $classSections->all(), $summaryMap->all());

            $questionSheet = new Worksheet($spreadsheet, 'Question Averages');
            $spreadsheet->addSheet($questionSheet);
            $this->buildOverallQuestionAveragesSheet($questionSheet, $overallQuestionRows->all());

            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');
        }, $fileName, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    /**
     * @param  array<int, array{number:int,category:string,text:string,average:float|null}>  $questionRows
     * @param  array<int, string>  $comments
     */
    private function buildClassSummarySheet(
        Worksheet $sheet,
        ClassSection $classSection,
        int $respondents,
        ?float $overallAverage,
        array $questionRows,
        array $comments,
    ): void {
        $this->initializeDocumentSheet($sheet);

        $sheet->setCellValue('A1', 'UNIVERSITY OF PERPETUAL HELP SYSTEM DALTA');
        $sheet->mergeCells('A1:D1');
        $sheet->setCellValue('A2', 'College of Computer Studies');
        $sheet->mergeCells('A2:D2');

        $sheet->setCellValue('A4', sprintf('PERIOD : %s %s', (string) $classSection->term, (string) $classSection->school_year));
        $sheet->setCellValue('C4', sprintf('SUBJECT/S : %s', ($classSection->subject?->code ?? '').' - '.($classSection->subject?->title ?? '')));
        $sheet->setCellValue('A5', sprintf('NAME : %s', (string) ($classSection->faculty?->name ?? '')));
        $sheet->setCellValue('C5', sprintf('EVALUATORS : %d STUDENTS', $respondents));

        $sheet->setCellValue('A7', 'STUDENT EVALUATION');
        $sheet->mergeCells('A7:D7');
        $sheet->setCellValue('A8', 'CRITERIA');
        $sheet->setCellValue('C8', 'Average');
        $sheet->setCellValue('D8', 'Remarks');

        $row = 9;
        foreach ($questionRows as $questionRow) {
            $sheet->setCellValue("A{$row}", $questionRow['text']);
            $sheet->mergeCells("A{$row}:B{$row}");
            $sheet->setCellValue("C{$row}", $questionRow['average']);
            $sheet->setCellValue("D{$row}", $this->remarkFromAverage($questionRow['average']));
            $sheet->getStyle("C{$row}")->getNumberFormat()->setFormatCode('0.00');
            $row++;
        }

        $sheet->setCellValue("A{$row}", 'AVERAGE');
        $sheet->mergeCells("A{$row}:B{$row}");
        $sheet->setCellValue("C{$row}", $overallAverage);
        $sheet->setCellValue("D{$row}", $this->remarkFromAverage($overallAverage));
        $sheet->getStyle("C{$row}")->getNumberFormat()->setFormatCode('0.00');
        $sheet->getStyle("A{$row}:D{$row}")->getFont()->setBold(true);

        $lastCriteriaRow = $row;
        $row += 2;

        $sheet->setCellValue("A{$row}", 'COMMENTS');
        $sheet->mergeCells("A{$row}:D{$row}");
        $sheet->getStyle("A{$row}:D{$row}")->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FFEDEDED');
        $sheet->getStyle("A{$row}:D{$row}")->getFont()->setBold(true);
        $row++;

        foreach (array_slice($comments, 0, 8) as $comment) {
            $sheet->setCellValue("A{$row}", $comment);
            $sheet->mergeCells("A{$row}:D{$row}");
            $row++;
        }

        if ($comments === []) {
            $sheet->setCellValue("A{$row}", 'No comments submitted.');
            $sheet->mergeCells("A{$row}:D{$row}");
            $row++;
        }

        $commentEndRow = $row - 1;

        $footerRow = max($row + 2, 45);
        $sheet->setCellValue("A{$footerRow}", 'Salawag-Zapote Road, Molino 3, City of Bacoor, 4102 Philippines • Tel. No.: (046) 477-0602');
        $sheet->mergeCells("A{$footerRow}:D{$footerRow}");
        $sheet->setCellValue("A".($footerRow + 1), 'www.perpetualdalta.edu.ph Molino Campus');
        $sheet->mergeCells('A'.($footerRow + 1).':D'.($footerRow + 1));

        $sheet->getStyle('A1:D1')->getFont()->setBold(true)->setSize(20)->getColor()->setARGB('FFB06060');
        $sheet->getStyle('A2:D2')->getFont()->setItalic(true)->setSize(11);
        $sheet->getStyle('A7:D7')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet->getStyle('A7:D7')->getFont()->setBold(true);
        $sheet->getStyle('A8:D8')->getFont()->setBold(true);
        $sheet->getStyle("A8:D{$lastCriteriaRow}")->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);
        $sheet->getStyle("A".($lastCriteriaRow + 2).":D{$commentEndRow}")->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);
        $sheet->getStyle("C8:C{$lastCriteriaRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
        $sheet->getStyle("D8:D{$lastCriteriaRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_LEFT);
        $sheet->getStyle("A{$footerRow}:D".($footerRow + 1))->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet->getStyle("A{$footerRow}:D".($footerRow + 1))->getFont()->setSize(9)->getColor()->setARGB('FF666666');
    }

    /**
     * @param  array<int, string>  $comments
     * @param  array<int, array{number:int,category:string,text:string,average:float|null}>  $questionRows
     */
    private function buildCommentsAndPlanSheet(Worksheet $sheet, array $comments, array $questionRows): void
    {
        $this->initializeDocumentSheet($sheet);

        $sheet->setCellValue('A1', 'UNIVERSITY OF PERPETUAL HELP SYSTEM DALTA');
        $sheet->mergeCells('A1:D1');
        $sheet->setCellValue('A2', 'College of Computer Studies');
        $sheet->mergeCells('A2:D2');

        $sheet->setCellValue('A4', 'COMMENTS');
        $sheet->mergeCells('A4:D4');
        $sheet->getStyle('A4:D4')->getFont()->setBold(true);

        $row = 5;
        if ($comments === []) {
            $sheet->setCellValue("A{$row}", 'No comments submitted.');
            $sheet->mergeCells("A{$row}:D{$row}");
            $row++;
        } else {
            foreach ($comments as $comment) {
                $sheet->setCellValue("A{$row}", $comment);
                $sheet->mergeCells("A{$row}:D{$row}");
                $row++;
            }
        }

        $commentEndRow = $row - 1;
        $sheet->getStyle("A5:D{$commentEndRow}")->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);

        $row += 2;
        $sheet->setCellValue("A{$row}", 'Teachers Action Plan :');
        $sheet->mergeCells("A{$row}:D{$row}");
        $sheet->getStyle("A{$row}")->getFont()->setBold(true);
        $row++;

        foreach ($this->buildActionPlanItems($questionRows) as $index => $item) {
            $sheet->setCellValue("A{$row}", sprintf('%d. %s', $index + 1, $item));
            $sheet->mergeCells("A{$row}:D{$row}");
            $row++;
        }

        $row += 2;
        $sheet->setCellValue("A{$row}", 'Conforme :');
        $sheet->mergeCells("A{$row}:D{$row}");
        $row += 2;
        $sheet->setCellValue("A{$row}", 'Sign / Date');
        $sheet->mergeCells("A{$row}:D{$row}");

        $footerRow = max($row + 6, 45);
        $sheet->setCellValue("A{$footerRow}", 'Salawag-Zapote Road, Molino 3, City of Bacoor, 4102 Philippines • Tel. No.: (046) 477-0602');
        $sheet->mergeCells("A{$footerRow}:D{$footerRow}");
        $sheet->setCellValue("A".($footerRow + 1), 'www.perpetualdalta.edu.ph Molino Campus');
        $sheet->mergeCells('A'.($footerRow + 1).':D'.($footerRow + 1));

        $sheet->getStyle('A1:D1')->getFont()->setBold(true)->setSize(20)->getColor()->setARGB('FFB06060');
        $sheet->getStyle('A2:D2')->getFont()->setItalic(true)->setSize(11);
        $sheet->getStyle("A{$footerRow}:D".($footerRow + 1))->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet->getStyle("A{$footerRow}:D".($footerRow + 1))->getFont()->setSize(9)->getColor()->setARGB('FF666666');
    }

    /**
     * @param  array<int, ClassSection>  $classSections
     * @param  array<int, object>  $summaryMap
     */
    private function buildOverallSummarySheet(Worksheet $sheet, array $classSections, array $summaryMap): void
    {
        $this->initializeDocumentSheet($sheet);

        $sheet->setCellValue('A1', 'UNIVERSITY OF PERPETUAL HELP SYSTEM DALTA');
        $sheet->mergeCells('A1:G1');
        $sheet->setCellValue('A2', 'College of Computer Studies - OVERALL EVALUATION SUMMARY');
        $sheet->mergeCells('A2:G2');

        $sheet->setCellValue('A4', 'SUBJECT');
        $sheet->setCellValue('B4', 'FACULTY');
        $sheet->setCellValue('C4', 'SECTION');
        $sheet->setCellValue('D4', 'TERM');
        $sheet->setCellValue('E4', 'SCHOOL YEAR');
        $sheet->setCellValue('F4', 'AVERAGE');
        $sheet->setCellValue('G4', 'REMARKS');

        $row = 5;
        foreach ($classSections as $classSection) {
            $summary = $summaryMap[$classSection->id] ?? null;
            $average = $summary?->overall_average !== null ? (float) $summary->overall_average : null;

            $sheet->setCellValue("A{$row}", ($classSection->subject?->code ?? '').' - '.($classSection->subject?->title ?? ''));
            $sheet->setCellValue("B{$row}", $classSection->faculty?->name ?? '');
            $sheet->setCellValue("C{$row}", $classSection->section?->code ?? '');
            $sheet->setCellValue("D{$row}", $classSection->term ?? '');
            $sheet->setCellValue("E{$row}", $classSection->school_year ?? '');
            $sheet->setCellValue("F{$row}", $average);
            $sheet->setCellValue("G{$row}", $this->remarkFromAverage($average));
            $sheet->getStyle("F{$row}")->getNumberFormat()->setFormatCode('0.00');
            $row++;
        }

        $endRow = max(5, $row - 1);
        $sheet->getStyle('A1:G1')->getFont()->setBold(true)->setSize(18)->getColor()->setARGB('FFB06060');
        $sheet->getStyle('A2:G2')->getFont()->setItalic(true)->setSize(11);
        $sheet->getStyle('A4:G4')->getFont()->setBold(true);
        $sheet->getStyle("A4:G{$endRow}")->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);
        $sheet->getStyle("F5:F{$endRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
    }

    /**
     * @param  array<int, array{number:int,category:string,text:string,average:float|null}>  $questionRows
     */
    private function buildOverallQuestionAveragesSheet(Worksheet $sheet, array $questionRows): void
    {
        $this->initializeDocumentSheet($sheet);

        $sheet->setCellValue('A1', 'OVERALL QUESTION AVERAGES');
        $sheet->mergeCells('A1:D1');
        $sheet->setCellValue('A3', 'CRITERIA');
        $sheet->mergeCells('A3:B3');
        $sheet->setCellValue('C3', 'Average');
        $sheet->setCellValue('D3', 'Remarks');

        $row = 4;
        foreach ($questionRows as $questionRow) {
            $sheet->setCellValue("A{$row}", $questionRow['text']);
            $sheet->mergeCells("A{$row}:B{$row}");
            $sheet->setCellValue("C{$row}", $questionRow['average']);
            $sheet->setCellValue("D{$row}", $this->remarkFromAverage($questionRow['average']));
            $sheet->getStyle("C{$row}")->getNumberFormat()->setFormatCode('0.00');
            $row++;
        }

        $endRow = max(4, $row - 1);
        $sheet->getStyle('A1:D1')->getFont()->setBold(true)->setSize(16)->getColor()->setARGB('FFB06060');
        $sheet->getStyle('A3:D3')->getFont()->setBold(true);
        $sheet->getStyle("A3:D{$endRow}")->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);
    }

    private function initializeDocumentSheet(Worksheet $sheet): void
    {
        $sheet->getDefaultRowDimension()->setRowHeight(18);
        $sheet->getColumnDimension('A')->setWidth(55);
        $sheet->getColumnDimension('B')->setWidth(8);
        $sheet->getColumnDimension('C')->setWidth(12);
        $sheet->getColumnDimension('D')->setWidth(22);

        $sheet->getStyle('A:D')->getAlignment()->setVertical(Alignment::VERTICAL_CENTER);
        $sheet->getStyle('A:D')->getAlignment()->setWrapText(true);
    }

    private function remarkFromAverage(?float $average): string
    {
        if ($average === null) {
            return '-';
        }

        return match (true) {
            $average >= 4.5 => 'OUTSTANDING',
            $average >= 3.5 => 'VERY SATISFACTORY',
            $average >= 2.5 => 'SATISFACTORY',
            $average >= 1.5 => 'FAIR',
            default => 'POOR',
        };
    }

    /**
     * @param  array<int, array{number:int,category:string,text:string,average:float|null}>  $questionRows
     * @return array<int, string>
     */
    private function buildActionPlanItems(array $questionRows): array
    {
        $lowestThree = collect($questionRows)
            ->filter(fn (array $row): bool => $row['average'] !== null)
            ->sortBy('average')
            ->take(3)
            ->values();

        if ($lowestThree->isEmpty()) {
            return [
                'Sustain excellence in teaching delivery and student engagement.',
                'Continue evidence-based instructional improvement practices.',
                'Maintain strong mentoring and classroom management routines.',
            ];
        }

        return $lowestThree
            ->map(fn (array $row): string => 'Enhance '.$row['text'])
            ->all();
    }
}
