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
    section: string;
    term?: string | null;
    schoolYear?: string | null;
    respondents: number;
    overallAverage?: number | string | null;
    facultySignedAt?: string | null;
    deanSignedAt?: string | null;
    canSign?: boolean;
    questionAverages: Array<{
        questionNumber: number;
        averageRating: number;
    }>;
};

type Props = {
    questions: Question[];
    rows: Row[];
    hasDatabaseEsign: boolean;
    existingEsignImageUrl?: string | null;
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Faculty Reports',
        href: '/faculty/reports',
    },
];

export default function FacultyReports({ questions, rows, hasDatabaseEsign, existingEsignImageUrl }: Props) {
    const page = usePage();
    const [esignFile, setEsignFile] = useState<File | null>(null);
    const [isImportingEsign, setIsImportingEsign] = useState(false);
    const status = (page.props as { flash?: { status?: string } }).flash?.status;
    const errors = (page.props as { errors?: Record<string, string> }).errors ?? {};

    const signAndSubmit = (classSectionId: number) => {
        router.post(`/faculty/reports/${classSectionId}/sign`, {}, { preserveScroll: true });
    };

    const importEsign = () => {
        if (!esignFile) {
            return;
        }

        router.post(
            '/settings/esign',
            { esign_image: esignFile },
            {
                forceFormData: true,
                preserveScroll: true,
                onStart: () => setIsImportingEsign(true),
                onFinish: () => setIsImportingEsign(false),
            },
        );
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
            <Head title="Faculty Reports" />

            <div className="space-y-4 p-3 sm:space-y-5 sm:p-4">
                <div className="rounded-xl border p-3 sm:p-4">
                    <h1 className="text-lg font-semibold sm:text-xl">Faculty View: Evaluation Results per Section</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        This report shows section-level averages with class offerings grouped under each section.
                    </p>
                    <p
                        className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
                            hasDatabaseEsign
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : 'border-amber-200 bg-amber-50 text-amber-700'
                        }`}
                    >
                        {hasDatabaseEsign ? 'E-sign saved in database' : 'E-sign not yet saved in database'}
                    </p>
                    <div className="mt-4 grid gap-3 rounded-lg border border-dashed p-3 sm:p-4">
                        <p className="text-sm text-muted-foreground">
                            Import your e-sign so you can sign and submit reports to the dean.
                        </p>
                        {existingEsignImageUrl && (
                            <div className="space-y-2">
                                <p className="text-xs font-medium text-muted-foreground">Current saved e-sign:</p>
                                <img
                                    src={existingEsignImageUrl}
                                    alt="Current faculty e-sign"
                                    className="max-h-24 w-auto max-w-full rounded border bg-white p-2"
                                />
                            </div>
                        )}
                        <div className="flex flex-wrap items-center gap-3">
                            <input
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                onChange={(event) => setEsignFile(event.target.files?.[0] ?? null)}
                            />
                            <LoadingButton
                                type="button"
                                onClick={importEsign}
                                disabled={!esignFile}
                                loading={isImportingEsign}
                                loadingText="Importing E-sign..."
                            >
                                Import E-sign
                            </LoadingButton>
                        </div>
                        {existingEsignImageUrl && (
                            <p className="text-xs text-muted-foreground">
                                An e-sign is already saved for this faculty account. Uploading a new image will replace the current one.
                            </p>
                        )}
                        {errors.esign_image && <p className="text-sm font-medium text-red-600">{errors.esign_image}</p>}
                    </div>
                    {errors.esign && <p className="mt-2 text-sm font-medium text-red-600">{errors.esign}</p>}
                    {status && <p className="mt-2 text-sm font-medium text-emerald-600">{status}</p>}
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
                                <h2 className="font-semibold">Section: {section}</h2>
                                <p className="text-sm text-muted-foreground">
                                    Respondents: {totalRespondents} | Section Overall Average:{' '}
                                    {sectionOverallAverage !== null ? sectionOverallAverage.toFixed(2) : '-'}
                                </p>
                            </div>
                            <div className="space-y-2 border-b p-3 sm:p-4">
                                {questionSections.map((questionSection) => (
                                    <details
                                        key={`${section}-${questionSection.category}`}
                                        className="overflow-hidden rounded-md border"
                                        open
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

                            <div className="space-y-2 p-3 sm:p-4">
                                <h3 className="text-sm font-semibold">Class Offerings In This Section</h3>
                                {sectionRows.map((row) => {
                                    const overallAverage = toNumericAverage(row.overallAverage);

                                    return (
                                        <div key={row.classSectionId} className="rounded-md border p-3">
                                            <p className="font-medium">{row.subject}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {[row.term, row.schoolYear].filter(Boolean).join(' - ') || '-'}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                Respondents: {row.respondents} | Overall Average:{' '}
                                                {overallAverage !== null ? overallAverage.toFixed(2) : '-'}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                Faculty Signed: {row.facultySignedAt ?? 'Pending'} | Dean Confirmation:{' '}
                                                {row.deanSignedAt ?? 'Pending'}
                                            </p>
                                            <div className="mt-2">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    onClick={() => signAndSubmit(row.classSectionId)}
                                                    disabled={!row.canSign}
                                                >
                                                    {row.facultySignedAt ? 'Already Signed' : 'Sign & Submit to Dean'}
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    );
                })}
            </div>
        </AppLayout>
    );
}
