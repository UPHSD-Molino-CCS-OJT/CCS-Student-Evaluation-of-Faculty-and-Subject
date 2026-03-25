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

            <div className="space-y-4 p-3 sm:space-y-5 sm:p-4">
                <div className="rounded-xl border p-3 sm:p-4">
                    <h1 className="text-lg font-semibold sm:text-xl">Student Directory</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        View student number, year level, program, and current enrollment status.
                    </p>
                </div>

                <div className="overflow-hidden rounded-xl border">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-border text-sm">
                            <thead className="bg-muted/30 text-left">
                                <tr>
                                    <th className="px-3 py-3 font-medium sm:px-4">Name</th>
                                    <th className="px-3 py-3 font-medium sm:px-4">Student Number</th>
                                    <th className="px-3 py-3 font-medium sm:px-4">Year Level</th>
                                    <th className="px-3 py-3 font-medium sm:px-4">Program</th>
                                    <th className="px-3 py-3 font-medium sm:px-4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {students.map((student) => (
                                    <tr key={student.id}>
                                        <td className="px-3 py-3 font-medium sm:px-4">{student.name}</td>
                                        <td className="px-3 py-3 sm:px-4">{student.studentNumber ?? '-'}</td>
                                        <td className="px-3 py-3 sm:px-4">{student.yearLevel ? `${student.yearLevel}` : '-'}</td>
                                        <td className="px-3 py-3 sm:px-4">{student.program}</td>
                                        <td className="px-3 py-3 sm:px-4">
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
                                        <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground sm:px-4">
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
