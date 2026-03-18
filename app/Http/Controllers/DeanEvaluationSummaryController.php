<?php

namespace App\Http\Controllers;

use App\Models\ClassSection;
use App\Models\Evaluation;
use App\Models\ExportDocumentTemplate;
use App\Models\EvaluationSetting;
use App\Models\EvaluationResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Str;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;
use Throwable;
use ZipArchive;

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

        $template = ExportDocumentTemplate::current();

        return Inertia::render('dean/summaries/index', [
            'questions' => config('evaluation.questions'),
            'rows' => $rows,
            'evaluationOpen' => EvaluationSetting::isOpen(),
            'currentTemplate' => [
                'sourceFilename' => $template->source_filename,
                'updatedAt' => $template->updated_at?->toDateTimeString(),
            ],
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

    public function storeTemplate(Request $request): RedirectResponse
    {
        $payload = $request->validate([
            'template_file' => ['required', 'file', 'mimes:docx'],
        ]);

        $templateFile = $payload['template_file'];
        try {
            $fragments = $this->extractHeaderFooterFromDocx((string) $templateFile->getRealPath());
        } catch (Throwable $exception) {
            report($exception);

            $errorMessage = 'Unable to read the uploaded DOCX template on this server. Ensure the file is a valid .docx and the PHP zip extension is enabled.';

            if (str_contains($exception->getMessage(), 'zip extension is not available')) {
                $errorMessage = 'DOCX import is not available on this Railway runtime because PHP zip (ZipArchive) is missing. Enable ext-zip in the deployment image or use Preview Edit mode to save header/footer manually.';
            } elseif (str_contains($exception->getMessage(), 'Unable to open DOCX archive')) {
                $errorMessage = 'The uploaded file could not be opened as a DOCX archive. Re-save it as Word .docx (not .doc or exported PDF) and try again.';
            }

            return back()->withErrors([
                'template_file' => $errorMessage,
            ]);
        }

        if ($fragments['header_html'] === null && $fragments['footer_html'] === null) {
            return back()->withErrors([
                'template_file' => 'No header/footer was found in the uploaded .docx template.',
            ]);
        }

        $template = ExportDocumentTemplate::current();
        $template->fill([
            'header_html' => $fragments['header_html'],
            'footer_html' => $fragments['footer_html'],
            'header_text' => $fragments['header_text'],
            'footer_text' => $fragments['footer_text'],
            'source_filename' => $templateFile->getClientOriginalName(),
            'updated_by' => $request->user()?->id,
        ]);
        $template->save();

        $imageCount = (int) ($fragments['header_image_count'] ?? 0) + (int) ($fragments['footer_image_count'] ?? 0);
        $status = 'Template imported successfully and set as default for all previews and exports.';

        if ($imageCount > 0) {
            $status .= ' Imported '.$imageCount.' image(s) from header/footer.';
        }

        return back()->with('status', $status);
    }

    public function storeTemplateManual(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'header_html' => ['nullable', 'string', 'max:20000'],
            'footer_html' => ['nullable', 'string', 'max:20000'],
            'header_text' => ['nullable', 'string', 'max:1000'],
            'footer_text' => ['nullable', 'string', 'max:1000'],
        ]);

        $template = ExportDocumentTemplate::current();
        $template->fill([
            'header_html' => $payload['header_html'] ?? null,
            'footer_html' => $payload['footer_html'] ?? null,
            'header_text' => $payload['header_text'] ?? null,
            'footer_text' => $payload['footer_text'] ?? null,
            'source_filename' => 'manual-preview-edit',
            'updated_by' => $request->user()?->id,
        ]);
        $template->save();

        return response()->json([
            'status' => 'Template header/footer saved from preview editor.',
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

            $template = ExportDocumentTemplate::current();
            $this->applyTemplateHeaderFooterToSheet($sheet, $template->header_text, $template->footer_text);

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
            $this->applyTemplateHeaderFooterToSheet($continuationSheet, $template->header_text, $template->footer_text);
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

            $template = ExportDocumentTemplate::current();
            $this->applyTemplateHeaderFooterToSheet($sheet, $template->header_text, $template->footer_text);

            $this->buildOverallSummarySheet($sheet, $data['classSections'], $data['summaryMap']);

            $questionSheet = new Worksheet($spreadsheet, 'Question Averages');
            $spreadsheet->addSheet($questionSheet);
            $this->applyTemplateHeaderFooterToSheet($questionSheet, $template->header_text, $template->footer_text);
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
        $template = ExportDocumentTemplate::current();
        $templateHeader = $this->sanitizeTemplateHtmlFragment($template->header_html);
        $templateFooter = $this->sanitizeTemplateHtmlFragment($template->footer_html);

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
        .template-fragment{border:1px dashed #b8b8b8;padding:8px 10px;margin-bottom:10px;font-size:12px;background:#fafafa}
        .template-fragment img{max-height:96px;max-width:100%;display:block;margin:0 0 6px}
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
        <button id=\"toggle-edit\" class=\"btn\" type=\"button\">Edit</button>
        <label id=\"upload-image-label\" class=\"btn\" for=\"upload-image\" style=\"display:none\">Upload Image</label>
        <input id=\"upload-image\" type=\"file\" accept=\"image/*\" style=\"display:none\" />
        <button id=\"add-text-block\" class=\"btn\" type=\"button\" style=\"display:none\">Add Text</button>
        <button id=\"save-template-fragments\" class=\"btn\" type=\"button\" style=\"display:none\">Save Header/Footer</button>
        <button class=\"btn\" onclick=\"window.print()\">Print</button>
    </div>
    <div class=\"page\">
        <div class=\"template-region\" data-template-region=\"header\">{$templateHeader}</div>
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

        <div class=\"template-region\" data-template-region=\"footer\">{$templateFooter}</div>
        <div class=\"footer\">Salawag-Zapote Road, Molino 3, City of Bacoor, 4102 Philippines • Tel. No.: (046) 477-0602<br />www.perpetualdalta.edu.ph Molino Campus</div>
    </div>
    <script>
        window.previewEditorConfig = {
            saveTemplateUrl: '/dean/summaries/template/manual',
            csrfToken: '".csrf_token()."'
        };
    </script>
    <script src=\"/js/preview-editor.js\"></script>
</body>
</html>";
    }

    /**
     * @param  array{classSections:array<int, ClassSection>,summaryMap:array<int, object>,overallQuestionRows:array<int, array{number:int,category:string,text:string,average:float|null}>}  $data
     */
    private function renderOverallPreviewHtml(array $data): string
    {
        $template = ExportDocumentTemplate::current();
        $templateHeader = $this->sanitizeTemplateHtmlFragment($template->header_html);
        $templateFooter = $this->sanitizeTemplateHtmlFragment($template->footer_html);

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
        .template-fragment{border:1px dashed #b8b8b8;padding:8px 10px;margin-bottom:10px;font-size:12px;background:#fafafa}
        .template-fragment img{max-height:96px;max-width:100%;display:block;margin:0 0 6px}
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
        <button id=\"toggle-edit\" class=\"btn\" type=\"button\">Edit</button>
        <label id=\"upload-image-label\" class=\"btn\" for=\"upload-image\" style=\"display:none\">Upload Image</label>
        <input id=\"upload-image\" type=\"file\" accept=\"image/*\" style=\"display:none\" />
        <button id=\"add-text-block\" class=\"btn\" type=\"button\" style=\"display:none\">Add Text</button>
        <button id=\"save-template-fragments\" class=\"btn\" type=\"button\" style=\"display:none\">Save Header/Footer</button>
        <button class=\"btn\" onclick=\"window.print()\">Print</button>
    </div>
    <div class=\"page\">
        <div class=\"template-region\" data-template-region=\"header\">{$templateHeader}</div>
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

        <div class=\"template-region\" data-template-region=\"footer\">{$templateFooter}</div>
        <div class=\"footer\">Salawag-Zapote Road, Molino 3, City of Bacoor, 4102 Philippines • Tel. No.: (046) 477-0602<br />www.perpetualdalta.edu.ph Molino Campus</div>
    </div>
    <script>
        window.previewEditorConfig = {
            saveTemplateUrl: '/dean/summaries/template/manual',
            csrfToken: '".csrf_token()."'
        };
    </script>
    <script src=\"/js/preview-editor.js\"></script>
</body>
</html>";
    }

    private function applyTemplateHeaderFooterToSheet(Worksheet $sheet, ?string $headerText, ?string $footerText): void
    {
        $header = $headerText !== null && trim($headerText) !== ''
            ? '&L'.str_replace('&', '&&', trim($headerText))
            : '';
        $footer = $footerText !== null && trim($footerText) !== ''
            ? '&L'.str_replace('&', '&&', trim($footerText))
            : '';

        $sheet->getHeaderFooter()->setOddHeader($header);
        $sheet->getHeaderFooter()->setOddFooter($footer);
    }

    /**
     * @return array{header_html:string|null,footer_html:string|null,header_text:string|null,footer_text:string|null,header_image_count:int,footer_image_count:int}
     */
    private function extractHeaderFooterFromDocx(string $filePath): array
    {
        if (! class_exists(ZipArchive::class)) {
            throw new RuntimeException('PHP zip extension is not available.');
        }

        if ($filePath === '' || ! is_file($filePath)) {
            throw new RuntimeException('Uploaded DOCX temporary file is not accessible.');
        }

        $zip = new ZipArchive();
        $openResult = $zip->open($filePath);

        if ($openResult !== true) {
            throw new RuntimeException('Unable to open DOCX archive: '.$this->zipOpenErrorToMessage($openResult));
        }

        $headerPartNames = $this->collectDocxPartNames($zip, '/^word\/header\d+\.xml$/');
        $footerPartNames = $this->collectDocxPartNames($zip, '/^word\/footer\d+\.xml$/');

        $headerFragment = $this->buildDocxTemplateFragment($zip, $headerPartNames);
        $footerFragment = $this->buildDocxTemplateFragment($zip, $footerPartNames);
        $zip->close();

        return [
            'header_html' => $headerFragment['html'],
            'footer_html' => $footerFragment['html'],
            'header_text' => $this->htmlToPlainText($headerFragment['html']),
            'footer_text' => $this->htmlToPlainText($footerFragment['html']),
            'header_image_count' => $headerFragment['image_count'],
            'footer_image_count' => $footerFragment['image_count'],
        ];
    }

    /**
     * @return array<int, string>
     */
    private function collectDocxPartNames(ZipArchive $zip, string $pattern): array
    {
        $partNames = [];

        for ($index = 0; $index < $zip->numFiles; $index++) {
            $name = $zip->getNameIndex($index);

            if ($name === false || preg_match($pattern, $name) !== 1) {
                continue;
            }

            $partNames[] = $name;
        }

        return $partNames;
    }

    /**
     * @param  array<int, string>  $partNames
     * @return array{html:string|null,image_count:int}
     */
    private function buildDocxTemplateFragment(ZipArchive $zip, array $partNames): array
    {
        $htmlFragments = [];
        $imageCount = 0;

        foreach ($partNames as $partName) {
            $partXml = $zip->getFromName($partName);

            if ($partXml === false || trim($partXml) === '') {
                continue;
            }

            $imageTags = $this->extractDocxImageTags($zip, $partName, $partXml);
            $textLines = $this->extractDocxTextLines($partXml);

            if ($imageTags === [] && $textLines === []) {
                continue;
            }

            $imageCount += count($imageTags);

            $fragment = '<div class="template-fragment">';

            foreach ($imageTags as $imageTag) {
                $fragment .= $imageTag;
            }

            foreach ($textLines as $line) {
                $fragment .= '<div>'.htmlspecialchars($line).'</div>';
            }

            $fragment .= '</div>';
            $htmlFragments[] = $fragment;
        }

        if ($htmlFragments === []) {
            return [
                'html' => null,
                'image_count' => 0,
            ];
        }

        return [
            'html' => implode('', $htmlFragments),
            'image_count' => $imageCount,
        ];
    }

    /**
     * @return array<int, string>
     */
    private function extractDocxTextLines(string $partXml): array
    {
        $paragraphMatches = [];
        preg_match_all('/<w:p\b[^>]*>(.*?)<\/w:p>/is', $partXml, $paragraphMatches);

        $paragraphBodies = $paragraphMatches[1] ?? [];

        if ($paragraphBodies === []) {
            $paragraphBodies = [$partXml];
        }

        $lines = [];

        foreach ($paragraphBodies as $paragraphBody) {
            $textMatches = [];
            preg_match_all('/<w:t\b[^>]*>(.*?)<\/w:t>/is', $paragraphBody, $textMatches);

            $segments = $textMatches[1] ?? [];

            if ($segments === []) {
                continue;
            }

            $line = collect($segments)
                ->map(fn (string $segment): string => html_entity_decode($segment, ENT_QUOTES | ENT_HTML5, 'UTF-8'))
                ->implode('');

            $line = trim($line);

            if ($line !== '') {
                $lines[] = $line;
            }
        }

        return $lines;
    }

    /**
     * @return array<int, string>
     */
    private function extractDocxImageTags(ZipArchive $zip, string $partName, string $partXml): array
    {
        $relationshipMap = $this->extractDocxImageRelationships($zip, $partName);

        if ($relationshipMap === []) {
            return [];
        }

        $embedMatches = [];
        preg_match_all('/r:embed="([^"]+)"/i', $partXml, $embedMatches);
        $orderedRelationshipIds = $embedMatches[1] ?? [];

        if ($orderedRelationshipIds === []) {
            $legacyMatches = [];
            preg_match_all('/r:id="([^"]+)"/i', $partXml, $legacyMatches);
            $orderedRelationshipIds = $legacyMatches[1] ?? [];
        }

        if ($orderedRelationshipIds === []) {
            return [];
        }

        $imageTags = [];
        $usedRelationshipIds = [];

        foreach ($orderedRelationshipIds as $relationshipId) {
            if (isset($usedRelationshipIds[$relationshipId]) || ! isset($relationshipMap[$relationshipId])) {
                continue;
            }

            $usedRelationshipIds[$relationshipId] = true;

            $imagePath = $this->normalizeDocxPath($relationshipMap[$relationshipId]);
            $imageBinary = $zip->getFromName($imagePath);

            if ($imageBinary === false) {
                continue;
            }

            $mimeType = $this->mimeTypeFromPath($imagePath);
            if ($mimeType === null) {
                continue;
            }

            $imageTags[] = '<img src="data:'.$mimeType.';base64,'.base64_encode($imageBinary).'" alt="Template image" />';
        }

        return $imageTags;
    }

    /**
     * @return array<string, string>
     */
    private function extractDocxImageRelationships(ZipArchive $zip, string $partName): array
    {
        $directory = dirname($partName);
        $baseName = basename($partName);
        $relationshipsPath = $directory.'/_rels/'.$baseName.'.rels';
        $relationshipsXml = $zip->getFromName($relationshipsPath);

        if ($relationshipsXml === false || trim($relationshipsXml) === '') {
            return [];
        }

        $relationshipMatches = [];
        preg_match_all('/<Relationship\b[^>]*\bId="([^"]+)"[^>]*\bType="([^"]+)"[^>]*\bTarget="([^"]+)"[^>]*\/?>/i', $relationshipsXml, $relationshipMatches, PREG_SET_ORDER);

        if ($relationshipMatches === []) {
            return [];
        }

        $relationshipMap = [];

        foreach ($relationshipMatches as $match) {
            $relationshipId = $match[1] ?? '';
            $relationshipType = $match[2] ?? '';
            $relationshipTarget = $match[3] ?? '';

            if ($relationshipId === '' || $relationshipTarget === '' || ! str_contains($relationshipType, '/image')) {
                continue;
            }

            if (str_starts_with($relationshipTarget, '/')) {
                $relationshipMap[$relationshipId] = ltrim($relationshipTarget, '/');
                continue;
            }

            $relationshipMap[$relationshipId] = $directory.'/'.$relationshipTarget;
        }

        return $relationshipMap;
    }

    private function normalizeDocxPath(string $path): string
    {
        $segments = preg_split('#/+?#', str_replace('\\', '/', $path)) ?: [];
        $normalized = [];

        foreach ($segments as $segment) {
            if ($segment === '' || $segment === '.') {
                continue;
            }

            if ($segment === '..') {
                array_pop($normalized);
                continue;
            }

            $normalized[] = $segment;
        }

        return implode('/', $normalized);
    }

    private function mimeTypeFromPath(string $path): ?string
    {
        $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));

        return match ($extension) {
            'png' => 'image/png',
            'jpg', 'jpeg' => 'image/jpeg',
            'gif' => 'image/gif',
            'bmp' => 'image/bmp',
            'webp' => 'image/webp',
            default => null,
        };
    }

    private function htmlToPlainText(?string $html): ?string
    {
        if ($html === null || trim($html) === '') {
            return null;
        }

        $plain = strip_tags(str_replace(['<br>', '<br/>', '<br />'], "\n", $html));
        $plain = preg_replace('/\n\s*\n+/', "\n", $plain) ?? $plain;
        $plain = trim($plain);

        return $plain === '' ? null : Str::limit($plain, 250);
    }

    private function sanitizeTemplateHtmlFragment(?string $html): string
    {
        if ($html === null || trim($html) === '') {
            return '';
        }

        return $html;
    }

    private function zipOpenErrorToMessage(int|string $openResult): string
    {
        if (! is_int($openResult)) {
            return 'unknown error';
        }

        return match ($openResult) {
            ZipArchive::ER_NOZIP => 'not a zip archive',
            ZipArchive::ER_INCONS => 'zip archive inconsistent or corrupted',
            ZipArchive::ER_MEMORY => 'memory allocation failure',
            ZipArchive::ER_READ => 'read error',
            ZipArchive::ER_OPEN => 'cannot open file',
            ZipArchive::ER_NOENT => 'file does not exist',
            default => 'zip error code '.$openResult,
        };
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
