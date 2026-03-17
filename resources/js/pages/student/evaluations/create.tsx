import { Head, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';
import InputError from '@/components/input-error';
import { LoadingButton } from '@/components/ui/loading-button';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type LegendItem = {
    rating: number;
    label: string;
};

type Question = {
    number: number;
    category: string;
    text: string;
};

type Props = {
    classSection: {
        id: number;
        subject: string;
        faculty: string;
        section: string;
        term?: string | null;
        schoolYear?: string | null;
    };
    legend: LegendItem[];
    questions: Question[];
};

export default function StudentEvaluationCreate({ classSection, legend, questions }: Props) {
    const groupedQuestions = questions.reduce<Record<string, Question[]>>((carry, question) => {
        if (!carry[question.category]) {
            carry[question.category] = [];
        }

        carry[question.category].push(question);
        return carry;
    }, {});

    const { data, setData, post, processing, errors } = useForm<{
        responses: Record<number, number | null>;
        comments: string;
    }>({
        responses: Object.fromEntries(questions.map((question) => [question.number, null])) as Record<
            number,
            number | null
        >,
        comments: '',
    });

    const unansweredCount = Object.values(data.responses).filter((value) => value === null).length;

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'My Evaluations',
            href: '/student/evaluations',
        },
        {
            title: 'Evaluate Subject',
            href: `/student/evaluations/${classSection.id}`,
        },
    ];

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        post(`/student/evaluations/${classSection.id}`);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Evaluate Subject" />

            <div className="mx-auto max-w-5xl space-y-5 p-4">
                <div className="rounded-xl border p-4">
                    <h1 className="text-xl font-semibold">Evaluation Form</h1>
                    <p className="mt-1 text-sm text-muted-foreground">{classSection.subject}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Faculty: {classSection.faculty} | Section: {classSection.section}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {[classSection.term, classSection.schoolYear].filter(Boolean).join(' - ') || '-'}
                    </p>
                </div>

                <div className="rounded-xl border p-4">
                    <h2 className="text-sm font-semibold">Rating Legend</h2>
                    <div className="mt-3 grid gap-2 text-sm sm:grid-cols-5">
                        {legend.map((item) => (
                            <div key={item.rating} className="rounded-md bg-muted/40 p-2 text-center">
                                <div className="font-semibold">{item.rating}</div>
                                <div className="text-muted-foreground">{item.label}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <form onSubmit={submit} className="space-y-5">
                    {Object.entries(groupedQuestions).map(([category, categoryQuestions]) => (
                        <section key={category} className="rounded-xl border p-4">
                            <h2 className="text-base font-semibold">{category}</h2>
                            <div className="mt-4 space-y-5">
                                {categoryQuestions.map((question) => (
                                    <div key={question.number} className="space-y-2">
                                        <p className="text-sm">
                                            <span className="font-medium">{question.number}.</span> {question.text}
                                        </p>
                                        <div className="flex flex-wrap gap-4">
                                            {[5, 4, 3, 2, 1].map((rating) => (
                                                <Label
                                                    key={rating}
                                                    className="flex cursor-pointer items-center gap-2 text-sm font-normal"
                                                >
                                                    <input
                                                        type="radio"
                                                        name={`responses.${question.number}`}
                                                        checked={data.responses[question.number] === rating}
                                                        onChange={() => {
                                                            setData('responses', {
                                                                ...data.responses,
                                                                [question.number]: rating,
                                                            });
                                                        }}
                                                        className="h-4 w-4"
                                                    />
                                                    {rating}
                                                </Label>
                                            ))}
                                        </div>
                                        <InputError message={errors[`responses.${question.number}` as keyof typeof errors]} />
                                    </div>
                                ))}
                            </div>
                        </section>
                    ))}

                    <section className="rounded-xl border p-4">
                        <Label htmlFor="comments">Optional comments</Label>
                        <textarea
                            id="comments"
                            value={data.comments}
                            onChange={(event) => setData('comments', event.target.value)}
                            rows={4}
                            className="mt-2 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                            placeholder="Share additional feedback..."
                        />
                        <InputError message={errors.comments} />
                    </section>

                    <div className="flex items-center justify-between rounded-xl border p-4">
                        <p className="text-sm text-muted-foreground">
                            {unansweredCount > 0 ? `${unansweredCount} question(s) unanswered` : 'All questions answered'}
                        </p>
                        <LoadingButton
                            type="submit"
                            disabled={unansweredCount > 0}
                            loading={processing}
                            loadingText="Submitting..."
                        >
                            Submit Evaluation
                        </LoadingButton>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
