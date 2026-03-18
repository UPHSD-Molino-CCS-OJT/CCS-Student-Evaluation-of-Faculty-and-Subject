import { Transition } from '@headlessui/react';
import { Form, Head, Link, router, usePage } from '@inertiajs/react';
import { FormEvent, useState } from 'react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import DeleteUser from '@/components/delete-user';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { edit } from '@/routes/profile';
import { send } from '@/routes/verification';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Profile settings',
        href: edit(),
    },
];

export default function Profile({
    mustVerifyEmail,
    status,
    canManageEsign,
    esignImageUrl,
}: {
    mustVerifyEmail: boolean;
    status?: string;
    canManageEsign?: boolean;
    esignImageUrl?: string | null;
}) {
    const { auth, errors } = usePage().props as {
        auth: {
            user: {
                name: string;
                email: string;
                email_verified_at: string | null;
            };
        };
        errors: Record<string, string | undefined>;
    };
    const [esignFile, setEsignFile] = useState<File | null>(null);
    const [isUploadingEsign, setIsUploadingEsign] = useState(false);

    const submitEsign = (event: FormEvent) => {
        event.preventDefault();

        if (!esignFile) {
            return;
        }

        router.patch(
            '/settings/esign',
            { esign_image: esignFile },
            {
                forceFormData: true,
                preserveScroll: true,
                onStart: () => setIsUploadingEsign(true),
                onFinish: () => setIsUploadingEsign(false),
            },
        );
    };

    const removeEsign = () => {
        router.patch(
            '/settings/esign',
            { remove_esign: true },
            {
                preserveScroll: true,
            },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Profile settings" />

            <h1 className="sr-only">Profile settings</h1>

            <SettingsLayout>
                <div className="space-y-6">
                    <Heading
                        variant="small"
                        title="Profile information"
                        description="Update your name and email address"
                    />

                    <Form
                        {...ProfileController.update.form()}
                        options={{
                            preserveScroll: true,
                        }}
                        className="space-y-6"
                    >
                        {({ processing, recentlySuccessful, errors }) => (
                            <>
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Name</Label>

                                    <Input
                                        id="name"
                                        className="mt-1 block w-full"
                                        defaultValue={auth.user.name}
                                        name="name"
                                        required
                                        autoComplete="name"
                                        placeholder="Full name"
                                    />

                                    <InputError
                                        className="mt-2"
                                        message={errors.name}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="email">Email address</Label>

                                    <Input
                                        id="email"
                                        type="email"
                                        className="mt-1 block w-full"
                                        defaultValue={auth.user.email}
                                        name="email"
                                        required
                                        autoComplete="username"
                                        placeholder="Email address"
                                    />

                                    <InputError
                                        className="mt-2"
                                        message={errors.email}
                                    />
                                </div>

                                {mustVerifyEmail &&
                                    auth.user.email_verified_at === null && (
                                        <div>
                                            <p className="-mt-4 text-sm text-muted-foreground">
                                                Your email address is
                                                unverified.{' '}
                                                <Link
                                                    href={send()}
                                                    as="button"
                                                    className="text-foreground underline decoration-neutral-300 underline-offset-4 transition-colors duration-300 ease-out hover:decoration-current! dark:decoration-neutral-500"
                                                >
                                                    Click here to resend the
                                                    verification email.
                                                </Link>
                                            </p>

                                            {status ===
                                                'verification-link-sent' && (
                                                <div className="mt-2 text-sm font-medium text-green-600">
                                                    A new verification link has
                                                    been sent to your email
                                                    address.
                                                </div>
                                            )}
                                        </div>
                                    )}

                                <div className="flex items-center gap-4">
                                    <Button
                                        disabled={processing}
                                        data-test="update-profile-button"
                                    >
                                        Save
                                    </Button>

                                    <Transition
                                        show={recentlySuccessful}
                                        enter="transition ease-in-out"
                                        enterFrom="opacity-0"
                                        leave="transition ease-in-out"
                                        leaveTo="opacity-0"
                                    >
                                        <p className="text-sm text-neutral-600">
                                            Saved
                                        </p>
                                    </Transition>
                                </div>
                            </>
                        )}
                    </Form>

                    {canManageEsign && (
                        <div className="space-y-4 rounded-lg border p-4">
                            <Heading
                                variant="small"
                                title="E-signature"
                                description="Upload your signature image. This is used for one-click document signing."
                            />

                            {esignImageUrl ? (
                                <div className="space-y-2">
                                    <img
                                        src={esignImageUrl}
                                        alt="Current e-sign"
                                        className="max-h-24 rounded border bg-white p-2"
                                    />
                                    <Button type="button" variant="outline" onClick={removeEsign}>
                                        Remove E-sign
                                    </Button>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    No e-sign uploaded yet.
                                </p>
                            )}

                            <form onSubmit={submitEsign} className="space-y-3">
                                <div className="grid gap-2">
                                    <Label htmlFor="esign_image">Upload E-sign (PNG/JPG)</Label>
                                    <Input
                                        id="esign_image"
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp"
                                        onChange={(event) => setEsignFile(event.target.files?.[0] ?? null)}
                                    />
                                    <InputError className="mt-1" message={errors.esign_image} />
                                </div>

                                <Button type="submit" disabled={!esignFile || isUploadingEsign}>
                                    {isUploadingEsign ? 'Uploading...' : 'Save E-sign'}
                                </Button>
                            </form>
                        </div>
                    )}
                </div>

                <DeleteUser />
            </SettingsLayout>
        </AppLayout>
    );
}
