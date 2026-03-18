import { Head } from '@inertiajs/react';
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
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Courses per Program',
        href: '/dean/program-courses',
    },
];

export default function ProgramCoursesIndex({ programs }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Courses per Program" />

            <div className="space-y-5 p-4">
                <div className="rounded-xl border p-4">
                    <h1 className="text-xl font-semibold">Courses per Program</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        View all imported courses grouped by program, including semester and curriculum year.
                    </p>
                </div>

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
                                                    <th className="px-4 py-3 font-medium">Code</th>
                                                    <th className="px-4 py-3 font-medium">Course Name</th>
                                                    <th className="px-4 py-3 font-medium">Semester Offered</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                {curriculumGroup.subjects.map((subject) => (
                                                    <tr key={subject.id}>
                                                        <td className="px-4 py-3 font-medium">{subject.code}</td>
                                                        <td className="px-4 py-3">{subject.title}</td>
                                                        <td className="px-4 py-3">{subject.semesterOffered ?? '-'}</td>
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
