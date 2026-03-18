<?php

namespace App\Http\Controllers;

use App\Models\ClassSection;
use App\Models\Evaluation;
use App\Models\ExportDocumentTemplate;
use App\Models\EvaluationSetting;
use App\Models\EvaluationResponse;
use Illuminate\Database\QueryException;
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
    private const MAX_TEMPLATE_HTML_LENGTH = 1000000;

    private const MAX_TEMPLATE_TEXT_LENGTH = 5000;

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

        $headerHtml = $fragments['header_html'] ?? null;
        $footerHtml = $fragments['footer_html'] ?? null;
        $headerText = $fragments['header_text'] ?? null;
        $footerText = $fragments['footer_text'] ?? null;

        if ($headerHtml === null && $footerHtml === null) {
            return back()->withErrors([
                'template_file' => 'No header/footer was found in the uploaded .docx template.',
            ]);
        }

        $htmlLengthError = $this->validateTemplateFragmentLengths($headerHtml, $footerHtml, $headerText, $footerText);

        if ($htmlLengthError !== null) {
            return back()->withErrors([
                'template_file' => $htmlLengthError,
            ]);
        }

        $template = ExportDocumentTemplate::current();
        $template->fill([
            'header_html' => $headerHtml,
            'footer_html' => $footerHtml,
            'header_text' => $headerText,
            'footer_text' => $footerText,
            'source_filename' => $templateFile->getClientOriginalName(),
            'updated_by' => $request->user()?->id,
        ]);

        try {
            $template->save();
        } catch (QueryException $exception) {
            report($exception);

            return back()->withErrors([
                'template_file' => 'The extracted header/footer is too large to save. Reduce embedded images or simplify template formatting, then try again.',
            ]);
        }

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
            'header_html' => ['nullable', 'string', 'max:'.self::MAX_TEMPLATE_HTML_LENGTH],
            'footer_html' => ['nullable', 'string', 'max:'.self::MAX_TEMPLATE_HTML_LENGTH],
            'header_text' => ['nullable', 'string', 'max:'.self::MAX_TEMPLATE_TEXT_LENGTH],
            'footer_text' => ['nullable', 'string', 'max:'.self::MAX_TEMPLATE_TEXT_LENGTH],
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

        try {
            $template->save();
        } catch (QueryException $exception) {
            report($exception);

            return response()->json([
                'message' => 'Template content is too large to save. Reduce content size and try again.',
            ], 422);
        }

        return response()->json([
            'status' => 'Template header/footer saved from preview editor.',
        ]);
    }

    private function validateTemplateFragmentLengths(?string $headerHtml, ?string $footerHtml, ?string $headerText, ?string $footerText): ?string
    {
        if (($headerHtml !== null && Str::length($headerHtml) > self::MAX_TEMPLATE_HTML_LENGTH)
            || ($footerHtml !== null && Str::length($footerHtml) > self::MAX_TEMPLATE_HTML_LENGTH)) {
            return 'The DOCX header/footer HTML is too large. Reduce embedded images or simplify template formatting before importing.';
        }

        if (($headerText !== null && Str::length($headerText) > self::MAX_TEMPLATE_TEXT_LENGTH)
            || ($footerText !== null && Str::length($footerText) > self::MAX_TEMPLATE_TEXT_LENGTH)) {
            return 'The DOCX header/footer text is too large. Shorten text content and try importing again.';
        }

        return null;
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
    private function renderClassPreviewHtml(array $data, bool $usePrintFixedHeaderFooter = true): string
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
        $printHeaderHtml = $usePrintFixedHeaderFooter
            ? '<div class="print-header">'.$templateHeader.'</div>'
            : '';
        $printFooterHtml = $usePrintFixedHeaderFooter
            ? '<div class="print-footer">'.$templateFooter.'</div>'
            : '';

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
        .print-header,.print-footer{display:none}
        .page{max-width:900px;margin:20px auto;background:#fff;padding:24px 28px;box-shadow:0 4px 20px rgba(0,0,0,.08)}
        .meta{display:flex;justify-content:space-between;margin:16px 0 18px;font-size:13px}
        .template-fragment{border:0;padding:0;margin:0;background:transparent;font-size:inherit}
        .template-fragment img{display:block;margin:0}
        table{width:100%;border-collapse:collapse}
        th,td{border:1px solid #111;padding:6px 8px;font-size:12px;vertical-align:top}
        th{background:#efefef;text-align:left}
        .right{text-align:right}
        .avg td{font-weight:700}
        .section-title{margin:14px 0 6px;font-size:13px;font-weight:700}
        @media print{
            body{background:#fff}
            .toolbar{display:none}
            .print-header,.print-footer{display:block;position:fixed;left:0;right:0;background:#fff;z-index:999}
            .print-header{top:0;padding:8px 28px 0}
            .print-footer{bottom:0;padding:0 28px 8px}
            .page{box-shadow:none;margin:0;max-width:none;padding:132px 28px 120px}
            .template-region{display:none}
        }
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
    {$printHeaderHtml}
    {$printFooterHtml}
    <div class=\"page\">
        <div class=\"template-region\" data-template-region=\"header\">{$templateHeader}</div>
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
    private function renderOverallPreviewHtml(array $data, bool $usePrintFixedHeaderFooter = true): string
    {
        $template = ExportDocumentTemplate::current();
        $templateHeader = $this->sanitizeTemplateHtmlFragment($template->header_html);
        $templateFooter = $this->sanitizeTemplateHtmlFragment($template->footer_html);
        $printHeaderHtml = $usePrintFixedHeaderFooter
            ? '<div class="print-header">'.$templateHeader.'</div>'
            : '';
        $printFooterHtml = $usePrintFixedHeaderFooter
            ? '<div class="print-footer">'.$templateFooter.'</div>'
            : '';

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
        .print-header,.print-footer{display:none}
        .page{max-width:980px;margin:20px auto;background:#fff;padding:24px 28px;box-shadow:0 4px 20px rgba(0,0,0,.08)}
        .template-fragment{border:0;padding:0;margin:0;background:transparent;font-size:inherit}
        .template-fragment img{display:block;margin:0}
        table{width:100%;border-collapse:collapse;margin-top:10px}
        th,td{border:1px solid #111;padding:6px 8px;font-size:12px;vertical-align:top}
        th{background:#efefef;text-align:left}
        .right{text-align:right}
        .section-title{margin:14px 0 6px;font-size:13px;font-weight:700}
        @media print{
            body{background:#fff}
            .toolbar{display:none}
            .print-header,.print-footer{display:block;position:fixed;left:0;right:0;background:#fff;z-index:999}
            .print-header{top:0;padding:8px 28px 0}
            .print-footer{bottom:0;padding:0 28px 8px}
            .page{box-shadow:none;margin:0;max-width:none;padding:132px 28px 120px}
            .template-region{display:none}
        }
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
    {$printHeaderHtml}
    {$printFooterHtml}
    <div class=\"page\">
        <div class=\"template-region\" data-template-region=\"header\">{$templateHeader}</div>

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

        $headerPartNames = $this->collectReferencedHeaderFooterParts($zip, 'header');
        $footerPartNames = $this->collectReferencedHeaderFooterParts($zip, 'footer');

        if ($headerPartNames === []) {
            $headerPartNames = $this->collectDocxPartNames($zip, '/^word\/header[^\/]*\.xml$/i');
        }

        if ($footerPartNames === []) {
            $footerPartNames = $this->collectDocxPartNames($zip, '/^word\/footer[^\/]*\.xml$/i');
        }

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
     * @return array<int, string>
     */
    private function collectReferencedHeaderFooterParts(ZipArchive $zip, string $kind): array
    {
        if (! in_array($kind, ['header', 'footer'], true)) {
            return [];
        }

        $documentXml = $zip->getFromName('word/document.xml');
        $documentRelsXml = $zip->getFromName('word/_rels/document.xml.rels');

        if ($documentXml === false || trim($documentXml) === '' || $documentRelsXml === false || trim($documentRelsXml) === '') {
            return [];
        }

        $referencePattern = $kind === 'header'
            ? '/<w:headerReference\b[^>]*>/i'
            : '/<w:footerReference\b[^>]*>/i';

        $referenceMatches = [];
        preg_match_all($referencePattern, $documentXml, $referenceMatches, PREG_SET_ORDER);

        if ($referenceMatches === []) {
            return [];
        }

        $relsMap = $this->extractDocumentPartRelationshipMap($documentRelsXml, $kind);

        if ($relsMap === []) {
            return [];
        }

        $byType = [
            'default' => [],
            'first' => [],
            'even' => [],
            'other' => [],
        ];

        foreach ($referenceMatches as $match) {
            $tag = $match[0] ?? '';
            $relationshipId = $this->extractXmlAttributeValue($tag, 'r:id');
            $referenceType = strtolower($this->extractXmlAttributeValue($tag, 'w:type'));

            if ($relationshipId === '' || ! isset($relsMap[$relationshipId])) {
                continue;
            }

            $partPath = $this->normalizeDocxPath('word/'.$relsMap[$relationshipId]);

            $bucket = match ($referenceType) {
                'default' => 'default',
                'first' => 'first',
                'even' => 'even',
                default => 'other',
            };

            $byType[$bucket][] = $partPath;
        }

        $ordered = [];
        $seen = [];

        foreach (['default', 'first', 'even', 'other'] as $bucket) {
            foreach ($byType[$bucket] as $partPath) {
                if (isset($seen[$partPath])) {
                    continue;
                }

                $seen[$partPath] = true;
                $ordered[] = $partPath;
            }
        }

        return $ordered;
    }

    /**
     * @return array<string, string>
     */
    private function extractDocumentPartRelationshipMap(string $documentRelsXml, string $kind): array
    {
        $matches = [];
        preg_match_all('/<Relationship\b[^>]*>/i', $documentRelsXml, $matches, PREG_SET_ORDER);

        if ($matches === []) {
            return [];
        }

        $map = [];

        foreach ($matches as $match) {
            $tag = $match[0] ?? '';
            $relationshipId = $this->extractXmlAttributeValue($tag, 'Id');
            $relationshipType = strtolower($this->extractXmlAttributeValue($tag, 'Type'));
            $relationshipTarget = $this->extractXmlAttributeValue($tag, 'Target');

            if ($relationshipId === '' || $relationshipTarget === '' || ! str_ends_with($relationshipType, '/'.$kind)) {
                continue;
            }

            $map[$relationshipId] = $relationshipTarget;
        }

        return $map;
    }

    /**
     * @param  array<int, string>  $partNames
     * @return array{html:string|null,image_count:int}
     */
    private function buildDocxTemplateFragment(ZipArchive $zip, array $partNames): array
    {
        $selectedHtml = null;
        $selectedImageCount = 0;
        $seenFragmentHashes = [];

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

            $fragment = '<div class="template-fragment">';

            foreach ($imageTags as $imageTag) {
                $fragment .= $imageTag;
            }

            foreach ($textLines as $line) {
                $fragment .= '<div>'.htmlspecialchars($line).'</div>';
            }

            $fragment .= '</div>';
            $fragmentHash = sha1($fragment);

            if (isset($seenFragmentHashes[$fragmentHash])) {
                continue;
            }

            $seenFragmentHashes[$fragmentHash] = true;

            // Word files commonly include first/even/default header/footer variants
            // with identical content. Keep the first unique fragment to avoid duplicates.
            if ($selectedHtml === null) {
                $selectedHtml = $fragment;
                $selectedImageCount = count($imageTags);
            }
        }

        if ($selectedHtml === null) {
            return [
                'html' => null,
                'image_count' => 0,
            ];
        }

        return [
            'html' => $selectedHtml,
            'image_count' => $selectedImageCount,
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
        $usedImagePaths = [];

        foreach ($orderedRelationshipIds as $relationshipId) {
            if (isset($usedRelationshipIds[$relationshipId]) || ! isset($relationshipMap[$relationshipId])) {
                continue;
            }

            $usedRelationshipIds[$relationshipId] = true;

            $imagePath = $this->normalizeDocxPath($relationshipMap[$relationshipId]);

            if (isset($usedImagePaths[$imagePath])) {
                continue;
            }

            $imageBinary = $zip->getFromName($imagePath);

            if ($imageBinary === false) {
                continue;
            }

            $mimeType = $this->mimeTypeFromPath($imagePath);
            if ($mimeType === null) {
                continue;
            }

            $usedImagePaths[$imagePath] = true;

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
        preg_match_all('/<Relationship\b[^>]*>/i', $relationshipsXml, $relationshipMatches, PREG_SET_ORDER);

        if ($relationshipMatches === []) {
            return [];
        }

        $relationshipMap = [];

        foreach ($relationshipMatches as $match) {
            $tag = $match[0] ?? '';
            $relationshipId = $this->extractXmlAttributeValue($tag, 'Id');
            $relationshipType = $this->extractXmlAttributeValue($tag, 'Type');
            $relationshipTarget = $this->extractXmlAttributeValue($tag, 'Target');
            $targetMode = $this->extractXmlAttributeValue($tag, 'TargetMode');

            if ($relationshipId === '' || $relationshipTarget === '' || ! str_contains($relationshipType, '/image')) {
                continue;
            }

            if (strtolower($targetMode) === 'external') {
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

    private function extractXmlAttributeValue(string $tag, string $attributeName): string
    {
        $matches = [];
        preg_match('/\b'.preg_quote($attributeName, '/').'\s*=\s*(["\'])(.*?)\1/i', $tag, $matches);

        return $matches[2] ?? '';
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
        return $this->renderClassPreviewHtml($data, false);
    }

    /**
     * @param  array{classSections:array<int, ClassSection>,summaryMap:array<int, object>,overallQuestionRows:array<int, array{number:int,category:string,text:string,average:float|null}>}  $data
     */
    private function renderOverallDocHtml(array $data): string
    {
        return $this->renderOverallPreviewHtml($data, false);
    }
}
