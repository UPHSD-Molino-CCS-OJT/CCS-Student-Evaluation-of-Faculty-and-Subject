import { Form, Head } from '@inertiajs/react';
import { useRef, useState } from 'react';
import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import AuthLayout from '@/layouts/auth-layout';

export default function StudentLogin() {
    const [studentIdParts, setStudentIdParts] = useState({
        first: '',
        second: '',
        third: '',
    });

    const firstInputRef = useRef<HTMLInputElement>(null);
    const secondInputRef = useRef<HTMLInputElement>(null);
    const thirdInputRef = useRef<HTMLInputElement>(null);

    const studentIdValue = `${studentIdParts.first}-${studentIdParts.second}-${studentIdParts.third}`;

    const handlePartChange = (part: 'first' | 'second' | 'third', value: string) => {
        const maxLengths = {
            first: 2,
            second: 4,
            third: 3,
        };

        const nextValue = value.replace(/\D/g, '').slice(0, maxLengths[part]);

        setStudentIdParts((previous) => ({
            ...previous,
            [part]: nextValue,
        }));

        if (part === 'first' && nextValue.length === maxLengths.first) {
            secondInputRef.current?.focus();
        }

        if (part === 'second' && nextValue.length === maxLengths.second) {
            thirdInputRef.current?.focus();
        }
    };

    const handleBackspace = (part: 'second' | 'third', value: string) => {
        if (value.length > 0) {
            return;
        }

        if (part === 'second') {
            firstInputRef.current?.focus();
        }

        if (part === 'third') {
            secondInputRef.current?.focus();
        }
    };

    const handlePaste = (text: string) => {
        const digits = text.replace(/\D/g, '');

        if (digits.length === 0) {
            return;
        }

        setStudentIdParts({
            first: digits.slice(0, 2),
            second: digits.slice(2, 6),
            third: digits.slice(6, 9),
        });
    };

    return (
        <AuthLayout
            title="Student Login"
            description="Enter your student ID to access your evaluation dashboard"
        >
            <Head title="Student login" />

            <Form action="/student/login" method="post" className="flex flex-col gap-6">
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-6">
                            <div className="grid gap-2">
                                <Label htmlFor="student_id_first">Student ID</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="student_id_first"
                                        ref={firstInputRef}
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        required
                                        autoFocus
                                        tabIndex={1}
                                        autoComplete="username"
                                        placeholder="00"
                                        maxLength={2}
                                        className="w-16 text-center"
                                        value={studentIdParts.first}
                                        onChange={(event) => handlePartChange('first', event.target.value)}
                                        onPaste={(event) => {
                                            event.preventDefault();
                                            handlePaste(event.clipboardData.getData('text'));
                                        }}
                                    />
                                    <span className="text-muted-foreground">-</span>
                                    <Input
                                        id="student_id_second"
                                        ref={secondInputRef}
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        required
                                        tabIndex={2}
                                        placeholder="0000"
                                        maxLength={4}
                                        className="w-20 text-center"
                                        value={studentIdParts.second}
                                        onChange={(event) => handlePartChange('second', event.target.value)}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Backspace') {
                                                handleBackspace('second', studentIdParts.second);
                                            }
                                        }}
                                    />
                                    <span className="text-muted-foreground">-</span>
                                    <Input
                                        id="student_id_third"
                                        ref={thirdInputRef}
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        required
                                        tabIndex={3}
                                        placeholder="000"
                                        maxLength={3}
                                        className="w-16 text-center"
                                        value={studentIdParts.third}
                                        onChange={(event) => handlePartChange('third', event.target.value)}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Backspace') {
                                                handleBackspace('third', studentIdParts.third);
                                            }
                                        }}
                                    />
                                </div>
                                <input type="hidden" name="student_id" value={studentIdValue} />
                                <p className="text-xs text-muted-foreground">
                                    Format: 1-2345-678 or 00-0000-000
                                </p>
                                <InputError message={errors.student_id} />
                            </div>

                            <Button
                                type="submit"
                                className="mt-4 w-full"
                                tabIndex={4}
                                disabled={processing}
                                data-test="student-login-button"
                            >
                                {processing && <Spinner />}
                                Continue as Student
                            </Button>
                        </div>

                        <div className="text-center text-sm text-muted-foreground">
                            Faculty or Dean? <TextLink href="/login">Go to staff login</TextLink>
                        </div>
                    </>
                )}
            </Form>
        </AuthLayout>
    );
}
