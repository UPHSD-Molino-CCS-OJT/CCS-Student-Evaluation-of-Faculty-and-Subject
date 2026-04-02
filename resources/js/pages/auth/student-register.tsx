import { Form, Head } from '@inertiajs/react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import AuthLayout from '@/layouts/auth-layout';

type SubjectOption = {
    id: number;
    code: string;
    title: string;
    program: string | null;
    semesterOffered: string | null;
    curriculumVersion: string | null;
};

type Props = {
    courses: string[];
    subjects: SubjectOption[];
    yearLevels: number[];
};

export default function StudentRegister({ courses, subjects, yearLevels }: Props) {
    const [studentId, setStudentId] = useState('');
    const [courseProgram, setCourseProgram] = useState('');
    const [yearLevel, setYearLevel] = useState('');
    const [studentType, setStudentType] = useState<'regular' | 'irregular'>('regular');
    const [selectedSubjectIds, setSelectedSubjectIds] = useState<number[]>([]);

    const formatStudentId = (raw: string): string => {
        const digits = raw.replace(/\D/g, '').slice(0, 9);

        if (digits.length === 0) {
            return '';
        }

        const usesOneDigitPrefix = digits.length <= 8;
        const first = usesOneDigitPrefix ? digits.slice(0, 1) : digits.slice(0, 2);
        const second = usesOneDigitPrefix ? digits.slice(1, 5) : digits.slice(2, 6);
        const third = usesOneDigitPrefix ? digits.slice(5, 8) : digits.slice(6, 9);

        return [first, second, third].filter(Boolean).join('-');
    };

    const availableSubjects = subjects.filter((subject) => subject.program === courseProgram);

    const toggleSubjectSelection = (subjectId: number, checked: boolean) => {
        setSelectedSubjectIds((previous) => {
            if (checked) {
                return previous.includes(subjectId) ? previous : [...previous, subjectId];
            }

            return previous.filter((id) => id !== subjectId);
        });
    };

    return (
        <AuthLayout
            title="Student Registration"
            description="Create your student account and pick your course enrollment type"
        >
            <Head title="Student registration" />

            <Form
                action="/student/register"
                method="post"
                className="flex flex-col gap-4 sm:gap-6"
            >
                {({ processing, errors }) => (
                    <>
                        {(() => {
                            const subjectError = errors.subject_ids
                                ?? Object.entries(errors).find(([key]) => key.startsWith('subject_ids.'))?.[1];

                            return (
                        <div className="grid gap-4 sm:gap-5">
                            <div className="grid gap-2">
                                <Label htmlFor="name" className="text-sm">Full name</Label>
                                <Input
                                    id="name"
                                    type="text"
                                    required
                                    autoFocus
                                    name="name"
                                    autoComplete="name"
                                    placeholder="Juan Dela Cruz"
                                    className="h-11 text-base"
                                />
                                <InputError message={errors.name} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="email" className="text-sm">Email address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    required
                                    name="email"
                                    autoComplete="email"
                                    placeholder="student@example.com"
                                    className="h-11 text-base"
                                />
                                <InputError message={errors.email} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="student_id" className="text-sm">Student ID</Label>
                                <Input
                                    id="student_id"
                                    type="text"
                                    required
                                    name="student_id"
                                    autoComplete="username"
                                    placeholder="1-2345-678"
                                    inputMode="numeric"
                                    maxLength={11}
                                    value={studentId}
                                    onChange={(event) => setStudentId(formatStudentId(event.target.value))}
                                    className="h-11 font-mono text-base tracking-wide"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Accepted format: 1-2345-678 or 01-2345-678
                                </p>
                                <InputError message={errors.student_id} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="course_program" className="text-sm">Course</Label>
                                <select
                                    id="course_program"
                                    name="course_program"
                                    required
                                    value={courseProgram}
                                    onChange={(event) => {
                                        const nextCourse = event.target.value;

                                        setCourseProgram(nextCourse);
                                        setSelectedSubjectIds((previous) => previous.filter((subjectId) => {
                                            const subject = subjects.find((item) => item.id === subjectId);

                                            return subject?.program === nextCourse;
                                        }));
                                    }}
                                    className="h-11 w-full rounded-md border bg-background px-3 text-base"
                                >
                                    <option value="">Select your course</option>
                                    {courses.map((course) => (
                                        <option key={course} value={course}>
                                            {course}
                                        </option>
                                    ))}
                                </select>
                                {courses.length === 0 && (
                                    <p className="text-xs text-muted-foreground">
                                        No course offerings are available yet. Please contact your dean or staff.
                                    </p>
                                )}
                                <InputError message={errors.course_program} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="year_level" className="text-sm">Year level</Label>
                                <select
                                    id="year_level"
                                    name="year_level"
                                    required
                                    value={yearLevel}
                                    onChange={(event) => setYearLevel(event.target.value)}
                                    className="h-11 w-full rounded-md border bg-background px-3 text-base"
                                >
                                    <option value="">Select your year level</option>
                                    {yearLevels.map((level) => (
                                        <option key={level} value={level}>
                                            Year {level}
                                        </option>
                                    ))}
                                </select>
                                <InputError message={errors.year_level} />
                            </div>

                            <div className="grid gap-2">
                                <Label className="text-sm">Student type</Label>
                                <div className="space-y-2 rounded-md border p-3">
                                    <label className="flex cursor-pointer items-start gap-2 text-sm">
                                        <input
                                            type="radio"
                                            name="student_type"
                                            value="regular"
                                            checked={studentType === 'regular'}
                                            onChange={() => {
                                                setStudentType('regular');
                                                setSelectedSubjectIds([]);
                                            }}
                                            className="mt-0.5"
                                        />
                                        <span>
                                            <span className="font-medium">Regular</span>
                                            <span className="block text-xs text-muted-foreground">
                                                Automatically enroll to all available subjects for your chosen course.
                                            </span>
                                        </span>
                                    </label>

                                    <label className="flex cursor-pointer items-start gap-2 text-sm">
                                        <input
                                            type="radio"
                                            name="student_type"
                                            value="irregular"
                                            checked={studentType === 'irregular'}
                                            onChange={() => setStudentType('irregular')}
                                            className="mt-0.5"
                                        />
                                        <span>
                                            <span className="font-medium">Irregular</span>
                                            <span className="block text-xs text-muted-foreground">
                                                Pick your course and manually choose your subjects.
                                            </span>
                                        </span>
                                    </label>
                                </div>
                                <InputError message={errors.student_type} />
                            </div>

                            {studentType === 'irregular' && (
                                <div className="grid gap-2">
                                    <Label className="text-sm">Subjects (for irregular students)</Label>
                                    <div className="max-h-56 space-y-2 overflow-y-auto rounded-md border p-3">
                                        {availableSubjects.map((subject) => (
                                            <label key={subject.id} className="flex items-start gap-2 text-sm">
                                                <input
                                                    type="checkbox"
                                                    name="subject_ids[]"
                                                    value={subject.id}
                                                    checked={selectedSubjectIds.includes(subject.id)}
                                                    onChange={(event) => toggleSubjectSelection(subject.id, event.target.checked)}
                                                    className="mt-0.5"
                                                />
                                                <span>
                                                    <span className="font-medium">{subject.code} - {subject.title}</span>
                                                    <span className="block text-xs text-muted-foreground">
                                                        {subject.semesterOffered ?? 'Semester not set'} • {subject.curriculumVersion ?? 'Curriculum not set'}
                                                    </span>
                                                </span>
                                            </label>
                                        ))}

                                        {courseProgram !== '' && availableSubjects.length === 0 && (
                                            <p className="text-xs text-muted-foreground">
                                                No subjects are currently available for this course.
                                            </p>
                                        )}

                                        {courseProgram === '' && (
                                            <p className="text-xs text-muted-foreground">
                                                Select a course first to view available subjects.
                                            </p>
                                        )}
                                    </div>
                                    <InputError message={subjectError} />
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="mt-1 h-11 w-full text-base"
                                disabled={processing || courses.length === 0}
                            >
                                {processing && <Spinner />}
                                Create student account
                            </Button>
                        </div>
                            );
                        })()}

                        <div className="text-center text-sm text-muted-foreground">
                            Already registered?{' '}
                            <TextLink href="/student/login">Go to student login</TextLink>
                        </div>
                    </>
                )}
            </Form>
        </AuthLayout>
    );
}
