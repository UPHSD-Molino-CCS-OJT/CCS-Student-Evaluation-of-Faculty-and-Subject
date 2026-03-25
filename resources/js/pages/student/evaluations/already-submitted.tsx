import { Head, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type Props = {
    subject: string;
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'My Evaluations',
        href: '/student/evaluations',
    },
    {
        title: 'Submitted',
        href: '#',
    },
];

export default function StudentEvaluationAlreadySubmitted({ subject }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Evaluation Submitted" />
            <div className="mx-auto mt-6 max-w-2xl rounded-xl border p-4 sm:mt-10 sm:p-6">
                <h1 className="text-lg font-semibold sm:text-xl">Evaluation already submitted</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    You have already submitted your evaluation for <span className="font-medium">{subject}</span>.
                </p>
                <div className="mt-6">
                    <Button asChild className="w-full sm:w-auto">
                        <Link href="/student/evaluations">Back to dashboard</Link>
                    </Button>
                </div>
            </div>
        </AppLayout>
    );
}
