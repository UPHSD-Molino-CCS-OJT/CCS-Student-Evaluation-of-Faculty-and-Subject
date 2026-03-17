import { Head, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type StudentOption = {
    id: number;
    name: string;
    studentNumber: string | null;
};

type FacultyOption = {
    id: number;
    name: string;
};

type SubjectOption = {
    id: number;
    code: string;
    title: string;
    program: string | null;
};

type EnrollmentItem = {
    id: number;
    studentName: string | null;
    studentNumber: string | null;
    subjectCode: string | null;
    subjectTitle: string | null;
    program: string | null;
    section: string | null;
    term: string | null;
    schoolYear: string | null;
};

type Props = {
    students: StudentOption[];
    faculty: FacultyOption[];
    subjects: SubjectOption[];
    enrollments: EnrollmentItem[];
    terms: string[];
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Enrollments',
        href: '/dean/enrollments',
    },
];

export default function DeanEnrollmentsIndex({ students, faculty, subjects, enrollments, terms }: Props) {
    const page = usePage();
    const status = (page.props as { flash?: { status?: string } }).flash?.status;
    const errors = (page.props as { errors?: Record<string, string> }).errors ?? {};

    const [form, setForm] = useState({
        student_id: '',
        subject_id: '',
        faculty_id: '',
        section_code: '',
        term: terms[0] ?? '1st Semester',
        school_year: '',
    });

    const submit = () => {
        router.post('/dean/enrollments', form, {
            preserveScroll: true,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Enrollments" />

            <div className="space-y-5 p-4">
                <div className="rounded-xl border p-4">
                    <h1 className="text-xl font-semibold">Enrollment Management</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Enroll students in a class offering by semester, school year, section, subject, and faculty.
                    </p>
                </div>

                <section className="rounded-xl border p-4">
                    <h2 className="font-semibold">Add Enrollment</h2>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <label className="space-y-1 text-sm">
                            <span>Student</span>
                            <select
                                className="w-full rounded-md border bg-background px-3 py-2"
                                value={form.student_id}
                                onChange={(e) => setForm((prev) => ({ ...prev, student_id: e.target.value }))}
                            >
                                <option value="">Select student</option>
                                {students.map((student) => (
                                    <option key={student.id} value={student.id}>
                                        {student.name} ({student.studentNumber ?? '-'})
                                    </option>
                                ))}
                            </select>
                            {errors.student_id && <p className="text-xs text-red-600">{errors.student_id}</p>}
                        </label>

                        <label className="space-y-1 text-sm">
                            <span>Subject</span>
                            <select
                                className="w-full rounded-md border bg-background px-3 py-2"
                                value={form.subject_id}
                                onChange={(e) => setForm((prev) => ({ ...prev, subject_id: e.target.value }))}
                            >
                                <option value="">Select subject</option>
                                {subjects.map((subject) => (
                                    <option key={subject.id} value={subject.id}>
                                        {subject.code} - {subject.title}
                                    </option>
                                ))}
                            </select>
                            {errors.subject_id && <p className="text-xs text-red-600">{errors.subject_id}</p>}
                        </label>

                        <label className="space-y-1 text-sm">
                            <span>Faculty</span>
                            <select
                                className="w-full rounded-md border bg-background px-3 py-2"
                                value={form.faculty_id}
                                onChange={(e) => setForm((prev) => ({ ...prev, faculty_id: e.target.value }))}
                            >
                                <option value="">Select faculty</option>
                                {faculty.map((teacher) => (
                                    <option key={teacher.id} value={teacher.id}>
                                        {teacher.name}
                                    </option>
                                ))}
                            </select>
                            {errors.faculty_id && <p className="text-xs text-red-600">{errors.faculty_id}</p>}
                        </label>

                        <label className="space-y-1 text-sm">
                            <span>Section</span>
                            <input
                                type="text"
                                placeholder="e.g. BSCS-2A"
                                className="w-full rounded-md border bg-background px-3 py-2"
                                value={form.section_code}
                                onChange={(e) => setForm((prev) => ({ ...prev, section_code: e.target.value }))}
                            />
                            {errors.section_code && <p className="text-xs text-red-600">{errors.section_code}</p>}
                        </label>

                        <label className="space-y-1 text-sm">
                            <span>Semester</span>
                            <select
                                className="w-full rounded-md border bg-background px-3 py-2"
                                value={form.term}
                                onChange={(e) => setForm((prev) => ({ ...prev, term: e.target.value }))}
                            >
                                {terms.map((term) => (
                                    <option key={term} value={term}>
                                        {term}
                                    </option>
                                ))}
                            </select>
                            {errors.term && <p className="text-xs text-red-600">{errors.term}</p>}
                        </label>

                        <label className="space-y-1 text-sm">
                            <span>School Year</span>
                            <input
                                type="text"
                                placeholder="e.g. 2025-2026"
                                className="w-full rounded-md border bg-background px-3 py-2"
                                value={form.school_year}
                                onChange={(e) => setForm((prev) => ({ ...prev, school_year: e.target.value }))}
                            />
                            {errors.school_year && <p className="text-xs text-red-600">{errors.school_year}</p>}
                        </label>
                    </div>

                    <div className="mt-4">
                        <Button type="button" onClick={submit}>
                            Enroll Student
                        </Button>
                        {status && <p className="mt-2 text-sm font-medium text-emerald-600">{status}</p>}
                    </div>
                </section>

                <section className="overflow-hidden rounded-xl border">
                    <div className="border-b bg-muted/30 px-4 py-3">
                        <h2 className="font-semibold">Current Enrollments</h2>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-border text-sm">
                            <thead className="bg-muted/30 text-left">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Student</th>
                                    <th className="px-4 py-3 font-medium">Student Number</th>
                                    <th className="px-4 py-3 font-medium">Subject</th>
                                    <th className="px-4 py-3 font-medium">Program</th>
                                    <th className="px-4 py-3 font-medium">Section</th>
                                    <th className="px-4 py-3 font-medium">Semester</th>
                                    <th className="px-4 py-3 font-medium">School Year</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {enrollments.map((row) => (
                                    <tr key={row.id}>
                                        <td className="px-4 py-3">{row.studentName ?? '-'}</td>
                                        <td className="px-4 py-3">{row.studentNumber ?? '-'}</td>
                                        <td className="px-4 py-3">{[row.subjectCode, row.subjectTitle].filter(Boolean).join(' - ') || '-'}</td>
                                        <td className="px-4 py-3">{row.program ?? '-'}</td>
                                        <td className="px-4 py-3">{row.section ?? '-'}</td>
                                        <td className="px-4 py-3">{row.term ?? '-'}</td>
                                        <td className="px-4 py-3">{row.schoolYear ?? '-'}</td>
                                    </tr>
                                ))}
                                {enrollments.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                                            No enrollments found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </AppLayout>
    );
}
