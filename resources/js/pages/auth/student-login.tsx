import { Form, Head } from '@inertiajs/react';
import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import AuthLayout from '@/layouts/auth-layout';

export default function StudentLogin() {
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
                                <Label htmlFor="student_id">Student ID</Label>
                                <Input
                                    id="student_id"
                                    type="text"
                                    name="student_id"
                                    required
                                    autoFocus
                                    tabIndex={1}
                                    autoComplete="username"
                                    placeholder="1-2345-678"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Format: 1-2345-678 or 00-0000-000
                                </p>
                                <InputError message={errors.student_id} />
                            </div>

                            <Button
                                type="submit"
                                className="mt-4 w-full"
                                tabIndex={2}
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
