import { Head, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { LoadingButton } from '@/components/ui/loading-button';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type StudentItem = {
    id: number;
    name: string;
    studentNumber: string | null;
    yearLevel: number | null;
    courseProgram: string | null;
    studentType: 'regular' | 'irregular' | null;
    program: string;
    status: 'Active' | 'Inactive';
    statusNote: string;
};

type Props = {
    students: StudentItem[];
    programOptions: string[];
    yearLevels: number[];
    studentTypes: Array<'regular' | 'irregular'>;
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Students',
        href: '/dean/students',
    },
];

export default function DeanStudentsIndex({ students, programOptions, yearLevels, studentTypes }: Props) {
    const page = usePage();
    const status = (page.props as { flash?: { status?: string } }).flash?.status;
    const errors = (page.props as { errors?: Record<string, string> }).errors ?? {};

    const [editingStudentId, setEditingStudentId] = useState<number | null>(null);
    const [form, setForm] = useState({
        name: '',
        student_id: '',
        course_program: '',
        year_level: '',
        student_type: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const startEdit = (student: StudentItem) => {
        setEditingStudentId(student.id);
        setForm({
            name: student.name,
            student_id: student.studentNumber ?? '',
            course_program: student.courseProgram ?? '',
            year_level: student.yearLevel ? String(student.yearLevel) : '',
            student_type: student.studentType ?? '',
        });
    };

    const cancelEdit = () => {
        setEditingStudentId(null);
        setForm({
            name: '',
            student_id: '',
            course_program: '',
            year_level: '',
            student_type: '',
        });
    };

    const submit = () => {
        if (editingStudentId === null) {
            return;
        }

        router.patch(`/dean/students/${editingStudentId}`, form, {
            preserveScroll: true,
            onStart: () => setIsSubmitting(true),
            onFinish: () => setIsSubmitting(false),
            onSuccess: () => {
                cancelEdit();
            },
        });
    };

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

                {status && <p className="text-sm font-medium text-emerald-600">{status}</p>}

                {editingStudentId !== null && (
                    <section className="rounded-xl border p-3 sm:p-4">
                        <h2 className="font-semibold">Edit Student</h2>

                        <fieldset disabled={isSubmitting} className="mt-4 grid gap-3 md:grid-cols-2">
                            <label className="space-y-1 text-sm">
                                <span>Name</span>
                                <input
                                    type="text"
                                    className="w-full rounded-md border bg-background px-3 py-2"
                                    value={form.name}
                                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                                />
                                {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
                            </label>

                            <label className="space-y-1 text-sm">
                                <span>Student Number</span>
                                <input
                                    type="text"
                                    className="w-full rounded-md border bg-background px-3 py-2"
                                    placeholder="e.g. 1-1111-111"
                                    value={form.student_id}
                                    onChange={(e) => setForm((prev) => ({ ...prev, student_id: e.target.value }))}
                                />
                                {errors.student_id && <p className="text-xs text-red-600">{errors.student_id}</p>}
                            </label>

                            <label className="space-y-1 text-sm">
                                <span>Program</span>
                                <input
                                    type="text"
                                    list="student-program-options"
                                    className="w-full rounded-md border bg-background px-3 py-2"
                                    value={form.course_program}
                                    onChange={(e) => setForm((prev) => ({ ...prev, course_program: e.target.value }))}
                                    placeholder="e.g. BSCS"
                                />
                                <datalist id="student-program-options">
                                    {programOptions.map((program) => (
                                        <option key={program} value={program} />
                                    ))}
                                </datalist>
                                {errors.course_program && <p className="text-xs text-red-600">{errors.course_program}</p>}
                            </label>

                            <label className="space-y-1 text-sm">
                                <span>Year Level</span>
                                <select
                                    className="w-full rounded-md border bg-background px-3 py-2"
                                    value={form.year_level}
                                    onChange={(e) => setForm((prev) => ({ ...prev, year_level: e.target.value }))}
                                >
                                    <option value="">Select year level</option>
                                    {yearLevels.map((yearLevel) => (
                                        <option key={yearLevel} value={yearLevel}>
                                            {yearLevel}
                                        </option>
                                    ))}
                                </select>
                                {errors.year_level && <p className="text-xs text-red-600">{errors.year_level}</p>}
                            </label>

                            <label className="space-y-1 text-sm md:col-span-2">
                                <span>Student Type</span>
                                <select
                                    className="w-full rounded-md border bg-background px-3 py-2"
                                    value={form.student_type}
                                    onChange={(e) => setForm((prev) => ({ ...prev, student_type: e.target.value }))}
                                >
                                    <option value="">Select student type</option>
                                    {studentTypes.map((studentType) => (
                                        <option key={studentType} value={studentType}>
                                            {studentType.charAt(0).toUpperCase() + studentType.slice(1)}
                                        </option>
                                    ))}
                                </select>
                                {errors.student_type && <p className="text-xs text-red-600">{errors.student_type}</p>}
                            </label>
                        </fieldset>

                        <div className="mt-4">
                            <LoadingButton type="button" onClick={submit} loading={isSubmitting} loadingText="Saving...">
                                Save Student
                            </LoadingButton>
                            <button type="button" className="ml-2 rounded-md border px-4 py-2 text-sm" onClick={cancelEdit}>
                                Cancel
                            </button>
                        </div>
                    </section>
                )}

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
                                    <th className="px-3 py-3 font-medium sm:px-4">Actions</th>
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
                                        <td className="px-3 py-3 sm:px-4">
                                            <button
                                                type="button"
                                                className="rounded-md border px-3 py-1 text-xs"
                                                onClick={() => startEdit(student)}
                                            >
                                                Edit
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {students.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground sm:px-4">
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
