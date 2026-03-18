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
    facultySignedAt?: string | null;
    facultySignedBy?: string | null;
    deanSignedAt?: string | null;
    deanSignedBy?: string | null;
    canDeanSign?: boolean;
    questionAverages: Array<{
        questionNumber: number;
        averageRating: number;
    }>;
};

type Props = {
    questions: Question[];
    rows: Row[];
    evaluationOpen: boolean;
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dean Summary',
        href: '/dean/summaries',
    },
];

export default function DeanSummaries({ questions, rows, evaluationOpen }: Props) {
    const page = usePage();
    const [file, setFile] = useState<File | null>(null);
    const [templateFile, setTemplateFile] = useState<File | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [isImportingTemplate, setIsImportingTemplate] = useState(false);
    const [isTogglingEvaluation, setIsTogglingEvaluation] = useState(false);

    const status = (page.props as { flash?: { status?: string } }).flash?.status;
    const errors = (page.props as { errors?: Record<string, string> }).errors ?? {};

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

    const deanSign = (classSectionId: number) => {
        router.post(`/dean/summaries/class-sections/${classSectionId}/sign`, {}, { preserveScroll: true });
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
                        <a
                            href="/dean/summaries/export?format=docx&disposition=inline"
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex"
                        >
                            <Button type="button" variant="outline">
                                Preview Overall (DOCX)
                            </Button>
                        </a>
                        <a href="/dean/summaries/export?format=docx" className="inline-flex">
                            <Button type="button" variant="outline">
                                Download Overall Summary (DOCX)
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
                            Import a DOCX template so DOCX export uses proper header/footer from your file.
                        </p>
                        <div className="flex flex-wrap items-center gap-3">
                            <input
                                type="file"
                                accept=".docx"
                                onChange={(event) => setTemplateFile(event.target.files?.[0] ?? null)}
                            />
                            <LoadingButton
                                type="button"
                                onClick={importTemplate}
                                disabled={!templateFile}
                                loading={isImportingTemplate}
                                loadingText="Importing DOCX..."
                            >
                                Import DOCX Template
                            </LoadingButton>
                        </div>
                        {errors.template_file && (
                            <p className="text-sm font-medium text-red-600">{errors.template_file}</p>
                        )}
                    </div>
                    {errors.esign && <p className="mt-3 text-sm font-medium text-red-600">{errors.esign}</p>}
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
                                        <p className="text-sm text-muted-foreground">
                                            Faculty Signed:{' '}
                                            {row.facultySignedAt
                                                ? `${row.facultySignedBy ?? 'Faculty'} at ${row.facultySignedAt}`
                                                : 'Pending'}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            Dean Signed:{' '}
                                            {row.deanSignedAt
                                                ? `${row.deanSignedBy ?? 'Dean'} at ${row.deanSignedAt}`
                                                : 'Pending'}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <a
                                            href={`/dean/summaries/class-sections/${row.classSectionId}/export?format=docx&disposition=inline`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex"
                                        >
                                            <Button type="button" variant="outline" size="sm">
                                                Preview DOCX
                                            </Button>
                                        </a>
                                        <a
                                            href={`/dean/summaries/class-sections/${row.classSectionId}/export?format=docx`}
                                            className="inline-flex"
                                        >
                                            <Button type="button" variant="outline" size="sm">
                                                Download DOCX
                                            </Button>
                                        </a>
                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={() => deanSign(row.classSectionId)}
                                            disabled={!row.canDeanSign}
                                        >
                                            {row.deanSignedAt ? 'Already Signed' : 'Sign as Dean'}
                                        </Button>
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
