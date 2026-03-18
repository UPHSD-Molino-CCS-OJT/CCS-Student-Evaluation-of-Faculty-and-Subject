import { Head, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/ui/loading-button';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type Question = {
    number: number;
    category: string;
    text: string;
};

type Row = {
    classSectionId: number;
    subject: string;
    faculty: string;
    section: string;
    term?: string | null;
    schoolYear?: string | null;
    respondents: number;
    overallAverage?: number | string | null;
    questionAverages: Array<{
        questionNumber: number;
        averageRating: number;
    }>;
};

type Props = {
    questions: Question[];
    rows: Row[];
    evaluationOpen: boolean;
    currentTemplate?: {
        sourceFilename?: string | null;
        updatedAt?: string | null;
    };
};

type TemplateImportPreview = {
    header_html: string | null;
    footer_html: string | null;
    header_text: string | null;
    footer_text: string | null;
    source_filename: string;
    image_count: number;
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dean Summary',
        href: '/dean/summaries',
    },
];

export default function DeanSummaries({ questions, rows, evaluationOpen, currentTemplate }: Props) {
    const page = usePage();
    const [file, setFile] = useState<File | null>(null);
    const [templateFile, setTemplateFile] = useState<File | null>(null);
    const [templatePreview, setTemplatePreview] = useState<TemplateImportPreview | null>(null);
    const [templatePreviewError, setTemplatePreviewError] = useState<string | null>(null);
    const [isPreviewingTemplate, setIsPreviewingTemplate] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [isImportingTemplate, setIsImportingTemplate] = useState(false);
    const [isTogglingEvaluation, setIsTogglingEvaluation] = useState(false);
    const [overallFormat, setOverallFormat] = useState<'xlsx' | 'doc'>('xlsx');
    const [classFormats, setClassFormats] = useState<Record<number, 'xlsx' | 'doc'>>({});

    const status = (page.props as { flash?: { status?: string } }).flash?.status;
    const errors = (page.props as { errors?: Record<string, string> }).errors ?? {};

    const resolveCsrfToken = (): string | null => {
        const metaToken = document
            .querySelector('meta[name="csrf-token"]')
            ?.getAttribute('content');

        if (metaToken && metaToken.trim() !== '') {
            return metaToken;
        }

        const xsrfCookie = document.cookie
            .split('; ')
            .find((entry) => entry.startsWith('XSRF-TOKEN='));

        if (!xsrfCookie) {
            return null;
        }

        const cookieValue = xsrfCookie.slice('XSRF-TOKEN='.length);

        try {
            return decodeURIComponent(cookieValue);
        } catch {
            return cookieValue;
        }
    };

    const toggleEvaluation = (nextState: boolean) => {
        router.patch(
            '/evaluation-settings',
            { is_open: nextState },
            {
                preserveScroll: true,
                onStart: () => setIsTogglingEvaluation(true),
                onFinish: () => setIsTogglingEvaluation(false),
            },
        );
    };

    const importSubjects = () => {
        if (!file) {
            return;
        }

        router.post(
            '/dean/subjects/import',
            { file },
            {
                forceFormData: true,
                preserveScroll: true,
                onStart: () => setIsImporting(true),
                onFinish: () => setIsImporting(false),
            },
        );
    };

    const importTemplate = () => {
        if (!templateFile) {
            return;
        }

        router.post(
            '/dean/summaries/template',
            { template_file: templateFile },
            {
                forceFormData: true,
                preserveScroll: true,
                onStart: () => setIsImportingTemplate(true),
                onFinish: () => setIsImportingTemplate(false),
            },
        );
    };

    const previewTemplateImport = async (selectedFile: File) => {
        setIsPreviewingTemplate(true);
        setTemplatePreviewError(null);
        setTemplatePreview(null);

        try {
            const formData = new FormData();
            formData.append('template_file', selectedFile);
            const csrfToken = resolveCsrfToken();

            if (csrfToken) {
                formData.append('_token', csrfToken);
            }

            const response = await fetch('/dean/summaries/template/preview', {
                method: 'POST',
                headers: csrfToken
                    ? {
                          'X-CSRF-TOKEN': csrfToken,
                          'X-XSRF-TOKEN': csrfToken,
                          'X-Requested-With': 'XMLHttpRequest',
                          Accept: 'application/json',
                      }
                    : {
                          'X-Requested-With': 'XMLHttpRequest',
                          Accept: 'application/json',
                      },
                body: formData,
            });

            const payload = (await response.json()) as TemplateImportPreview | { message?: string };

            if (!response.ok) {
                const message = 'message' in payload && typeof payload.message === 'string'
                    ? payload.message
                    : 'Unable to preview this DOCX template.';
                setTemplatePreviewError(message);
                return;
            }

            setTemplatePreview(payload as TemplateImportPreview);
        } catch {
            setTemplatePreviewError('Unable to preview this DOCX template right now. Try again.');
        } finally {
            setIsPreviewingTemplate(false);
        }
    };

    const handleTemplateFileChange = (selectedFile: File | null) => {
        setTemplateFile(selectedFile);
        setTemplatePreview(null);
        setTemplatePreviewError(null);

        if (!selectedFile) {
            return;
        }

        void previewTemplateImport(selectedFile);
    };

    const resolveClassFormat = (classSectionId: number): 'xlsx' | 'doc' => {
        return classFormats[classSectionId] ?? 'xlsx';
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dean Summary" />

            <div className="space-y-5 p-4">
                <div className="rounded-xl border p-4">
                    <h1 className="text-xl font-semibold">Dean View: Summary per Subject, Faculty, and Section</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        This page summarizes class-level evaluation metrics across the college.
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                        <LoadingButton
                            type="button"
                            variant={evaluationOpen ? 'default' : 'secondary'}
                            onClick={() => toggleEvaluation(!evaluationOpen)}
                            loading={isTogglingEvaluation}
                            loadingText={evaluationOpen ? 'Stopping...' : 'Starting...'}
                        >
                            {evaluationOpen ? 'Stop Evaluation' : 'Start Evaluation'}
                        </LoadingButton>
                        <p className="text-sm text-muted-foreground">
                            Status: <span className="font-medium">{evaluationOpen ? 'Open' : 'Closed'}</span>
                        </p>
                        <a href="/dean/summaries/preview" target="_blank" rel="noreferrer" className="inline-flex">
                            <Button type="button" variant="outline">
                                Preview Overall Document
                            </Button>
                        </a>
                        <select
                            value={overallFormat}
                            onChange={(event) => setOverallFormat(event.target.value as 'xlsx' | 'doc')}
                            className="h-9 rounded-md border bg-background px-3 text-sm"
                        >
                            <option value="xlsx">Excel (.xlsx)</option>
                            <option value="doc">DOC (.doc)</option>
                        </select>
                        <a href={`/dean/summaries/export?format=${overallFormat}`} className="inline-flex">
                            <Button type="button" variant="outline">
                                Download Overall Summary
                            </Button>
                        </a>
                    </div>
                    <div className="mt-4 grid gap-3 rounded-lg border border-dashed p-3">
                        <p className="text-sm text-muted-foreground">
                            Import subjects by semester offered, subject code, course name, program, and curriculum
                            year (example: 2023-2024).
                        </p>
                        <div className="flex flex-wrap items-center gap-3">
                            <a href="/dean/subjects/import-template" className="inline-flex">
                                <Button type="button" variant="outline">
                                    Download Excel Template (.xlsx)
                                </Button>
                            </a>
                            <input
                                type="file"
                                accept=".xlsx,.xls,.csv"
                                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                            />
                            <LoadingButton
                                type="button"
                                onClick={importSubjects}
                                disabled={!file}
                                loading={isImporting}
                                loadingText="Importing..."
                            >
                                Import Subjects
                            </LoadingButton>
                        </div>
                        {errors.file && <p className="text-sm font-medium text-red-600">{errors.file}</p>}
                    </div>

                    <div className="mt-4 grid gap-3 rounded-lg border border-dashed p-3">
                        <p className="text-sm text-muted-foreground">
                            Import a DOCX template with header/footer. When you choose a DOCX file, it is automatically
                            parsed and previewed below so you can check the output before applying it.
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Default template:{' '}
                            <span className="font-medium text-foreground">
                                {currentTemplate?.sourceFilename ?? 'None imported yet'}
                            </span>
                            {currentTemplate?.updatedAt ? ` (updated ${currentTemplate.updatedAt})` : ''}
                        </p>
                        <div className="flex flex-wrap items-center gap-3">
                            <input
                                type="file"
                                accept=".docx"
                                onChange={(event) => handleTemplateFileChange(event.target.files?.[0] ?? null)}
                            />
                            <LoadingButton
                                type="button"
                                onClick={importTemplate}
                                disabled={!templateFile || isPreviewingTemplate || !!templatePreviewError}
                                loading={isImportingTemplate}
                                loadingText="Importing template..."
                            >
                                Import Header/Footer Template
                            </LoadingButton>
                        </div>
                        {errors.template_file && <p className="text-sm font-medium text-red-600">{errors.template_file}</p>}
                        {isPreviewingTemplate && <p className="text-sm text-muted-foreground">Reading DOCX template preview...</p>}
                        {templatePreviewError && <p className="text-sm font-medium text-red-600">{templatePreviewError}</p>}
                        {templatePreview && (
                            <div className="grid gap-3 rounded-md border bg-muted/20 p-3">
                                <p className="text-sm text-muted-foreground">
                                    Preview loaded from: <span className="font-medium text-foreground">{templatePreview.source_filename}</span>
                                    {templatePreview.image_count > 0
                                        ? ` (images detected: ${templatePreview.image_count})`
                                        : ' (no images detected)'}
                                </p>
                                <div className="grid gap-3 md:grid-cols-2">
                                    <div className="rounded-md border bg-background p-3">
                                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Header Preview</p>
                                        <div
                                            className="text-sm"
                                            dangerouslySetInnerHTML={{ __html: templatePreview.header_html ?? '<em>No header found.</em>' }}
                                        />
                                    </div>
                                    <div className="rounded-md border bg-background p-3">
                                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Footer Preview</p>
                                        <div
                                            className="text-sm"
                                            dangerouslySetInnerHTML={{ __html: templatePreview.footer_html ?? '<em>No footer found.</em>' }}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    {status && <p className="mt-3 text-sm font-medium text-emerald-600">{status}</p>}
                </div>

                {rows.map((row) => {
                    const averageMap = Object.fromEntries(
                        row.questionAverages.map((entry) => [entry.questionNumber, entry.averageRating]),
                    );
                    const overallAverage =
                        row.overallAverage === null || row.overallAverage === undefined
                            ? null
                            : Number(row.overallAverage);

                    return (
                        <section key={row.classSectionId} className="overflow-hidden rounded-xl border">
                            <div className="border-b bg-muted/30 px-4 py-3">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <h2 className="font-semibold">{row.subject}</h2>
                                        <p className="text-sm text-muted-foreground">
                                            Faculty: {row.faculty} | Section: {row.section}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {[row.term, row.schoolYear].filter(Boolean).join(' - ') || '-'}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            Respondents: {row.respondents} | Overall Average:{' '}
                                            {overallAverage !== null && Number.isFinite(overallAverage)
                                                ? overallAverage.toFixed(2)
                                                : '-'}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <a
                                            href={`/dean/summaries/class-sections/${row.classSectionId}/preview`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex"
                                        >
                                            <Button type="button" variant="outline" size="sm">
                                                Preview Document
                                            </Button>
                                        </a>
                                        <select
                                            value={resolveClassFormat(row.classSectionId)}
                                            onChange={(event) =>
                                                setClassFormats((previous) => ({
                                                    ...previous,
                                                    [row.classSectionId]: event.target.value as 'xlsx' | 'doc',
                                                }))
                                            }
                                            className="h-8 rounded-md border bg-background px-2 text-xs"
                                        >
                                            <option value="xlsx">Excel</option>
                                            <option value="doc">DOC</option>
                                        </select>
                                        <a
                                            href={`/dean/summaries/class-sections/${row.classSectionId}/export?format=${resolveClassFormat(row.classSectionId)}`}
                                            className="inline-flex"
                                        >
                                            <Button type="button" variant="outline" size="sm">
                                                Download
                                            </Button>
                                        </a>
                                    </div>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-border text-sm">
                                    <thead className="bg-muted/30 text-left">
                                        <tr>
                                            <th className="px-4 py-3 font-medium">Question</th>
                                            <th className="px-4 py-3 font-medium">Average Rating</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {questions.map((question) => (
                                            <tr key={question.number}>
                                                <td className="px-4 py-3">
                                                    {question.number}. {question.text}
                                                </td>
                                                <td className="px-4 py-3 font-medium">
                                                    {averageMap[question.number]
                                                        ? Number(averageMap[question.number]).toFixed(2)
                                                        : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    );
                })}
            </div>
        </AppLayout>
    );
}
