import { Head, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { LoadingButton } from '@/components/ui/loading-button';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type ProgramGroup = {
    program: string;
    courseCount: number;
    curriculums: Array<{
        curriculum: string;
        subjects: Array<{
            id: number;
            code: string;
            title: string;
            semesterOffered?: string | null;
        }>;
    }>;
};

type Props = {
    programs: ProgramGroup[];
    canManage: boolean;
    terms: string[];
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Courses per Program',
        href: '/dean/program-courses',
    },
];

export default function ProgramCoursesIndex({ programs, canManage, terms }: Props) {
    const page = usePage();
    const status = (page.props as { flash?: { status?: string } }).flash?.status;
    const errors = (page.props as { errors?: Record<string, string> }).errors ?? {};

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [form, setForm] = useState({
        code: '',
        title: '',
        program: '',
        curriculum_version: '',
        semester_offered: terms[0] ?? '1st Semester',
    });

    const submit = () => {
        const payload = editingId === null ? form : { ...form, id: editingId };
        const method = editingId === null ? 'post' : 'patch';

        router[method]('/dean/program-courses', payload, {
            preserveScroll: true,
            onStart: () => setIsSubmitting(true),
            onFinish: () => setIsSubmitting(false),
            onSuccess: () => {
                setEditingId(null);
                setForm({
                    code: '',
                    title: '',
                    program: '',
                    curriculum_version: '',
                    semester_offered: terms[0] ?? '1st Semester',
                });
            },
        });
    };

    const removeSubject = (subjectId: number) => {
        if (!window.confirm('Remove this course?')) {
            return;
        }

        router.delete(`/dean/program-courses/${subjectId}`, {
            preserveScroll: true,
        });
    };

    const beginEdit = (subject: ProgramGroup['curriculums'][number]['subjects'][number], program: string, curriculum: string) => {
        setEditingId(subject.id);
        setForm({
            code: subject.code,
            title: subject.title,
            program,
            curriculum_version: curriculum,
            semester_offered: subject.semesterOffered ?? (terms[0] ?? '1st Semester'),
        });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setForm({
            code: '',
            title: '',
            program: '',
            curriculum_version: '',
            semester_offered: terms[0] ?? '1st Semester',
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Courses per Program" />

            <div className="space-y-4 p-3 sm:space-y-5 sm:p-4">
                <div className="rounded-xl border p-3 sm:p-4">
                    <h1 className="text-lg font-semibold sm:text-xl">Courses per Program</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        View all imported courses grouped by program, including semester and curriculum year.
                    </p>
                </div>

                {canManage && (
                    <section className="rounded-xl border p-3 sm:p-4">
                        <h2 className="font-semibold">{editingId === null ? 'Add Course' : 'Edit Course'}</h2>

                        <fieldset disabled={isSubmitting} className="mt-4 grid gap-3 md:grid-cols-2">
                            <label className="space-y-1 text-sm">
                                <span>Subject Code</span>
                                <input
                                    type="text"
                                    className="w-full rounded-md border bg-background px-3 py-2"
                                    value={form.code}
                                    onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
                                    placeholder="e.g. CCS101"
                                />
                                {errors.code && <p className="text-xs text-red-600">{errors.code}</p>}
                            </label>

                            <label className="space-y-1 text-sm">
                                <span>Course Name</span>
                                <input
                                    type="text"
                                    className="w-full rounded-md border bg-background px-3 py-2"
                                    value={form.title}
                                    onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                                    placeholder="e.g. Introduction to Computing"
                                />
                                {errors.title && <p className="text-xs text-red-600">{errors.title}</p>}
                            </label>

                            <label className="space-y-1 text-sm">
                                <span>Program</span>
                                <input
                                    type="text"
                                    className="w-full rounded-md border bg-background px-3 py-2"
                                    value={form.program}
                                    onChange={(e) => setForm((prev) => ({ ...prev, program: e.target.value }))}
                                    placeholder="e.g. BSCS"
                                />
                                {errors.program && <p className="text-xs text-red-600">{errors.program}</p>}
                            </label>

                            <label className="space-y-1 text-sm">
                                <span>Curriculum Version</span>
                                <input
                                    type="text"
                                    className="w-full rounded-md border bg-background px-3 py-2"
                                    value={form.curriculum_version}
                                    onChange={(e) => setForm((prev) => ({ ...prev, curriculum_version: e.target.value }))}
                                    placeholder="e.g. 2024"
                                />
                                {errors.curriculum_version && <p className="text-xs text-red-600">{errors.curriculum_version}</p>}
                            </label>

                            <label className="space-y-1 text-sm md:col-span-2">
                                <span>Semester Offered</span>
                                <select
                                    className="w-full rounded-md border bg-background px-3 py-2"
                                    value={form.semester_offered}
                                    onChange={(e) => setForm((prev) => ({ ...prev, semester_offered: e.target.value }))}
                                >
                                    {terms.map((term) => (
                                        <option key={term} value={term}>
                                            {term}
                                        </option>
                                    ))}
                                </select>
                                {errors.semester_offered && <p className="text-xs text-red-600">{errors.semester_offered}</p>}
                            </label>
                        </fieldset>

                        <div className="mt-4 flex gap-2">
                            <LoadingButton type="button" onClick={submit} loading={isSubmitting} loadingText="Saving...">
                                {editingId === null ? 'Add Course' : 'Save Changes'}
                            </LoadingButton>
                            {editingId !== null && (
                                <button type="button" className="rounded-md border px-4 py-2 text-sm" onClick={cancelEdit}>
                                    Cancel
                                </button>
                            )}
                        </div>

                        {status && <p className="mt-2 text-sm font-medium text-emerald-600">{status}</p>}
                    </section>
                )}

                {programs.length === 0 && (
                    <div className="rounded-xl border p-6 text-sm text-muted-foreground">
                        No subjects found yet. Import subjects from Dean Summary to populate this view.
                    </div>
                )}

                {programs.map((group) => (
                    <section key={group.program} className="overflow-hidden rounded-xl border">
                        <div className="border-b bg-muted/30 px-4 py-3">
                            <h2 className="font-semibold">{group.program}</h2>
                            <p className="text-sm text-muted-foreground">
                                {group.courseCount} course(s) across {group.curriculums.length} curriculum year(s)
                            </p>
                        </div>

                        <div className="space-y-4 p-4">
                            {group.curriculums.map((curriculumGroup) => (
                                <div key={`${group.program}-${curriculumGroup.curriculum}`} className="rounded-lg border">
                                    <div className="border-b bg-muted/20 px-4 py-3">
                                        <h3 className="font-medium">Curriculum: {curriculumGroup.curriculum}</h3>
                                        <p className="text-sm text-muted-foreground">
                                            {curriculumGroup.subjects.length} course(s)
                                        </p>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-border text-sm">
                                            <thead className="bg-muted/30 text-left">
                                                <tr>
                                                                <th className="px-3 py-3 font-medium sm:px-4">Code</th>
                                                                <th className="px-3 py-3 font-medium sm:px-4">Course Name</th>
                                                                <th className="px-3 py-3 font-medium sm:px-4">Semester Offered</th>
                                                                {canManage && <th className="px-3 py-3 font-medium sm:px-4">Actions</th>}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                {curriculumGroup.subjects.map((subject) => (
                                                    <tr key={subject.id}>
                                                                    <td className="px-3 py-3 font-medium sm:px-4">{subject.code}</td>
                                                                    <td className="px-3 py-3 sm:px-4">{subject.title}</td>
                                                                    <td className="px-3 py-3 sm:px-4">{subject.semesterOffered ?? '-'}</td>
                                                        {canManage && (
                                                                        <td className="px-3 py-3 sm:px-4">
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        type="button"
                                                                        className="rounded-md border px-3 py-1 text-xs"
                                                                        onClick={() =>
                                                                            beginEdit(subject, group.program, curriculumGroup.curriculum)
                                                                        }
                                                                    >
                                                                        Edit
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        className="rounded-md border border-red-200 px-3 py-1 text-xs text-red-700"
                                                                        onClick={() => removeSubject(subject.id)}
                                                                    >
                                                                        Remove
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        )}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                ))}
            </div>
        </AppLayout>
    );
}
