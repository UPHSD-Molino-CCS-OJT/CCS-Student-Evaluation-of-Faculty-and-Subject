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
    const [studentIdDigits, setStudentIdDigits] = useState<string[]>(Array.from({ length: 9 }, () => ''));
    const inputRefs = useRef<Array<HTMLInputElement | null>>(Array.from({ length: 9 }, () => null));

    const enteredDigits = studentIdDigits.join('').slice(0, 9);
    const usesOneDigitPrefix = enteredDigits.length <= 8;
    const firstPart = usesOneDigitPrefix ? enteredDigits.slice(0, 1) : enteredDigits.slice(0, 2);
    const secondPart = usesOneDigitPrefix ? enteredDigits.slice(1, 5) : enteredDigits.slice(2, 6);
    const thirdPart = usesOneDigitPrefix ? enteredDigits.slice(5, 8) : enteredDigits.slice(6, 9);
    const studentIdValue = `${firstPart}-${secondPart}-${thirdPart}`;

    const handleDigitChange = (index: number, value: string) => {
        const nextDigit = value.replace(/\D/g, '').slice(-1);

        setStudentIdDigits((previous) => {
            const next = [...previous];
            next[index] = nextDigit;
            return next;
        });

        if (nextDigit && index < 8) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleBackspace = (index: number) => {
        if (studentIdDigits[index] || index === 0) {
            return;
        }

        inputRefs.current[index - 1]?.focus();
    };

    const handlePaste = (text: string) => {
        const digits = text.replace(/\D/g, '').slice(0, 9);

        if (digits.length === 0) {
            return;
        }

        const nextDigits =
            digits.length === 8
                ? [digits[0] ?? '', '', digits[1] ?? '', digits[2] ?? '', digits[3] ?? '', digits[4] ?? '', digits[5] ?? '', digits[6] ?? '', digits[7] ?? '']
                : Array.from({ length: 9 }, (_, index) => digits[index] ?? '');
        setStudentIdDigits(nextDigits);

        const nextFocusIndex = digits.length === 8 ? 8 : Math.min(digits.length, 8);
        inputRefs.current[nextFocusIndex]?.focus();
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
                                <Label htmlFor="student_id_0">Student ID</Label>
                                <div className="flex w-full max-w-full items-center justify-center gap-1 whitespace-nowrap">
                                    {studentIdDigits.map((digit, index) => (
                                        <div key={index} className="flex items-center gap-1">
                                            <Input
                                                id={`student_id_${index}`}
                                                ref={(element) => {
                                                    inputRefs.current[index] = element;
                                                }}
                                                type="text"
                                                inputMode="numeric"
                                                pattern="[0-9]*"
                                                autoFocus={index === 0}
                                                autoComplete={index === 0 ? 'username' : 'off'}
                                                tabIndex={index + 1}
                                                maxLength={1}
                                                className="h-9 w-8 text-center text-sm sm:h-10 sm:w-10 sm:text-base"
                                                value={digit}
                                                onChange={(event) => handleDigitChange(index, event.target.value)}
                                                onKeyDown={(event) => {
                                                    if (index === 1 && event.key === '-') {
                                                        event.preventDefault();
                                                        inputRefs.current[2]?.focus();
                                                        return;
                                                    }

                                                    if (event.key === 'Backspace') {
                                                        handleBackspace(index);
                                                    }
                                                }}
                                                onPaste={(event) => {
                                                    event.preventDefault();
                                                    handlePaste(event.clipboardData.getData('text'));
                                                }}
                                            />
                                            {(index === 1 || index === 5) && <span className="text-muted-foreground">-</span>}
                                        </div>
                                    ))}
                                </div>
                                <input type="hidden" name="student_id" value={studentIdValue} />
                                <p className="text-xs text-muted-foreground">
                                    Enter 8 or 9 digits. Format: 1-2345-678 or 12-3456-789
                                </p>
                                <InputError message={errors.student_id} />
                            </div>

                            <Button
                                type="submit"
                                className="mt-4 w-full"
                                tabIndex={10}
                                disabled={processing}
                                data-test="student-login-button"
                            >
                                {processing && <Spinner />}
                                Continue as Student
                            </Button>
                        </div>

                        <div className="text-center text-sm text-muted-foreground">
                            Faculty, dean, staff, or system admin? <TextLink href="/login">Go to staff login</TextLink>
                        </div>
                    </>
                )}
            </Form>
        </AuthLayout>
    );
}
