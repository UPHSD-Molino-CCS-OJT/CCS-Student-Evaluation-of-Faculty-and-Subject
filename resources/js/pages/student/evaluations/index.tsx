import { Head, Link, usePage } from '@inertiajs/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type EvaluationItem = {
    classSectionId: number;
    subject: string;
    faculty: string;
    section: string;
    term?: string | null;
    schoolYear?: string | null;
    submitted: boolean;
};

type Props = {
    items: EvaluationItem[];
    evaluationOpen: boolean;
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'My Evaluations',
        href: '/student/evaluations',
    },
];

export default function StudentEvaluationsIndex({ items, evaluationOpen }: Props) {
    const page = usePage();
    const status = (page.props as { flash?: { status?: string } }).flash?.status;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="My Evaluations" />

            <div className="space-y-4 p-3 sm:p-4">
                <div className="rounded-xl border p-3 sm:p-4">
                    <h1 className="text-lg font-semibold sm:text-xl">Student Evaluation for Faculty and Subject</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Evaluate each assigned subject and faculty using the 25-question form.
                    </p>
                    {!evaluationOpen && (
                        <p className="mt-3 text-sm font-medium text-amber-600">
                            Evaluations are currently closed. Please wait until they are opened by the school staff.
                        </p>
                    )}
                    {status && <p className="mt-3 text-sm font-medium text-emerald-600">{status}</p>}
                </div>

                <div className="overflow-hidden rounded-xl border">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-border text-sm">
                            <thead className="bg-muted/30 text-left">
                                <tr>
                                    <th className="px-3 py-3 font-medium sm:px-4">Subject</th>
                                    <th className="px-3 py-3 font-medium sm:px-4">Faculty</th>
                                    <th className="px-3 py-3 font-medium sm:px-4">Section</th>
                                    <th className="px-3 py-3 font-medium sm:px-4">Term</th>
                                    <th className="px-3 py-3 font-medium sm:px-4">Status</th>
                                    <th className="px-3 py-3 font-medium sm:px-4">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {items.map((item) => (
                                    <tr key={item.classSectionId}>
                                        <td className="px-3 py-3 sm:px-4">{item.subject}</td>
                                        <td className="px-3 py-3 sm:px-4">{item.faculty}</td>
                                        <td className="px-3 py-3 sm:px-4">{item.section}</td>
                                        <td className="px-3 py-3 sm:px-4">
                                            {[item.term, item.schoolYear].filter(Boolean).join(' - ') || '-'}
                                        </td>
                                        <td className="px-3 py-3 sm:px-4">
                                            {item.submitted ? (
                                                <Badge variant="default">Submitted</Badge>
                                            ) : (
                                                <Badge variant="secondary">Pending</Badge>
                                            )}
                                        </td>
                                        <td className="px-3 py-3 sm:px-4">
                                            {item.submitted ? (
                                                <span className="text-muted-foreground">Completed</span>
                                            ) : !evaluationOpen ? (
                                                <span className="text-muted-foreground">Closed</span>
                                            ) : (
                                                <Button asChild size="sm">
                                                    <Link href={`/student/evaluations/${item.classSectionId}`}>Evaluate Now</Link>
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
