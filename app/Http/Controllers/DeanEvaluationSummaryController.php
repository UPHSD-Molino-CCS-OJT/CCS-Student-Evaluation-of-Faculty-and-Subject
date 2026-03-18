<?php

namespace App\Http\Controllers;

use Barryvdh\DomPDF\Facade\Pdf;
use App\Services\Word\WordDocumentCloner;
use App\Models\ClassSection;
use App\Models\Evaluation;
use App\Models\EvaluationReportSignoff;
use App\Models\ExportDocumentTemplate;
use App\Models\EvaluationSetting;
use App\Models\EvaluationResponse;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
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

    private const TEMPLATE_DOCX_STORAGE_PATH = 'dean-summary-templates/current-template.docx';

    public function index(): Response
    {
        $classSections = ClassSection::query()
            ->with(['subject', 'section', 'faculty', 'reportSignoff.facultySigner:id,name', 'reportSignoff.deanSigner:id,name'])
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
                'facultySignedAt' => $classSection->reportSignoff?->faculty_signed_at?->toDateTimeString(),
                'facultySignedBy' => $classSection->reportSignoff?->facultySigner?->name,
                'deanSignedAt' => $classSection->reportSignoff?->dean_signed_at?->toDateTimeString(),
                'deanSignedBy' => $classSection->reportSignoff?->deanSigner?->name,
                'canDeanSign' => $classSection->reportSignoff?->faculty_signed_at !== null,
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

    public function signClassSection(Request $request, ClassSection $classSection): RedirectResponse
    {
        $dean = $request->user();

        if ((string) $dean->role !== 'dean') {
            abort(403);
        }

        $deanEsignDataUri = $this->resolveUserEsignDataUri($dean);

        if ($deanEsignDataUri === null) {
            return back()->withErrors([
                'esign' => 'Upload your e-sign in Settings before signing a report.',
            ]);
        }

        $signoff = EvaluationReportSignoff::query()->firstOrNew([
            'class_section_id' => $classSection->id,
        ]);

        if ($signoff->faculty_signed_at === null) {
            return back()->withErrors([
                'esign' => 'Faculty must sign and submit this report before dean confirmation.',
            ]);
        }

        $signoff->fill([
            'dean_user_id' => $dean->id,
            'dean_signed_at' => now(),
            'dean_signature_path' => $dean->esign_image_path,
            'dean_signature_data_uri' => $deanEsignDataUri,
        ]);
        $signoff->save();

        return back()->with('status', 'Dean e-sign applied. Evaluation confirmed as checked.');
    }

    public function storeTemplate(Request $request): RedirectResponse
    {
        $payload = $request->validate([
            'template_file' => ['required', 'file', 'mimes:docx'],
        ]);

        $templateFile = $payload['template_file'];

        try {
            $parsedTemplate = $this->parseUploadedTemplateFile($templateFile);
        } catch (RuntimeException $exception) {
            return back()->withErrors([
                'template_file' => $exception->getMessage(),
            ]);
        }

        $headerHtml = $parsedTemplate['header_html'];
        $footerHtml = $parsedTemplate['footer_html'];
        $headerText = $parsedTemplate['header_text'];
        $footerText = $parsedTemplate['footer_text'];

        $stored = Storage::disk('local')->putFileAs(
            dirname(self::TEMPLATE_DOCX_STORAGE_PATH),
            $templateFile,
            basename(self::TEMPLATE_DOCX_STORAGE_PATH)
        );

        if ($stored === false) {
            return back()->withErrors([
                'template_file' => 'Template was parsed but could not be stored for DOCX cloning. Check writable storage and try again.',
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

        $imageCount = $parsedTemplate['image_count'];
        $status = 'Template imported successfully and set as default for all previews and exports.';

        if ($imageCount > 0) {
            $status .= ' Imported '.$imageCount.' image(s) from header/footer.';
        }

        return back()->with('status', $status);
    }

    public function previewTemplateImport(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'template_file' => ['required', 'file', 'mimes:docx'],
        ]);

        $templateFile = $payload['template_file'];

        try {
            $parsedTemplate = $this->parseUploadedTemplateFile($templateFile);
        } catch (RuntimeException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
            ], 422);
        }

        return response()->json([
            'header_html' => $parsedTemplate['header_html'],
            'footer_html' => $parsedTemplate['footer_html'],
            'header_text' => $parsedTemplate['header_text'],
            'footer_text' => $parsedTemplate['footer_text'],
            'source_filename' => $templateFile->getClientOriginalName(),
            'image_count' => $parsedTemplate['image_count'],
        ]);
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

    /**
     * @return array{header_html:string|null,footer_html:string|null,header_text:string|null,footer_text:string|null,image_count:int}
     */
    private function parseUploadedTemplateFile(UploadedFile $templateFile): array
    {
        try {
            $fragments = $this->extractHeaderFooterFromDocx((string) $templateFile->getRealPath());
        } catch (Throwable $exception) {
            report($exception);
            throw new RuntimeException($this->templateReadErrorMessage($exception));
        }

        $headerHtml = $fragments['header_html'] ?? null;
        $footerHtml = $fragments['footer_html'] ?? null;
        $headerText = $fragments['header_text'] ?? null;
        $footerText = $fragments['footer_text'] ?? null;

        if ($headerHtml === null && $footerHtml === null) {
            throw new RuntimeException('No header/footer was found in the uploaded .docx template.');
        }

        $htmlLengthError = $this->validateTemplateFragmentLengths($headerHtml, $footerHtml, $headerText, $footerText);

        if ($htmlLengthError !== null) {
            throw new RuntimeException($htmlLengthError);
        }

        return [
            'header_html' => $headerHtml,
            'footer_html' => $footerHtml,
            'header_text' => $headerText,
            'footer_text' => $footerText,
            'image_count' => (int) ($fragments['header_image_count'] ?? 0) + (int) ($fragments['footer_image_count'] ?? 0),
        ];
    }

    private function templateReadErrorMessage(Throwable $exception): string
    {
        $errorMessage = 'Unable to read the uploaded DOCX template on this server. Ensure the file is a valid .docx and the PHP zip extension is enabled.';

        if (str_contains($exception->getMessage(), 'zip extension is not available')) {
            $errorMessage = 'DOCX import is not available on this Railway runtime because PHP zip (ZipArchive) is missing. Enable ext-zip in the deployment image or use Preview Edit mode to save header/footer manually.';
        } elseif (str_contains($exception->getMessage(), 'Unable to open DOCX archive')) {
            $errorMessage = 'The uploaded file could not be opened as a DOCX archive. Re-save it as Word .docx (not .doc or exported PDF) and try again.';
        }

        return $errorMessage;
    }

    public function exportClassSection(Request $request, ClassSection $classSection): StreamedResponse|HttpResponse
    {
        $data = $this->buildClassSectionSummaryData($classSection);
        $format = $this->resolveExportFormat($request);

        if ($format === 'docx') {
            $inline = strtolower((string) $request->query('disposition', 'attachment')) === 'inline';

            return $this->exportClassSectionDocx($data, $inline);
        }

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

        if ($format === 'pdf') {
            $fileName = sprintf(
                'evaluation-summary-%s-%s.pdf',
                $data['classSection']->subject?->code ?? 'subject',
                now()->format('Ymd-His')
            );

            return Pdf::loadHTML($this->renderClassDocHtml($data))
                ->setPaper('a4', 'portrait')
                ->download($fileName);
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

        if ($format === 'docx') {
            $inline = strtolower((string) $request->query('disposition', 'attachment')) === 'inline';

            return $this->exportOverallDocx($data, $inline);
        }

        if ($format === 'doc') {
            $fileName = 'evaluation-summary-overall-'.now()->format('Ymd-His').'.doc';

            return response($this->renderOverallDocHtml($data), HttpResponse::HTTP_OK, [
                'Content-Type' => 'application/msword',
                'Content-Disposition' => 'attachment; filename='.$fileName,
            ]);
        }

        if ($format === 'pdf') {
            $fileName = 'evaluation-summary-overall-'.now()->format('Ymd-His').'.pdf';

            return Pdf::loadHTML($this->renderOverallDocHtml($data))
                ->setPaper('a4', 'landscape')
                ->download($fileName);
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
      *   comments:array<int, string>,
      *   signoff:array{facultySignedAt:?string,facultySignedBy:?string,facultySignatureDataUri:?string,deanSignedAt:?string,deanSignedBy:?string,deanSignatureDataUri:?string}
     * }
     */
    private function buildClassSectionSummaryData(ClassSection $classSection): array
    {
          $classSection->load(['subject', 'section', 'faculty', 'reportSignoff.facultySigner:id,name', 'reportSignoff.deanSigner:id,name']);
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
            'signoff' => $this->buildSignoffPayload($classSection->reportSignoff),
        ];
    }

    /**
     * @return array{facultySignedAt:?string,facultySignedBy:?string,facultySignatureDataUri:?string,deanSignedAt:?string,deanSignedBy:?string,deanSignatureDataUri:?string}
     */
    private function buildSignoffPayload(?EvaluationReportSignoff $signoff): array
    {
        return [
            'facultySignedAt' => $signoff?->faculty_signed_at?->toDateTimeString(),
            'facultySignedBy' => $signoff?->facultySigner?->name,
            'facultySignatureDataUri' => $signoff?->faculty_signature_data_uri
                ?? $this->signaturePathToDataUri($signoff?->faculty_signature_path),
            'deanSignedAt' => $signoff?->dean_signed_at?->toDateTimeString(),
            'deanSignedBy' => $signoff?->deanSigner?->name,
            'deanSignatureDataUri' => $signoff?->dean_signature_data_uri
                ?? $this->signaturePathToDataUri($signoff?->dean_signature_path),
        ];
    }

    private function resolveUserEsignDataUri(object $user): ?string
    {
        if (is_string($user->esign_image_data_uri ?? null) && $user->esign_image_data_uri !== '') {
            return $user->esign_image_data_uri;
        }

        return $this->signaturePathToDataUri($user->esign_image_path ?? null);
    }

    private function signaturePathToDataUri(?string $path): ?string
    {
        if ($path === null || $path === '' || ! Storage::disk('public')->exists($path)) {
            return null;
        }

        $bytes = Storage::disk('public')->get($path);

        if ($bytes === '') {
            return null;
        }

        $mimeType = Storage::disk('public')->mimeType($path) ?: 'image/png';

        return 'data:'.$mimeType.';base64,'.base64_encode($bytes);
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

        return in_array($format, ['xlsx', 'doc', 'docx', 'pdf'], true) ? $format : 'xlsx';
    }

    /**
     * @param  array{classSection:ClassSection,respondents:int,overallAverage:float|null,questionRows:array<int, array{number:int,category:string,text:string,average:float|null}>,comments:array<int, string>,signoff:array{facultySignedAt:?string,facultySignedBy:?string,facultySignatureDataUri:?string,deanSignedAt:?string,deanSignedBy:?string,deanSignatureDataUri:?string}}  $data
     */
    private function exportClassSectionDocx(array $data, bool $inline = false): StreamedResponse|HttpResponse
    {
        $templatePath = $this->resolveDocxTemplatePath();

        if ($templatePath === null) {
            return response($this->renderClassDocHtml($data), HttpResponse::HTTP_OK, [
                'Content-Type' => 'application/msword',
                'Content-Disposition' => 'attachment; filename=evaluation-summary-'.$data['classSection']->id.'-'.now()->format('Ymd-His').'.doc',
            ]);
        }

        $tempOutput = tempnam(sys_get_temp_dir(), 'dean-class-docx-');

        if ($tempOutput === false) {
            throw new RuntimeException('Unable to allocate temporary DOCX output file.');
        }

        $outputPath = $tempOutput.'.docx';
        @rename($tempOutput, $outputPath);

        $cloner = app(WordDocumentCloner::class);
        $cloner->cloneWithBodyXml($templatePath, $outputPath, $this->buildClassSectionWordBodyXml($data));

        $fileName = sprintf(
            'evaluation-summary-%s-%s.docx',
            $data['classSection']->subject?->code ?? 'subject',
            now()->format('Ymd-His')
        );

        return $this->streamDocxFile($outputPath, $fileName, $inline);
    }

    /**
     * @param  array{classSections:array<int, ClassSection>,summaryMap:array<int, object>,overallQuestionRows:array<int, array{number:int,category:string,text:string,average:float|null}>}  $data
     */
    private function exportOverallDocx(array $data, bool $inline = false): StreamedResponse|HttpResponse
    {
        $templatePath = $this->resolveDocxTemplatePath();

        if ($templatePath === null) {
            return response($this->renderOverallDocHtml($data), HttpResponse::HTTP_OK, [
                'Content-Type' => 'application/msword',
                'Content-Disposition' => 'attachment; filename=evaluation-summary-overall-'.now()->format('Ymd-His').'.doc',
            ]);
        }

        $tempOutput = tempnam(sys_get_temp_dir(), 'dean-overall-docx-');

        if ($tempOutput === false) {
            throw new RuntimeException('Unable to allocate temporary DOCX output file.');
        }

        $outputPath = $tempOutput.'.docx';
        @rename($tempOutput, $outputPath);

        $cloner = app(WordDocumentCloner::class);
        $cloner->cloneWithBodyXml($templatePath, $outputPath, $this->buildOverallWordBodyXml($data));

        $fileName = 'evaluation-summary-overall-'.now()->format('Ymd-His').'.docx';

        return $this->streamDocxFile($outputPath, $fileName, $inline);
    }

    /**
     * @param  array{classSection:ClassSection,respondents:int,overallAverage:float|null,questionRows:array<int, array{number:int,category:string,text:string,average:float|null}>,comments:array<int, string>,signoff:array{facultySignedAt:?string,facultySignedBy:?string,facultySignatureDataUri:?string,deanSignedAt:?string,deanSignedBy:?string,deanSignatureDataUri:?string}}  $data
     */
    private function buildClassSectionWordBodyXml(array $data): string
    {
        $classSection = $data['classSection'];
        $metaRows = [
            ['Period', (string) (($classSection->term ?? '').' '.($classSection->school_year ?? ''))],
            ['Faculty', (string) ($classSection->faculty?->name ?? '')],
            ['Subject', (string) (($classSection->subject?->code ?? '').' - '.($classSection->subject?->title ?? ''))],
            ['Evaluators', (string) $data['respondents'].' Students'],
        ];

        $evaluationRows = [];
        foreach ($data['questionRows'] as $row) {
            $evaluationRows[] = [
                (string) $row['text'],
                $row['average'] !== null ? number_format((float) $row['average'], 2) : '-',
                $this->remarkFromAverage($row['average']),
            ];
        }

        $evaluationRows[] = [
            'AVERAGE',
            $data['overallAverage'] !== null ? number_format($data['overallAverage'], 2) : '-',
            $this->remarkFromAverage($data['overallAverage']),
        ];

        $commentRows = [];
        if ($data['comments'] === []) {
            $commentRows[] = ['No comments submitted.'];
        } else {
            foreach ($data['comments'] as $comment) {
                $commentRows[] = [(string) $comment];
            }
        }

        $signoffRows = [
            [
                'Faculty',
                ($data['signoff']['facultySignedBy'] ?? 'Not signed')
                    .($data['signoff']['facultySignedAt'] ? ' ('.$data['signoff']['facultySignedAt'].')' : ''),
            ],
            [
                'Dean',
                ($data['signoff']['deanSignedBy'] ?? 'Not signed')
                    .($data['signoff']['deanSignedAt'] ? ' ('.$data['signoff']['deanSignedAt'].')' : ''),
            ],
        ];

        return
            $this->buildWordHeadingParagraphXml('STUDENT EVALUATION SUMMARY').
            $this->buildWordTableXml(['Field', 'Value'], $metaRows).
            $this->buildWordHeadingParagraphXml('STUDENT EVALUATION').
            $this->buildWordTableXml(['Criteria', 'Average', 'Remarks'], $evaluationRows).
            $this->buildWordHeadingParagraphXml('COMMENTS').
            $this->buildWordTableXml(['Comment'], $commentRows).
            $this->buildWordHeadingParagraphXml('E-SIGN STATUS').
            $this->buildWordTableXml(['Role', 'Signed By / Date'], $signoffRows);
    }

    /**
     * @param  array{classSections:array<int, ClassSection>,summaryMap:array<int, object>,overallQuestionRows:array<int, array{number:int,category:string,text:string,average:float|null}>}  $data
     */
    private function buildOverallWordBodyXml(array $data): string
    {
        $classRows = [];
        foreach ($data['classSections'] as $classSection) {
            $summary = $data['summaryMap'][$classSection->id] ?? null;
            $average = $summary?->overall_average !== null ? number_format((float) $summary->overall_average, 2) : '-';

            $classRows[] = [
                (string) (($classSection->subject?->code ?? '').' - '.($classSection->subject?->title ?? '')),
                (string) ($classSection->faculty?->name ?? ''),
                (string) ($classSection->section?->code ?? ''),
                (string) ($classSection->term ?? ''),
                (string) ($classSection->school_year ?? ''),
                $average,
                $this->remarkFromAverage($summary?->overall_average !== null ? (float) $summary->overall_average : null),
            ];
        }

        $questionRows = [];
        foreach ($data['overallQuestionRows'] as $row) {
            $questionRows[] = [
                (string) $row['text'],
                $row['average'] !== null ? number_format((float) $row['average'], 2) : '-',
                $this->remarkFromAverage($row['average']),
            ];
        }

        return
            $this->buildWordHeadingParagraphXml('OVERALL EVALUATION SUMMARY').
            $this->buildWordHeadingParagraphXml('CLASS EVALUATION SUMMARY').
            $this->buildWordTableXml(['Subject', 'Faculty', 'Section', 'Term', 'School Year', 'Average', 'Remarks'], $classRows).
            $this->buildWordHeadingParagraphXml('OVERALL QUESTION AVERAGES').
            $this->buildWordTableXml(['Criteria', 'Average', 'Remarks'], $questionRows);
    }

    /**
     * @param  array<int, string>  $lines
     */
    private function buildWordParagraphXmlFromLines(array $lines): string
    {
        if ($lines === []) {
            return '<w:p/>';
        }

        $paragraphs = [];

        foreach ($lines as $line) {
            $value = trim($line);

            if ($value === '') {
                $paragraphs[] = '<w:p/>';
                continue;
            }

            $paragraphs[] = '<w:p><w:r><w:t xml:space="preserve">'.htmlspecialchars($line, ENT_XML1 | ENT_QUOTES, 'UTF-8').'</w:t></w:r></w:p>';
        }

        return implode('', $paragraphs);
    }

    private function buildWordHeadingParagraphXml(string $text): string
    {
        return '<w:p><w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">'
            .htmlspecialchars($text, ENT_XML1 | ENT_QUOTES, 'UTF-8')
            .'</w:t></w:r></w:p>';
    }

    /**
     * @param  array<int, string>  $headers
     * @param  array<int, array<int, string>>  $rows
     */
    private function buildWordTableXml(array $headers, array $rows): string
    {
        $columnCount = max(1, count($headers));
        $colWidth = max(1200, (int) floor(9000 / $columnCount));

        $gridCols = '';
        for ($i = 0; $i < $columnCount; $i++) {
            $gridCols .= '<w:gridCol w:w="'.$colWidth.'"/>';
        }

        $headerCells = '';
        foreach ($headers as $header) {
            $headerCells .= $this->buildWordTableCellXml($header, $colWidth, true);
        }

        $bodyRows = '';
        foreach ($rows as $row) {
            $cells = '';
            for ($index = 0; $index < $columnCount; $index++) {
                $cells .= $this->buildWordTableCellXml((string) ($row[$index] ?? ''), $colWidth, false);
            }

            $bodyRows .= '<w:tr>'.$cells.'</w:tr>';
        }

        return '<w:tbl>'
            .'<w:tblPr>'
            .'<w:tblStyle w:val="TableGrid"/>'
            .'<w:tblW w:w="0" w:type="auto"/>'
            .'<w:tblCellSpacing w:w="0" w:type="dxa"/>'
            .'<w:tblBorders>'
            .'<w:top w:val="single" w:sz="8" w:space="0" w:color="auto"/>'
            .'<w:left w:val="single" w:sz="8" w:space="0" w:color="auto"/>'
            .'<w:bottom w:val="single" w:sz="8" w:space="0" w:color="auto"/>'
            .'<w:right w:val="single" w:sz="8" w:space="0" w:color="auto"/>'
            .'<w:insideH w:val="single" w:sz="6" w:space="0" w:color="auto"/>'
            .'<w:insideV w:val="single" w:sz="6" w:space="0" w:color="auto"/>'
            .'</w:tblBorders>'
            .'</w:tblPr>'
            .'<w:tblGrid>'.$gridCols.'</w:tblGrid>'
            .'<w:tr>'.$headerCells.'</w:tr>'
            .$bodyRows
            .'</w:tbl>';
    }

    private function buildWordTableCellXml(string $text, int $widthDxa, bool $bold): string
    {
        $escaped = htmlspecialchars($text, ENT_XML1 | ENT_QUOTES, 'UTF-8');
        $runProps = $bold ? '<w:rPr><w:b/></w:rPr>' : '';

        return '<w:tc>'
            .'<w:tcPr><w:tcW w:w="'.$widthDxa.'" w:type="dxa"/></w:tcPr>'
            .'<w:p><w:r>'.$runProps.'<w:t xml:space="preserve">'.$escaped.'</w:t></w:r></w:p>'
            .'</w:tc>';
    }

    private function streamDocxFile(string $filePath, string $fileName, bool $inline): StreamedResponse
    {
        return response()->stream(function () use ($filePath): void {
            $stream = fopen($filePath, 'rb');

            if ($stream !== false) {
                fpassthru($stream);
                fclose($stream);
            }

            @unlink($filePath);
        }, HttpResponse::HTTP_OK, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'Content-Disposition' => ($inline ? 'inline' : 'attachment').'; filename='.$fileName,
        ]);
    }

    private function resolveDocxTemplatePath(): ?string
    {
        if (Storage::disk('local')->exists(self::TEMPLATE_DOCX_STORAGE_PATH)) {
            return Storage::disk('local')->path(self::TEMPLATE_DOCX_STORAGE_PATH);
        }

        $workspaceTemplate = base_path('CCS-Document-Template-Folio.docx');

        if (is_file($workspaceTemplate) && is_readable($workspaceTemplate)) {
            return $workspaceTemplate;
        }

        return null;
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

        $facultySignedBy = htmlspecialchars((string) ($data['signoff']['facultySignedBy'] ?? 'Not signed'));
        $facultySignedAt = $data['signoff']['facultySignedAt'] !== null
            ? htmlspecialchars((string) $data['signoff']['facultySignedAt'])
            : 'Pending';
        $deanSignedBy = htmlspecialchars((string) ($data['signoff']['deanSignedBy'] ?? 'Not signed'));
        $deanSignedAt = $data['signoff']['deanSignedAt'] !== null
            ? htmlspecialchars((string) $data['signoff']['deanSignedAt'])
            : 'Pending';

        $facultySignatureImage = $data['signoff']['facultySignatureDataUri'] !== null
            ? '<img class="esign-image" src="'.htmlspecialchars($data['signoff']['facultySignatureDataUri']).'" alt="Faculty e-sign" />'
            : '<div class="esign-placeholder">No faculty e-sign yet</div>';

        $deanSignatureImage = $data['signoff']['deanSignatureDataUri'] !== null
            ? '<img class="esign-image" src="'.htmlspecialchars($data['signoff']['deanSignatureDataUri']).'" alt="Dean e-sign" />'
            : '<div class="esign-placeholder">No dean e-sign yet</div>';

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
        .page{max-width:960px;margin:20px auto;background:#fff;padding:24px 28px;box-shadow:0 4px 20px rgba(0,0,0,.08)}
        .content-shell{margin-top:14px;padding:16px;border:1px solid #e5e7eb;border-radius:12px;background:#fcfcfd}
        .meta-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:0 0 16px}
        .meta-item{border:1px solid #e5e7eb;background:#fff;border-radius:10px;padding:10px 12px;font-size:13px;line-height:1.4}
        .meta-label{display:block;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;font-weight:700}
        .meta-value{display:block;margin-top:2px;color:#111}
        .template-fragment{border:0;padding:0;margin:0;background:transparent;font-size:inherit}
        .template-fragment img{display:block;margin:0}
        table{width:100%;border-collapse:separate;border-spacing:0}
        .modern-table{border:1px solid #d1d5db;border-radius:10px;overflow:hidden;background:#fff}
        .modern-table th,.modern-table td{border-bottom:1px solid #e5e7eb;padding:8px 10px;font-size:12px;vertical-align:top}
        .modern-table tbody tr:last-child td{border-bottom:0}
        .modern-table th{background:#f3f4f6;text-align:left;font-weight:700}
        .modern-table tbody tr:nth-child(even){background:#fafafa}
        .right{text-align:right}
        .avg td{font-weight:700}
        .section-title{margin:14px 0 8px;font-size:13px;font-weight:700;color:#1f2937}
        .esign-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:10px}
        .esign-card{border:1px solid #d1d5db;border-radius:10px;background:#fff;padding:10px}
        .esign-meta{font-size:12px;color:#374151;line-height:1.5}
        .esign-image{display:block;max-height:64px;max-width:100%;margin:0 0 8px}
        .esign-placeholder{font-size:12px;color:#6b7280;border:1px dashed #d1d5db;border-radius:8px;padding:10px;margin-bottom:8px}
        @media print{
            body{background:#fff}
            .toolbar{display:none}
            .print-header,.print-footer{display:block;position:fixed;left:0;right:0;background:#fff;z-index:999}
            .print-header{top:0;padding:8px 28px 0}
            .print-footer{bottom:0;padding:0 28px 8px}
            .page{box-shadow:none;margin:0;max-width:none;padding:132px 28px 120px}
            .content-shell{border:0;border-radius:0;padding:0;background:transparent}
            .template-region{display:none}
        }
    </style>
</head>
<body>
    <div class=\"toolbar\">
        <a class=\"btn primary\" href=\"{$baseExportUrl}?format=xlsx\">Download Excel</a>
        <a class=\"btn\" href=\"{$baseExportUrl}?format=doc\">Download DOC</a>
        <button id=\"toggle-edit\" class=\"btn\" type=\"button\">Edit</button>
        <select id=\"template-target-region\" class=\"btn\" style=\"display:none\" aria-label=\"Template region\">
            <option value=\"header\">Header</option>
            <option value=\"footer\">Footer</option>
        </select>
        <label id=\"upload-image-label\" class=\"btn\" for=\"upload-image\" style=\"display:none\">Upload Image</label>
        <input id=\"upload-image\" type=\"file\" accept=\"image/*\" style=\"display:none\" />
        <input id=\"replace-image-input\" type=\"file\" accept=\"image/*\" style=\"display:none\" />
        <button id=\"add-text-block\" class=\"btn\" type=\"button\" style=\"display:none\">Add Text</button>
        <button id=\"delete-selected\" class=\"btn\" type=\"button\" style=\"display:none\">Delete Selected</button>
        <button id=\"replace-image\" class=\"btn\" type=\"button\" style=\"display:none\">Replace Image</button>
        <label id=\"image-width-label\" class=\"btn\" for=\"image-width\" style=\"display:none\">Image Width</label>
        <input id=\"image-width\" type=\"number\" min=\"20\" max=\"1200\" step=\"1\" style=\"display:none;width:90px\" />
        <button id=\"save-template-fragments\" class=\"btn\" type=\"button\" style=\"display:none\">Save Header/Footer</button>
        <button class=\"btn\" onclick=\"window.print()\">Print</button>
    </div>
    {$printHeaderHtml}
    {$printFooterHtml}
    <div class=\"page\">
        <div class=\"template-region\" data-template-region=\"header\">{$templateHeader}</div>
        <div class=\"content-shell\">
            <div class=\"meta-grid\">
                <div class=\"meta-item\"><span class=\"meta-label\">Period</span><span class=\"meta-value\">{$term} {$schoolYear}</span></div>
                <div class=\"meta-item\"><span class=\"meta-label\">Faculty</span><span class=\"meta-value\">{$faculty}</span></div>
                <div class=\"meta-item\"><span class=\"meta-label\">Subject</span><span class=\"meta-value\">{$subject}</span></div>
                <div class=\"meta-item\"><span class=\"meta-label\">Evaluators</span><span class=\"meta-value\">{$data['respondents']} Students</span></div>
            </div>

            <div class=\"section-title\">STUDENT EVALUATION</div>
            <table class=\"modern-table\">
                <thead>
                    <tr><th>Criteria</th><th style=\"width:110px\">Average</th><th style=\"width:180px\">Remarks</th></tr>
                </thead>
                <tbody>{$rowsHtml}</tbody>
            </table>

            <div class=\"section-title\">Comments</div>
            <table class=\"modern-table\"><tbody>{$commentsHtml}</tbody></table>

            <div class=\"section-title\">E-Signatures</div>
            <div class=\"esign-grid\">
                <div class=\"esign-card\">
                    {$facultySignatureImage}
                    <div class=\"esign-meta\"><strong>Faculty:</strong> {$facultySignedBy}<br /><strong>Signed At:</strong> {$facultySignedAt}</div>
                </div>
                <div class=\"esign-card\">
                    {$deanSignatureImage}
                    <div class=\"esign-meta\"><strong>Dean:</strong> {$deanSignedBy}<br /><strong>Signed At:</strong> {$deanSignedAt}</div>
                </div>
            </div>
        </div>

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
        .page{max-width:1020px;margin:20px auto;background:#fff;padding:24px 28px;box-shadow:0 4px 20px rgba(0,0,0,.08)}
        .content-shell{margin-top:14px;padding:16px;border:1px solid #e5e7eb;border-radius:12px;background:#fcfcfd}
        .template-fragment{border:0;padding:0;margin:0;background:transparent;font-size:inherit}
        .template-fragment img{display:block;margin:0}
        table{width:100%;border-collapse:separate;border-spacing:0}
        .modern-table{border:1px solid #d1d5db;border-radius:10px;overflow:hidden;background:#fff;margin-top:0}
        .modern-table th,.modern-table td{border-bottom:1px solid #e5e7eb;padding:8px 10px;font-size:12px;vertical-align:top}
        .modern-table tbody tr:last-child td{border-bottom:0}
        .modern-table th{background:#f3f4f6;text-align:left;font-weight:700}
        .modern-table tbody tr:nth-child(even){background:#fafafa}
        .right{text-align:right}
        .section-title{margin:14px 0 8px;font-size:13px;font-weight:700;color:#1f2937}
        @media print{
            body{background:#fff}
            .toolbar{display:none}
            .print-header,.print-footer{display:block;position:fixed;left:0;right:0;background:#fff;z-index:999}
            .print-header{top:0;padding:8px 28px 0}
            .print-footer{bottom:0;padding:0 28px 8px}
            .page{box-shadow:none;margin:0;max-width:none;padding:132px 28px 120px}
            .content-shell{border:0;border-radius:0;padding:0;background:transparent}
            .template-region{display:none}
        }
    </style>
</head>
<body>
    <div class=\"toolbar\">
        <a class=\"btn primary\" href=\"/dean/summaries/export?format=xlsx\">Download Excel</a>
        <a class=\"btn\" href=\"/dean/summaries/export?format=doc\">Download DOC</a>
        <button id=\"toggle-edit\" class=\"btn\" type=\"button\">Edit</button>
        <select id=\"template-target-region\" class=\"btn\" style=\"display:none\" aria-label=\"Template region\">
            <option value=\"header\">Header</option>
            <option value=\"footer\">Footer</option>
        </select>
        <label id=\"upload-image-label\" class=\"btn\" for=\"upload-image\" style=\"display:none\">Upload Image</label>
        <input id=\"upload-image\" type=\"file\" accept=\"image/*\" style=\"display:none\" />
        <input id=\"replace-image-input\" type=\"file\" accept=\"image/*\" style=\"display:none\" />
        <button id=\"add-text-block\" class=\"btn\" type=\"button\" style=\"display:none\">Add Text</button>
        <button id=\"delete-selected\" class=\"btn\" type=\"button\" style=\"display:none\">Delete Selected</button>
        <button id=\"replace-image\" class=\"btn\" type=\"button\" style=\"display:none\">Replace Image</button>
        <label id=\"image-width-label\" class=\"btn\" for=\"image-width\" style=\"display:none\">Image Width</label>
        <input id=\"image-width\" type=\"number\" min=\"20\" max=\"1200\" step=\"1\" style=\"display:none;width:90px\" />
        <button id=\"save-template-fragments\" class=\"btn\" type=\"button\" style=\"display:none\">Save Header/Footer</button>
        <button class=\"btn\" onclick=\"window.print()\">Print</button>
    </div>
    {$printHeaderHtml}
    {$printFooterHtml}
    <div class=\"page\">
        <div class=\"template-region\" data-template-region=\"header\">{$templateHeader}</div>
        <div class=\"content-shell\">
            <div class=\"section-title\">Class Evaluation Summary</div>
            <table class=\"modern-table\">
                <thead>
                    <tr><th>Subject</th><th>Faculty</th><th>Section</th><th>Term</th><th>School Year</th><th>Average</th><th>Remarks</th></tr>
                </thead>
                <tbody>{$rowsHtml}</tbody>
            </table>

            <div class=\"section-title\">Overall Question Averages</div>
            <table class=\"modern-table\">
                <thead>
                    <tr><th>Criteria</th><th style=\"width:110px\">Average</th><th style=\"width:180px\">Remarks</th></tr>
                </thead>
                <tbody>{$questionRowsHtml}</tbody>
            </table>
        </div>

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

            $partHtml = $this->buildDocxPartHtml($zip, $partName, $partXml);

            if ($partHtml['html'] === null) {
                continue;
            }

            $fragment = '<div class="template-fragment">'.$partHtml['html'].'</div>';
            $fragmentHash = sha1($fragment);

            if (isset($seenFragmentHashes[$fragmentHash])) {
                continue;
            }

            $seenFragmentHashes[$fragmentHash] = true;

            // Word files commonly include first/even/default header/footer variants
            // with identical content. Keep the first unique fragment to avoid duplicates.
            if ($selectedHtml === null) {
                $selectedHtml = $fragment;
                $selectedImageCount = $partHtml['image_count'];
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
     * @return array{html:string|null,image_count:int}
     */
    private function buildDocxPartHtml(ZipArchive $zip, string $partName, string $partXml): array
    {
        $relationshipMap = $this->extractDocxImageRelationships($zip, $partName);
        $paragraphMatches = [];
        preg_match_all('/<w:p\b[^>]*>.*?<\/w:p>/is', $partXml, $paragraphMatches);

        $paragraphXmlChunks = $paragraphMatches[0] ?? [];

        if ($paragraphXmlChunks === []) {
            $paragraphXmlChunks = [$partXml];
        }

        $blocks = [];
        $imageCount = 0;
        $usedImagePaths = [];

        foreach ($paragraphXmlChunks as $paragraphXml) {
            $paragraphHtml = $this->buildDocxParagraphHtml($zip, $relationshipMap, $paragraphXml, $usedImagePaths, $imageCount);
            if ($paragraphHtml === '') {
                continue;
            }

            $blocks[] = '<div>'.$paragraphHtml.'</div>';
        }

        if ($blocks === []) {
            return [
                'html' => null,
                'image_count' => 0,
            ];
        }

        return [
            'html' => implode('', $blocks),
            'image_count' => $imageCount,
        ];
    }

    /**
     * @param  array<string, string>  $relationshipMap
     * @param  array<string, bool>  $usedImagePaths
     */
    private function buildDocxParagraphHtml(ZipArchive $zip, array $relationshipMap, string $paragraphXml, array &$usedImagePaths, int &$imageCount): string
    {
        $tokens = [];
        preg_match_all('/(<w:drawing\b.*?<\/w:drawing>|<w:pict\b.*?<\/w:pict>|<w:br\b[^>]*\/?>|<w:tab\b[^>]*\/?>|<w:t\b[^>]*>.*?<\/w:t>)/is', $paragraphXml, $tokens);
        $orderedTokens = $tokens[0] ?? [];

        if ($orderedTokens === []) {
            return '';
        }

        $html = '';

        foreach ($orderedTokens as $token) {
            if (preg_match('/^<w:t\b/i', $token) === 1) {
                $text = preg_replace('/^<w:t\b[^>]*>|<\/w:t>$/i', '', $token) ?? '';
                $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
                $html .= htmlspecialchars($text);
                continue;
            }

            if (preg_match('/^<w:tab\b/i', $token) === 1) {
                $html .= '&nbsp;&nbsp;&nbsp;&nbsp;';
                continue;
            }

            if (preg_match('/^<w:br\b/i', $token) === 1) {
                $html .= '<br />';
                continue;
            }

            $relationshipId = $this->extractDocxImageRelationshipId($token);
            if ($relationshipId === null) {
                continue;
            }

            $imageTag = $this->buildDocxImageTag($zip, $relationshipMap, $relationshipId, $token, $usedImagePaths);
            if ($imageTag === null) {
                continue;
            }

            $imageCount++;
            $html .= $imageTag;
        }

        return trim($html);
    }

    private function extractDocxImageRelationshipId(string $token): ?string
    {
        $embedMatches = [];
        preg_match('/\br:embed="([^"]+)"/i', $token, $embedMatches);
        if (($embedMatches[1] ?? '') !== '') {
            return $embedMatches[1];
        }

        $legacyMatches = [];
        preg_match('/\br:id="([^"]+)"/i', $token, $legacyMatches);

        return ($legacyMatches[1] ?? '') !== '' ? $legacyMatches[1] : null;
    }

    /**
     * @param  array<string, string>  $relationshipMap
     * @param  array<string, bool>  $usedImagePaths
     */
    private function buildDocxImageTag(ZipArchive $zip, array $relationshipMap, string $relationshipId, string $xmlContext, array &$usedImagePaths): ?string
    {
        if (! isset($relationshipMap[$relationshipId])) {
            return null;
        }

        $imagePath = $this->normalizeDocxPath($relationshipMap[$relationshipId]);

        if (isset($usedImagePaths[$imagePath])) {
            return null;
        }

        $imageBinary = $zip->getFromName($imagePath);

        if ($imageBinary === false) {
            return null;
        }

        $mimeType = $this->mimeTypeFromPath($imagePath);
        if ($mimeType === null) {
            return null;
        }

        $usedImagePaths[$imagePath] = true;

        $style = '';
        $extentMatches = [];
        preg_match('/(?:wp:extent|a:ext)\b[^>]*\bcx="(\d+)"[^>]*\bcy="(\d+)"/i', $xmlContext, $extentMatches);
        if (($extentMatches[1] ?? '') !== '' && ($extentMatches[2] ?? '') !== '') {
            $widthPx = max(1, (int) round(((int) $extentMatches[1]) / 9525));
            $heightPx = max(1, (int) round(((int) $extentMatches[2]) / 9525));
            $style = ' style="width:'.$widthPx.'px;height:'.$heightPx.'px;max-width:100%;"';
        }

        return '<img src="data:'.$mimeType.';base64,'.base64_encode($imageBinary).'" alt="Template image"'.$style.' />';
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

        return $plain === '' ? null : Str::limit($plain, self::MAX_TEMPLATE_TEXT_LENGTH);
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
