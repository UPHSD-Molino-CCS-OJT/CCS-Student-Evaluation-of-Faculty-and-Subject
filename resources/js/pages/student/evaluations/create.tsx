import { Head, useForm } from '@inertiajs/react';
import { FormEvent, useRef, useState } from 'react';
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
    const questionSections = questions.reduce<Array<{ category: string; items: Question[] }>>((sections, question) => {
        const existingSection = sections.find((section) => section.category === question.category);

        if (existingSection) {
            existingSection.items.push(question);

            return sections;
        }

        sections.push({
            category: question.category,
            items: [question],
        });

        return sections;
    }, []);

    const [openSections, setOpenSections] = useState<Record<string, boolean>>(() =>
        Object.fromEntries(questionSections.map((section, sectionIndex) => [section.category, sectionIndex === 0])),
    );

    const questionRefs = useRef<Record<number, HTMLDivElement | null>>({});
    const commentsRef = useRef<HTMLTextAreaElement | null>(null);

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

    const setQuestionRating = (question: Question, rating: number) => {
        const updatedResponses = {
            ...data.responses,
            [question.number]: rating,
        };

        setData('responses', updatedResponses);

        const currentIndex = questions.findIndex((item) => item.number === question.number);
        const nextUnansweredQuestion =
            questions.slice(currentIndex + 1).find((item) => updatedResponses[item.number] === null)
            ?? questions.find((item) => updatedResponses[item.number] === null);

        if (nextUnansweredQuestion) {
            setOpenSections((previous) =>
                previous[nextUnansweredQuestion.category]
                    ? previous
                    : { ...previous, [nextUnansweredQuestion.category]: true },
            );

            requestAnimationFrame(() => {
                questionRefs.current[nextUnansweredQuestion.number]?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                });
            });

            return;
        }

        requestAnimationFrame(() => {
            commentsRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
            });
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Evaluate Subject" />

            <div className="mx-auto max-w-5xl space-y-4 p-3 sm:space-y-5 sm:p-4">
                <div className="rounded-xl border p-3 sm:p-4">
                    <h1 className="text-lg font-semibold sm:text-xl">Evaluation Form</h1>
                    <p className="mt-1 text-sm text-muted-foreground">{classSection.subject}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Faculty: {classSection.faculty} | Section: {classSection.section}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {[classSection.term, classSection.schoolYear].filter(Boolean).join(' - ') || '-'}
                    </p>
                </div>

                <div className="rounded-xl border p-3 sm:p-4">
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

                <form onSubmit={submit} className="space-y-4 sm:space-y-5">
                    {questionSections.map((questionSection) => (
                        <section key={questionSection.category} className="rounded-xl border p-3 sm:p-4">
                            <button
                                type="button"
                                onClick={() =>
                                    setOpenSections((previous) => ({
                                        ...previous,
                                        [questionSection.category]: !previous[questionSection.category],
                                    }))
                                }
                                className="flex w-full items-center justify-between text-left"
                            >
                                <h2 className="text-base font-semibold">{questionSection.category}</h2>
                                <span className="text-sm text-muted-foreground">
                                    {openSections[questionSection.category] ? 'Hide' : 'Show'} ({questionSection.items.length})
                                </span>
                            </button>

                            {openSections[questionSection.category] && (
                                <div className="mt-4 space-y-5">
                                    {questionSection.items.map((question) => (
                                        <div
                                            key={question.number}
                                            className="space-y-2"
                                            ref={(element) => {
                                                questionRefs.current[question.number] = element;
                                            }}
                                        >
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
                                                            onChange={() => setQuestionRating(question, rating)}
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
                            )}
                        </section>
                    ))}

                    <section className="rounded-xl border p-3 sm:p-4">
                        <Label htmlFor="comments">Optional comments</Label>
                        <textarea
                            id="comments"
                            ref={commentsRef}
                            value={data.comments}
                            onChange={(event) => setData('comments', event.target.value)}
                            rows={4}
                            className="mt-2 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                            placeholder="Share additional feedback..."
                        />
                        <InputError message={errors.comments} />
                    </section>

                    <div className="flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
                        <p className="text-sm text-muted-foreground sm:text-left">
                            {unansweredCount > 0 ? `${unansweredCount} question(s) unanswered` : 'All questions answered'}
                        </p>
                        <LoadingButton
                            type="submit"
                            disabled={unansweredCount > 0}
                            loading={processing}
                            loadingText="Submitting..."
                            className="w-full sm:w-auto"
                        >
                            Submit Evaluation
                        </LoadingButton>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
