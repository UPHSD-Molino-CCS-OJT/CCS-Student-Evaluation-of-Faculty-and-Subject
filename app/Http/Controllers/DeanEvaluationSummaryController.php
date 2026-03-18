<?php

namespace App\Http\Controllers;

use App\Models\ClassSection;
use App\Models\Evaluation;
use App\Models\EvaluationSetting;
use App\Models\EvaluationResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
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

    public function previewClassSection(ClassSection $classSection): HttpResponse
    {
        $data = $this->buildClassSectionSummaryData($classSection);

        return response($this->renderClassPreviewHtml($data), HttpResponse::HTTP_OK, [
            'Content-Type' => 'text/html; charset=UTF-8',
        ]);
    }

    public function previewOverall(): HttpResponse
    {
        $data = $this->buildOverallSummaryData();

        return response($this->renderOverallPreviewHtml($data), HttpResponse::HTTP_OK, [
            'Content-Type' => 'text/html; charset=UTF-8',
        ]);
    }

    public function exportClassSection(Request $request, ClassSection $classSection): StreamedResponse|HttpResponse
    {
        $data = $this->buildClassSectionSummaryData($classSection);
        $format = $this->resolveExportFormat($request);

        if ($format === 'doc') {
            $fileName = sprintf(
                'evaluation-summary-%s-%s.doc',
                $data['classSection']->subject?->code ?? 'subject',
                now()->format('Ymd-His')
            );

            return response($this->renderClassDocHtml($data), HttpResponse::HTTP_OK, [
                'Content-Type' => 'application/msword',
                'Content-Disposition' => 'attachment; filename='.$fileName,
            ]);
        }

        $fileName = sprintf(
            'evaluation-summary-%s-%s.xlsx',
            $data['classSection']->subject?->code ?? 'subject',
            now()->format('Ymd-His')
        );

        return response()->streamDownload(function () use ($data): void {
            $spreadsheet = new Spreadsheet();
            $sheet = $spreadsheet->getActiveSheet();
            $sheet->setTitle('Summary');

            $this->buildClassSummarySheet(
                $sheet,
                $data['classSection'],
                $data['respondents'],
                $data['overallAverage'],
                $data['questionRows'],
                $data['comments'],
            );

            $continuationSheet = new Worksheet($spreadsheet, 'Comments & Plan');
            $spreadsheet->addSheet($continuationSheet);
            $this->buildCommentsAndPlanSheet($continuationSheet, $data['comments'], $data['questionRows']);

            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');
        }, $fileName, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    public function exportOverall(Request $request): StreamedResponse|HttpResponse
    {
        $data = $this->buildOverallSummaryData();
        $format = $this->resolveExportFormat($request);

        if ($format === 'doc') {
            $fileName = 'evaluation-summary-overall-'.now()->format('Ymd-His').'.doc';

            return response($this->renderOverallDocHtml($data), HttpResponse::HTTP_OK, [
                'Content-Type' => 'application/msword',
                'Content-Disposition' => 'attachment; filename='.$fileName,
            ]);
        }

        $fileName = 'evaluation-summary-overall-'.now()->format('Ymd-His').'.xlsx';

        return response()->streamDownload(function () use ($data): void {
            $spreadsheet = new Spreadsheet();
            $sheet = $spreadsheet->getActiveSheet();
            $sheet->setTitle('Overall Summary');

            $this->buildOverallSummarySheet($sheet, $data['classSections'], $data['summaryMap']);

            $questionSheet = new Worksheet($spreadsheet, 'Question Averages');
            $spreadsheet->addSheet($questionSheet);
            $this->buildOverallQuestionAveragesSheet($questionSheet, $data['overallQuestionRows']);

            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');
        }, $fileName, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    /**
     * @return array{
     *   classSection:ClassSection,
     *   respondents:int,
     *   overallAverage:float|null,
     *   questionRows:array<int, array{number:int,category:string,text:string,average:float|null}>,
     *   comments:array<int, string>
     * }
     */
    private function buildClassSectionSummaryData(ClassSection $classSection): array
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
        })->values()->all();

        $comments = Evaluation::query()
            ->where('class_section_id', $classSection->id)
            ->whereNotNull('comments')
            ->where('comments', '!=', '')
            ->orderBy('submitted_at')
            ->pluck('comments')
            ->map(fn (string $comment): string => trim($comment))
            ->filter(fn (string $comment): bool => $comment !== '')
            ->values()
            ->all();

        return [
            'classSection' => $classSection,
            'respondents' => (int) ($summary?->respondents ?? 0),
            'overallAverage' => $summary?->overall_average !== null ? (float) $summary->overall_average : null,
            'questionRows' => $questionRows,
            'comments' => $comments,
        ];
    }

    /**
     * @return array{
     *   classSections:array<int, ClassSection>,
     *   summaryMap:array<int, object>,
     *   overallQuestionRows:array<int, array{number:int,category:string,text:string,average:float|null}>
     * }
     */
    private function buildOverallSummaryData(): array
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
        $overallQuestionRows = $questions->map(function (array $question) use ($overallQuestionAverages): array {
            $questionNumber = (int) ($question['number'] ?? 0);
            $average = $overallQuestionAverages->get($questionNumber)?->average_rating;

            return [
                'number' => $questionNumber,
                'category' => $question['category'] ?? '',
                'text' => $question['text'] ?? '',
                'average' => $average !== null ? (float) $average : null,
            ];
        })->values()->all();

        return [
            'classSections' => $classSections->all(),
            'summaryMap' => $summaryMap->all(),
            'overallQuestionRows' => $overallQuestionRows,
        ];
    }

    private function resolveExportFormat(Request $request): string
    {
        $format = strtolower($request->query('format', 'xlsx'));

        return in_array($format, ['xlsx', 'doc'], true) ? $format : 'xlsx';
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

    /**
     * @param  array{classSection:ClassSection,respondents:int,overallAverage:float|null,questionRows:array<int, array{number:int,category:string,text:string,average:float|null}>,comments:array<int, string>}  $data
     */
    private function renderClassPreviewHtml(array $data): string
    {
        $classSection = $data['classSection'];
        $subject = htmlspecialchars(($classSection->subject?->code ?? '').' - '.($classSection->subject?->title ?? ''));
        $faculty = htmlspecialchars((string) ($classSection->faculty?->name ?? ''));
        $term = htmlspecialchars((string) ($classSection->term ?? ''));
        $schoolYear = htmlspecialchars((string) ($classSection->school_year ?? ''));
        $baseExportUrl = '/dean/summaries/class-sections/'.$classSection->id.'/export';

        $rowsHtml = '';
        foreach ($data['questionRows'] as $row) {
            $avg = $row['average'] !== null ? number_format($row['average'], 2) : '-';
            $remarks = htmlspecialchars($this->remarkFromAverage($row['average']));
            $criteria = htmlspecialchars($row['text']);
            $rowsHtml .= "<tr><td>{$criteria}</td><td class=\"right\">{$avg}</td><td>{$remarks}</td></tr>";
        }

        $averageText = $data['overallAverage'] !== null ? number_format($data['overallAverage'], 2) : '-';
        $averageRemark = htmlspecialchars($this->remarkFromAverage($data['overallAverage']));
        $rowsHtml .= "<tr class=\"avg\"><td>AVERAGE</td><td class=\"right\">{$averageText}</td><td>{$averageRemark}</td></tr>";

        $commentsHtml = '';
        if ($data['comments'] === []) {
            $commentsHtml = '<tr><td>No comments submitted.</td></tr>';
        } else {
            foreach ($data['comments'] as $comment) {
                $commentsHtml .= '<tr><td>'.htmlspecialchars($comment).'</td></tr>';
            }
        }

        return "<!doctype html>
<html>
<head>
    <meta charset=\"utf-8\" />
    <title>Evaluation Summary Preview</title>
    <style>
        body{font-family:Arial,sans-serif;background:#f3f3f3;margin:0;padding:0;color:#111}
        .toolbar{position:sticky;top:0;background:#fff;border-bottom:1px solid #ddd;padding:10px 16px;display:flex;gap:8px;z-index:10}
        .btn{display:inline-block;padding:8px 12px;border:1px solid #c8c8c8;background:#fff;text-decoration:none;color:#111;border-radius:6px;font-size:13px}
        .btn.primary{background:#8e5757;color:#fff;border-color:#8e5757}
        .page{max-width:900px;margin:20px auto;background:#fff;padding:24px 28px;box-shadow:0 4px 20px rgba(0,0,0,.08)}
        h1{margin:0;font-size:34px;line-height:1;color:#b06464;font-weight:800}
        .sub{font-size:14px;color:#555;margin-top:4px}
        .meta{display:flex;justify-content:space-between;margin:16px 0 18px;font-size:13px}
        table{width:100%;border-collapse:collapse}
        th,td{border:1px solid #111;padding:6px 8px;font-size:12px;vertical-align:top}
        th{background:#efefef;text-align:left}
        .right{text-align:right}
        .avg td{font-weight:700}
        .section-title{margin:14px 0 6px;font-size:13px;font-weight:700}
        .footer{margin-top:22px;padding-top:8px;border-top:2px solid #b06464;color:#666;text-align:center;font-size:11px}
        @media print{.toolbar{display:none}.page{box-shadow:none;margin:0;max-width:none}}
    </style>
</head>
<body>
    <div class=\"toolbar\">
        <a class=\"btn primary\" href=\"{$baseExportUrl}?format=xlsx\">Download Excel</a>
        <a class=\"btn\" href=\"{$baseExportUrl}?format=doc\">Download DOC</a>
        <button class=\"btn\" onclick=\"window.print()\">Print</button>
    </div>
    <div class=\"page\">
        <h1>UNIVERSITY OF PERPETUAL HELP SYSTEM DALTA</h1>
        <div class=\"sub\">College of Computer Studies</div>
        <div class=\"meta\">
            <div>PERIOD : {$term} {$schoolYear}<br />NAME : {$faculty}</div>
            <div>SUBJECT/S : {$subject}<br />EVALUATORS : {$data['respondents']} STUDENTS</div>
        </div>

        <div class=\"section-title\">STUDENT EVALUATION</div>
        <table>
            <thead>
                <tr><th>CRITERIA</th><th style=\"width:110px\">Average</th><th style=\"width:180px\">Remarks</th></tr>
            </thead>
            <tbody>{$rowsHtml}</tbody>
        </table>

        <div class=\"section-title\">COMMENTS</div>
        <table><tbody>{$commentsHtml}</tbody></table>

        <div class=\"footer\">Salawag-Zapote Road, Molino 3, City of Bacoor, 4102 Philippines • Tel. No.: (046) 477-0602<br />www.perpetualdalta.edu.ph Molino Campus</div>
    </div>
</body>
</html>";
    }

    /**
     * @param  array{classSections:array<int, ClassSection>,summaryMap:array<int, object>,overallQuestionRows:array<int, array{number:int,category:string,text:string,average:float|null}>}  $data
     */
    private function renderOverallPreviewHtml(array $data): string
    {
        $rowsHtml = '';
        foreach ($data['classSections'] as $classSection) {
            $summary = $data['summaryMap'][$classSection->id] ?? null;
            $average = $summary?->overall_average !== null ? number_format((float) $summary->overall_average, 2) : '-';
            $remarks = htmlspecialchars($this->remarkFromAverage($summary?->overall_average !== null ? (float) $summary->overall_average : null));
            $subject = htmlspecialchars(($classSection->subject?->code ?? '').' - '.($classSection->subject?->title ?? ''));
            $faculty = htmlspecialchars((string) ($classSection->faculty?->name ?? ''));
            $section = htmlspecialchars((string) ($classSection->section?->code ?? ''));
            $term = htmlspecialchars((string) ($classSection->term ?? ''));
            $sy = htmlspecialchars((string) ($classSection->school_year ?? ''));
            $rowsHtml .= "<tr><td>{$subject}</td><td>{$faculty}</td><td>{$section}</td><td>{$term}</td><td>{$sy}</td><td class=\"right\">{$average}</td><td>{$remarks}</td></tr>";
        }

        $questionRowsHtml = '';
        foreach ($data['overallQuestionRows'] as $row) {
            $avg = $row['average'] !== null ? number_format($row['average'], 2) : '-';
            $remarks = htmlspecialchars($this->remarkFromAverage($row['average']));
            $criteria = htmlspecialchars($row['text']);
            $questionRowsHtml .= "<tr><td>{$criteria}</td><td class=\"right\">{$avg}</td><td>{$remarks}</td></tr>";
        }

        return "<!doctype html>
<html>
<head>
    <meta charset=\"utf-8\" />
    <title>Overall Evaluation Summary Preview</title>
    <style>
        body{font-family:Arial,sans-serif;background:#f3f3f3;margin:0;padding:0;color:#111}
        .toolbar{position:sticky;top:0;background:#fff;border-bottom:1px solid #ddd;padding:10px 16px;display:flex;gap:8px;z-index:10}
        .btn{display:inline-block;padding:8px 12px;border:1px solid #c8c8c8;background:#fff;text-decoration:none;color:#111;border-radius:6px;font-size:13px}
        .btn.primary{background:#8e5757;color:#fff;border-color:#8e5757}
        .page{max-width:980px;margin:20px auto;background:#fff;padding:24px 28px;box-shadow:0 4px 20px rgba(0,0,0,.08)}
        h1{margin:0;font-size:30px;line-height:1;color:#b06464;font-weight:800}
        .sub{font-size:14px;color:#555;margin-top:4px}
        table{width:100%;border-collapse:collapse;margin-top:10px}
        th,td{border:1px solid #111;padding:6px 8px;font-size:12px;vertical-align:top}
        th{background:#efefef;text-align:left}
        .right{text-align:right}
        .section-title{margin:14px 0 6px;font-size:13px;font-weight:700}
        .footer{margin-top:22px;padding-top:8px;border-top:2px solid #b06464;color:#666;text-align:center;font-size:11px}
        @media print{.toolbar{display:none}.page{box-shadow:none;margin:0;max-width:none}}
    </style>
</head>
<body>
    <div class=\"toolbar\">
        <a class=\"btn primary\" href=\"/dean/summaries/export?format=xlsx\">Download Excel</a>
        <a class=\"btn\" href=\"/dean/summaries/export?format=doc\">Download DOC</a>
        <button class=\"btn\" onclick=\"window.print()\">Print</button>
    </div>
    <div class=\"page\">
        <h1>UNIVERSITY OF PERPETUAL HELP SYSTEM DALTA</h1>
        <div class=\"sub\">College of Computer Studies - Overall Evaluation Summary</div>

        <div class=\"section-title\">CLASS EVALUATION SUMMARY</div>
        <table>
            <thead>
                <tr><th>SUBJECT</th><th>FACULTY</th><th>SECTION</th><th>TERM</th><th>SCHOOL YEAR</th><th>AVERAGE</th><th>REMARKS</th></tr>
            </thead>
            <tbody>{$rowsHtml}</tbody>
        </table>

        <div class=\"section-title\">OVERALL QUESTION AVERAGES</div>
        <table>
            <thead>
                <tr><th>CRITERIA</th><th style=\"width:110px\">Average</th><th style=\"width:180px\">Remarks</th></tr>
            </thead>
            <tbody>{$questionRowsHtml}</tbody>
        </table>

        <div class=\"footer\">Salawag-Zapote Road, Molino 3, City of Bacoor, 4102 Philippines • Tel. No.: (046) 477-0602<br />www.perpetualdalta.edu.ph Molino Campus</div>
    </div>
</body>
</html>";
    }

    /**
     * @param  array{classSection:ClassSection,respondents:int,overallAverage:float|null,questionRows:array<int, array{number:int,category:string,text:string,average:float|null}>,comments:array<int, string>}  $data
     */
    private function renderClassDocHtml(array $data): string
    {
        return $this->renderClassPreviewHtml($data);
    }

    /**
     * @param  array{classSections:array<int, ClassSection>,summaryMap:array<int, object>,overallQuestionRows:array<int, array{number:int,category:string,text:string,average:float|null}>}  $data
     */
    private function renderOverallDocHtml(array $data): string
    {
        return $this->renderOverallPreviewHtml($data);
    }
}
