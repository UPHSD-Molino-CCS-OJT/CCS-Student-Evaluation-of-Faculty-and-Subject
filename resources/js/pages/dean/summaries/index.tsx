import { Head } from '@inertiajs/react';
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
    overallAverage?: number | null;
    questionAverages: Array<{
        questionNumber: number;
        averageRating: number;
    }>;
};

type Props = {
    questions: Question[];
    rows: Row[];
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dean Summary',
        href: '/dean/summaries',
    },
];

export default function DeanSummaries({ questions, rows }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dean Summary" />

            <div className="space-y-5 p-4">
                <div className="rounded-xl border p-4">
                    <h1 className="text-xl font-semibold">Dean View: Summary per Subject, Faculty, and Section</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        This page summarizes class-level evaluation metrics across the college.
                    </p>
                </div>

                {rows.map((row) => {
                    const averageMap = Object.fromEntries(
                        row.questionAverages.map((entry) => [entry.questionNumber, entry.averageRating]),
                    );

                    return (
                        <section key={row.classSectionId} className="overflow-hidden rounded-xl border">
                            <div className="border-b bg-muted/30 px-4 py-3">
                                <h2 className="font-semibold">{row.subject}</h2>
                                <p className="text-sm text-muted-foreground">
                                    Faculty: {row.faculty} | Section: {row.section}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {[row.term, row.schoolYear].filter(Boolean).join(' - ') || '-'}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Respondents: {row.respondents} | Overall Average:{' '}
                                    {row.overallAverage ? row.overallAverage.toFixed(2) : '-'}
                                </p>
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
