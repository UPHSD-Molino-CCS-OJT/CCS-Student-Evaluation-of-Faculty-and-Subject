import { Head, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { LoadingButton } from '@/components/ui/loading-button';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type FacultyOption = {
    id: number;
    name: string;
    email: string;
};

type SubjectOption = {
    id: number;
    code: string;
    title: string;
    program: string | null;
};

type FacultyAssignment = {
    classSectionId: number;
    subjectCode: string | null;
    subjectTitle: string | null;
    program: string | null;
    section: string | null;
    term: string | null;
    schoolYear: string | null;
};

type FacultyItem = {
    id: number;
    name: string;
    email: string;
    assignmentCount: number;
    assignments: FacultyAssignment[];
};

type Props = {
    faculty: FacultyItem[];
    facultyOptions: FacultyOption[];
    subjects: SubjectOption[];
    terms: string[];
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Faculty Management',
        href: '/dean/faculty-management',
    },
];

export default function DeanFacultyManagementIndex({ faculty, facultyOptions, subjects, terms }: Props) {
    const page = usePage();
    const status = (page.props as { flash?: { status?: string } }).flash?.status;
    const errors = (page.props as { errors?: Record<string, string> }).errors ?? {};

    const [form, setForm] = useState({
        faculty_id: '',
        subject_id: '',
        section_code: '',
        term: terms[0] ?? '1st Semester',
        school_year: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [assignmentEditingId, setAssignmentEditingId] = useState<number | null>(null);

    const [facultyForm, setFacultyForm] = useState({
        name: '',
        email: '',
        password: '',
    });
    const [facultyEditingId, setFacultyEditingId] = useState<number | null>(null);
    const [isFacultySubmitting, setIsFacultySubmitting] = useState(false);

    const submit = () => {
        const url = assignmentEditingId === null
            ? '/dean/faculty-management'
            : `/dean/faculty-management/${assignmentEditingId}`;
        const method = assignmentEditingId === null ? 'post' : 'patch';

        router[method](url, form, {
            preserveScroll: true,
            onStart: () => setIsSubmitting(true),
            onFinish: () => setIsSubmitting(false),
            onSuccess: () => {
                setAssignmentEditingId(null);
                setForm({
                    faculty_id: '',
                    subject_id: '',
                    section_code: '',
                    term: terms[0] ?? '1st Semester',
                    school_year: '',
                });
            },
        });
    };

    const submitFaculty = () => {
        const url = facultyEditingId === null
            ? '/dean/faculty-management/faculty'
            : `/dean/faculty-management/faculty/${facultyEditingId}`;
        const method = facultyEditingId === null ? 'post' : 'patch';

        router[method](url, facultyForm, {
            preserveScroll: true,
            onStart: () => setIsFacultySubmitting(true),
            onFinish: () => setIsFacultySubmitting(false),
            onSuccess: () => {
                setFacultyEditingId(null);
                setFacultyForm({
                    name: '',
                    email: '',
                    password: '',
                });
            },
        });
    };

    const startAssignmentEdit = (teacherId: number, assignment: FacultyAssignment) => {
        setAssignmentEditingId(assignment.classSectionId);
        const subject = subjects.find((item) => item.code === assignment.subjectCode && item.title === assignment.subjectTitle);

        setForm({
            faculty_id: String(teacherId),
            subject_id: subject ? String(subject.id) : '',
            section_code: assignment.section ?? '',
            term: assignment.term ?? (terms[0] ?? '1st Semester'),
            school_year: assignment.schoolYear ?? '',
        });
    };

    const cancelAssignmentEdit = () => {
        setAssignmentEditingId(null);
        setForm({
            faculty_id: '',
            subject_id: '',
            section_code: '',
            term: terms[0] ?? '1st Semester',
            school_year: '',
        });
    };

    const removeAssignment = (classSectionId: number) => {
        if (!window.confirm('Remove this assignment?')) {
            return;
        }

        router.delete(`/dean/faculty-management/${classSectionId}`, {
            preserveScroll: true,
        });
    };

    const startFacultyEdit = (teacher: FacultyItem) => {
        setFacultyEditingId(teacher.id);
        setFacultyForm({
            name: teacher.name,
            email: teacher.email,
            password: '',
        });
    };

    const cancelFacultyEdit = () => {
        setFacultyEditingId(null);
        setFacultyForm({
            name: '',
            email: '',
            password: '',
        });
    };

    const removeFaculty = (facultyId: number) => {
        if (!window.confirm('Remove this faculty account? This also removes related assignments and enrollments.')) {
            return;
        }

        router.delete(`/dean/faculty-management/faculty/${facultyId}`, {
            preserveScroll: true,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Faculty Management" />

            <div className="space-y-5 p-4">
                <div className="rounded-xl border p-4">
                    <h1 className="text-xl font-semibold">Faculty Management</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Manage faculty teaching assignments by course, section, semester, and school year.
                    </p>
                </div>

                <section className="rounded-xl border p-4">
                    <h2 className="font-semibold">{facultyEditingId === null ? 'Add Faculty Account' : 'Edit Faculty Account'}</h2>

                    <fieldset disabled={isFacultySubmitting} className="mt-4 grid gap-3 md:grid-cols-2">
                        <label className="space-y-1 text-sm">
                            <span>Name</span>
                            <input
                                type="text"
                                className="w-full rounded-md border bg-background px-3 py-2"
                                value={facultyForm.name}
                                onChange={(e) => setFacultyForm((prev) => ({ ...prev, name: e.target.value }))}
                                placeholder="Faculty name"
                            />
                            {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
                        </label>

                        <label className="space-y-1 text-sm">
                            <span>Email</span>
                            <input
                                type="email"
                                className="w-full rounded-md border bg-background px-3 py-2"
                                value={facultyForm.email}
                                onChange={(e) => setFacultyForm((prev) => ({ ...prev, email: e.target.value }))}
                                placeholder="faculty@example.com"
                            />
                            {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
                        </label>

                        <label className="space-y-1 text-sm md:col-span-2">
                            <span>Password (optional)</span>
                            <input
                                type="password"
                                className="w-full rounded-md border bg-background px-3 py-2"
                                value={facultyForm.password}
                                onChange={(e) => setFacultyForm((prev) => ({ ...prev, password: e.target.value }))}
                                placeholder={facultyEditingId === null ? 'Defaults to password' : 'Leave blank to keep current password'}
                            />
                            {errors.password && <p className="text-xs text-red-600">{errors.password}</p>}
                        </label>
                    </fieldset>

                    <div className="mt-4">
                        <LoadingButton type="button" onClick={submitFaculty} loading={isFacultySubmitting} loadingText="Saving...">
                            {facultyEditingId === null ? 'Add Faculty' : 'Save Faculty'}
                        </LoadingButton>
                        {facultyEditingId !== null && (
                            <button
                                type="button"
                                className="ml-2 rounded-md border px-4 py-2 text-sm"
                                onClick={cancelFacultyEdit}
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                </section>

                <section className="rounded-xl border p-4">
                    <h2 className="font-semibold">{assignmentEditingId === null ? 'Assign Faculty' : 'Edit Faculty Assignment'}</h2>

                    <fieldset disabled={isSubmitting} className="mt-4 grid gap-3 md:grid-cols-2">
                        <label className="space-y-1 text-sm">
                            <span>Faculty</span>
                            <select
                                className="w-full rounded-md border bg-background px-3 py-2"
                                value={form.faculty_id}
                                onChange={(e) => setForm((prev) => ({ ...prev, faculty_id: e.target.value }))}
                            >
                                <option value="">Select faculty</option>
                                {facultyOptions.map((teacher) => (
                                    <option key={teacher.id} value={teacher.id}>
                                        {teacher.name} ({teacher.email})
                                    </option>
                                ))}
                            </select>
                            {errors.faculty_id && <p className="text-xs text-red-600">{errors.faculty_id}</p>}
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
                            <span>Section</span>
                            <input
                                type="text"
                                className="w-full rounded-md border bg-background px-3 py-2"
                                placeholder="e.g. BSCS-2A"
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

                        <label className="space-y-1 text-sm md:col-span-2">
                            <span>School Year</span>
                            <input
                                type="text"
                                className="w-full rounded-md border bg-background px-3 py-2"
                                placeholder="e.g. 2025-2026"
                                value={form.school_year}
                                onChange={(e) => setForm((prev) => ({ ...prev, school_year: e.target.value }))}
                            />
                            {errors.school_year && <p className="text-xs text-red-600">{errors.school_year}</p>}
                        </label>
                    </fieldset>

                    <div className="mt-4">
                        <LoadingButton type="button" onClick={submit} loading={isSubmitting} loadingText="Saving...">
                            {assignmentEditingId === null ? 'Save Assignment' : 'Update Assignment'}
                        </LoadingButton>
                        {assignmentEditingId !== null && (
                            <button
                                type="button"
                                className="ml-2 rounded-md border px-4 py-2 text-sm"
                                onClick={cancelAssignmentEdit}
                            >
                                Cancel
                            </button>
                        )}
                        {status && <p className="mt-2 text-sm font-medium text-emerald-600">{status}</p>}
                    </div>
                </section>

                <section className="space-y-4">
                    {faculty.map((teacher) => (
                        <div key={teacher.id} className="overflow-hidden rounded-xl border">
                            <div className="border-b bg-muted/30 px-4 py-3">
                                <h2 className="font-semibold">{teacher.name}</h2>
                                <p className="text-sm text-muted-foreground">
                                    {teacher.email} | {teacher.assignmentCount} assignment(s)
                                </p>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-border text-sm">
                                    <thead className="bg-muted/20 text-left">
                                        <tr>
                                            <th className="px-4 py-3 font-medium">Subject</th>
                                            <th className="px-4 py-3 font-medium">Program</th>
                                            <th className="px-4 py-3 font-medium">Section</th>
                                            <th className="px-4 py-3 font-medium">Semester</th>
                                            <th className="px-4 py-3 font-medium">School Year</th>
                                            <th className="px-4 py-3 font-medium">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {teacher.assignments.map((assignment) => (
                                            <tr key={assignment.classSectionId}>
                                                <td className="px-4 py-3">
                                                    {[assignment.subjectCode, assignment.subjectTitle].filter(Boolean).join(' - ') || '-'}
                                                </td>
                                                <td className="px-4 py-3">{assignment.program ?? '-'}</td>
                                                <td className="px-4 py-3">{assignment.section ?? '-'}</td>
                                                <td className="px-4 py-3">{assignment.term ?? '-'}</td>
                                                <td className="px-4 py-3">{assignment.schoolYear ?? '-'}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex gap-2">
                                                        <button
                                                            type="button"
                                                            className="rounded-md border px-3 py-1 text-xs"
                                                            onClick={() => startAssignmentEdit(teacher.id, assignment)}
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="rounded-md border border-red-200 px-3 py-1 text-xs text-red-700"
                                                            onClick={() => removeAssignment(assignment.classSectionId)}
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {teacher.assignments.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                                                    No assignments yet.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="border-t px-4 py-3">
                                <button
                                    type="button"
                                    className="rounded-md border border-red-200 px-3 py-1 text-xs text-red-700"
                                    onClick={() => removeFaculty(teacher.id)}
                                >
                                    Remove Faculty Account
                                </button>
                                <button
                                    type="button"
                                    className="ml-2 rounded-md border px-3 py-1 text-xs"
                                    onClick={() => startFacultyEdit(teacher)}
                                >
                                    Edit Faculty Account
                                </button>
                            </div>
                        </div>
                    ))}

                    {faculty.length === 0 && (
                        <div className="rounded-xl border p-6 text-sm text-muted-foreground">
                            No faculty accounts found.
                        </div>
                    )}
                </section>
            </div>
        </AppLayout>
    );
}
