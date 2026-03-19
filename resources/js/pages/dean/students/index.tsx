import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type StudentItem = {
    id: number;
    name: string;
    studentNumber: string | null;
    yearLevel: number | null;
    program: string;
    status: 'Active' | 'Inactive';
    statusNote: string;
};

type Props = {
    students: StudentItem[];
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Students',
        href: '/dean/students',
    },
];

export default function DeanStudentsIndex({ students }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Students" />

            <div className="space-y-5 p-4">
                <div className="rounded-xl border p-4">
                    <h1 className="text-xl font-semibold">Student Directory</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        View student number, year level, program, and current enrollment status.
                    </p>
                </div>

                <div className="overflow-hidden rounded-xl border">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-border text-sm">
                            <thead className="bg-muted/30 text-left">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Name</th>
                                    <th className="px-4 py-3 font-medium">Student Number</th>
                                    <th className="px-4 py-3 font-medium">Year Level</th>
                                    <th className="px-4 py-3 font-medium">Program</th>
                                    <th className="px-4 py-3 font-medium">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {students.map((student) => (
                                    <tr key={student.id}>
                                        <td className="px-4 py-3 font-medium">{student.name}</td>
                                        <td className="px-4 py-3">{student.studentNumber ?? '-'}</td>
                                        <td className="px-4 py-3">{student.yearLevel ? `${student.yearLevel}` : '-'}</td>
                                        <td className="px-4 py-3">{student.program}</td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={
                                                    student.status === 'Active'
                                                        ? 'text-emerald-600 dark:text-emerald-400'
                                                        : 'text-amber-600 dark:text-amber-400'
                                                }
                                            >
                                                {student.status}
                                            </span>
                                            <p className="text-xs text-muted-foreground">{student.statusNote}</p>
                                        </td>
                                    </tr>
                                ))}
                                {students.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                                            No student records found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
