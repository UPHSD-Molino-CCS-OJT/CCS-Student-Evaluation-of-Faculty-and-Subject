import { Form, Head } from '@inertiajs/react';
import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import AuthLayout from '@/layouts/auth-layout';

export default function StudentRegister() {
    return (
        <AuthLayout
            title="Student Registration"
            description="Create your student account using your school ID"
        >
            <Head title="Student registration" />

            <Form
                action="/student/register"
                method="post"
                className="flex flex-col gap-6"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-6">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Full name</Label>
                                <Input
                                    id="name"
                                    type="text"
                                    required
                                    autoFocus
                                    name="name"
                                    autoComplete="name"
                                    placeholder="Juan Dela Cruz"
                                />
                                <InputError message={errors.name} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="email">Email address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    required
                                    name="email"
                                    autoComplete="email"
                                    placeholder="student@example.com"
                                />
                                <InputError message={errors.email} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="student_id">Student ID</Label>
                                <Input
                                    id="student_id"
                                    type="text"
                                    required
                                    name="student_id"
                                    autoComplete="username"
                                    placeholder="1-2345-678"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Accepted format: 1-2345-678 or 01-2345-678
                                </p>
                                <InputError message={errors.student_id} />
                            </div>

                            <Button
                                type="submit"
                                className="mt-2 w-full"
                                disabled={processing}
                            >
                                {processing && <Spinner />}
                                Create student account
                            </Button>
                        </div>

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
