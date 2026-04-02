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
    sectionId: number;
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

    const sectionGroups = Object.entries(
        rows.reduce<Record<string, Row[]>>((groups, row) => {
            const key = row.section || 'Unassigned Section';
            groups[key] ??= [];
            groups[key].push(row);

            return groups;
        }, {}),
    ).sort(([left], [right]) => left.localeCompare(right));

    const toNumericAverage = (value: number | string | null | undefined): number | null => {
        if (value === null || value === undefined) {
            return null;
        }

        const parsed = Number(value);

        return Number.isFinite(parsed) ? parsed : null;
    };

    const questionSections = questions.reduce<Array<{ category: string; items: Question[] }>>((sections, question) => {
        const existingSection = sections.find((section) => section.category === question.category);

        if (existingSection) {
            existingSection.items.push(question);

            return sections;
        }

        sections.push({
            category: question.category,
            items: [question],
        });

        return sections;
    }, []);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dean Summary" />

            <div className="space-y-4 p-3 sm:space-y-5 sm:p-4">
                <div className="rounded-xl border p-3 sm:p-4">
                    <h1 className="text-lg font-semibold sm:text-xl">Dean View: Evaluation Results per Section</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        This page summarizes section-level evaluation metrics across all class offerings.
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
                            href="/dean/summaries/preview"
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex"
                        >
                            <Button type="button" variant="outline">
                                Preview
                            </Button>
                        </a>
                        <a href="/dean/summaries/export?format=docx" className="inline-flex">
                            <Button type="button" variant="outline">
                                Download Overall Summary (DOCX)
                            </Button>
                        </a>
                        <a href="/dean/summaries/export/pdf-office" className="inline-flex">
                            <Button type="button" variant="outline">
                                PDF Download (Office)
                            </Button>
                        </a>
                    </div>
                    <div className="mt-4 grid gap-3 rounded-lg border border-dashed p-3 sm:p-4">
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

                    <div className="mt-4 grid gap-3 rounded-lg border border-dashed p-3 sm:p-4">
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

                {sectionGroups.map(([section, sectionRows]) => {
                    const totalRespondents = sectionRows.reduce((total, row) => total + row.respondents, 0);

                    const weightedOverallSum = sectionRows.reduce((total, row) => {
                        const overallAverage = toNumericAverage(row.overallAverage);

                        if (overallAverage === null || row.respondents <= 0) {
                            return total;
                        }

                        return total + overallAverage * row.respondents;
                    }, 0);

                    const sectionOverallAverage =
                        totalRespondents > 0 ? weightedOverallSum / totalRespondents : null;

                    const sectionQuestionAverages = questions.map((question) => {
                        const weightedQuestion = sectionRows.reduce(
                            (accumulator, row) => {
                                const questionAverage = row.questionAverages.find(
                                    (entry) => entry.questionNumber === question.number,
                                )?.averageRating;

                                if (questionAverage === undefined || row.respondents <= 0) {
                                    return accumulator;
                                }

                                return {
                                    weightedSum: accumulator.weightedSum + questionAverage * row.respondents,
                                    respondents: accumulator.respondents + row.respondents,
                                };
                            },
                            { weightedSum: 0, respondents: 0 },
                        );

                        return {
                            question,
                            average:
                                weightedQuestion.respondents > 0
                                    ? weightedQuestion.weightedSum / weightedQuestion.respondents
                                    : null,
                        };
                    });

                    const averageByQuestionNumber = Object.fromEntries(
                        sectionQuestionAverages.map(({ question, average }) => [question.number, average]),
                    );

                    return (
                        <section key={section} className="overflow-hidden rounded-xl border">
                            <div className="border-b bg-muted/30 px-3 py-3 sm:px-4">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <h2 className="font-semibold">Section: {section}</h2>
                                    {sectionRows[0]?.sectionId && (
                                        <a
                                            href={`/dean/summaries/sections/${sectionRows[0].sectionId}/export?format=docx`}
                                            className="inline-flex"
                                        >
                                            <Button type="button" variant="outline" size="sm">
                                                Download Section DOCX
                                            </Button>
                                        </a>
                                    )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Respondents: {totalRespondents} | Section Overall Average:{' '}
                                    {sectionOverallAverage !== null ? sectionOverallAverage.toFixed(2) : '-'}
                                </p>
                            </div>
                            <div className="space-y-2 border-b p-3 sm:p-4">
                                {questionSections.map((questionSection, questionSectionIndex) => (
                                    <details
                                        key={`${section}-${questionSection.category}`}
                                        className="overflow-hidden rounded-md border"
                                        open={questionSectionIndex === 0}
                                    >
                                        <summary className="cursor-pointer bg-muted/20 px-3 py-2 text-sm font-semibold">
                                            Section: {questionSection.category} ({questionSection.items.length})
                                        </summary>
                                        <div className="overflow-x-auto border-t">
                                            <table className="min-w-full divide-y divide-border text-sm">
                                                <thead className="bg-muted/30 text-left">
                                                    <tr>
                                                        <th className="px-3 py-3 font-medium sm:px-4">Question</th>
                                                        <th className="px-3 py-3 font-medium sm:px-4">Average Rating</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border">
                                                    {questionSection.items.map((question) => {
                                                        const average = averageByQuestionNumber[question.number] as number | null | undefined;

                                                        return (
                                                            <tr key={`${section}-${questionSection.category}-${question.number}`}>
                                                                <td className="px-3 py-3 sm:px-4">
                                                                    {question.number}. {question.text}
                                                                </td>
                                                                <td className="px-3 py-3 font-medium sm:px-4">
                                                                    {average !== null && average !== undefined ? average.toFixed(2) : '-'}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </details>
                                ))}
                            </div>

                            <div className="overflow-x-auto border-t">
                                <table className="min-w-full divide-y divide-border text-sm">
                                    <thead className="bg-muted/20 text-left">
                                        <tr>
                                            <th className="px-3 py-3 font-medium sm:px-4">Subject</th>
                                            <th className="px-3 py-3 font-medium sm:px-4">Faculty</th>
                                            <th className="px-3 py-3 font-medium sm:px-4">Term / School Year</th>
                                            <th className="px-3 py-3 font-medium sm:px-4">Respondents</th>
                                            <th className="px-3 py-3 font-medium sm:px-4">Overall Avg</th>
                                            <th className="px-3 py-3 font-medium sm:px-4">Faculty Sign</th>
                                            <th className="px-3 py-3 font-medium sm:px-4">Dean Sign</th>
                                            <th className="px-3 py-3 font-medium sm:px-4">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {sectionRows.map((row) => {
                                            const overallAverage = toNumericAverage(row.overallAverage);

                                            return (
                                                <tr key={row.classSectionId}>
                                                    <td className="px-3 py-3 sm:px-4">{row.subject}</td>
                                                    <td className="px-3 py-3 sm:px-4">{row.faculty}</td>
                                                    <td className="px-3 py-3 sm:px-4">
                                                        {[row.term, row.schoolYear].filter(Boolean).join(' - ') || '-'}
                                                    </td>
                                                    <td className="px-3 py-3 sm:px-4">{row.respondents}</td>
                                                    <td className="px-3 py-3 sm:px-4">
                                                        {overallAverage !== null ? overallAverage.toFixed(2) : '-'}
                                                    </td>
                                                    <td className="px-3 py-3 sm:px-4">
                                                        {row.facultySignedAt
                                                            ? `${row.facultySignedBy ?? 'Faculty'} at ${row.facultySignedAt}`
                                                            : 'Pending'}
                                                    </td>
                                                    <td className="px-3 py-3 sm:px-4">
                                                        {row.deanSignedAt
                                                            ? `${row.deanSignedBy ?? 'Dean'} at ${row.deanSignedAt}`
                                                            : 'Pending'}
                                                    </td>
                                                    <td className="px-3 py-3 sm:px-4">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <a
                                                                href={`/dean/summaries/class-sections/${row.classSectionId}/preview`}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="inline-flex"
                                                            >
                                                                <Button type="button" variant="outline" size="sm">
                                                                    Preview
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
                                                            <a
                                                                href={`/dean/summaries/class-sections/${row.classSectionId}/export/pdf-office`}
                                                                className="inline-flex"
                                                            >
                                                                <Button type="button" variant="outline" size="sm">
                                                                    PDF Download (Office)
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
                                                    </td>
                                                </tr>
                                            );
                                        })}
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
