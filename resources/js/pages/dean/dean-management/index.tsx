import { Head, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { LoadingButton } from '@/components/ui/loading-button';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type DeanItem = {
    id: number;
    name: string;
    email: string;
};

type Props = {
    deans: DeanItem[];
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dean Management',
        href: '/dean/dean-management',
    },
];

export default function DeanManagementIndex({ deans }: Props) {
    const page = usePage();
    const status = (page.props as { flash?: { status?: string } }).flash?.status;
    const errors = (page.props as { errors?: Record<string, string> }).errors ?? {};

    const [editingId, setEditingId] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [form, setForm] = useState({
        name: '',
        email: '',
        password: '',
    });

    const submit = () => {
        const url = editingId === null
            ? '/dean/dean-management'
            : `/dean/dean-management/${editingId}`;

        const method = editingId === null ? 'post' : 'patch';

        router[method](url, form, {
            preserveScroll: true,
            onStart: () => setIsSubmitting(true),
            onFinish: () => setIsSubmitting(false),
            onSuccess: () => {
                setEditingId(null);
                setForm({
                    name: '',
                    email: '',
                    password: '',
                });
            },
        });
    };

    const startEdit = (dean: DeanItem) => {
        setEditingId(dean.id);
        setForm({
            name: dean.name,
            email: dean.email,
            password: '',
        });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setForm({
            name: '',
            email: '',
            password: '',
        });
    };

    const removeDean = (deanId: number) => {
        if (!window.confirm('Remove this dean account?')) {
            return;
        }

        router.delete(`/dean/dean-management/${deanId}`, {
            preserveScroll: true,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dean Management" />

            <div className="space-y-5 p-4">
                <div className="rounded-xl border p-4">
                    <h1 className="text-xl font-semibold">Dean Management</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        System admins and staff can add, edit, and remove dean accounts.
                    </p>
                </div>

                <section className="rounded-xl border p-4">
                    <h2 className="font-semibold">{editingId === null ? 'Add Dean Account' : 'Edit Dean Account'}</h2>

                    <fieldset disabled={isSubmitting} className="mt-4 grid gap-3 md:grid-cols-2">
                        <label className="space-y-1 text-sm">
                            <span>Name</span>
                            <input
                                type="text"
                                className="w-full rounded-md border bg-background px-3 py-2"
                                value={form.name}
                                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                                placeholder="Dean name"
                            />
                            {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
                        </label>

                        <label className="space-y-1 text-sm">
                            <span>Email</span>
                            <input
                                type="email"
                                className="w-full rounded-md border bg-background px-3 py-2"
                                value={form.email}
                                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                                placeholder="dean@example.com"
                            />
                            {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
                        </label>

                        <label className="space-y-1 text-sm md:col-span-2">
                            <span>Password (optional)</span>
                            <input
                                type="password"
                                className="w-full rounded-md border bg-background px-3 py-2"
                                value={form.password}
                                onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                                placeholder={editingId === null ? 'Defaults to password' : 'Leave blank to keep current password'}
                            />
                            {errors.password && <p className="text-xs text-red-600">{errors.password}</p>}
                        </label>
                    </fieldset>

                    <div className="mt-4 flex gap-2">
                        <LoadingButton type="button" onClick={submit} loading={isSubmitting} loadingText="Saving...">
                            {editingId === null ? 'Add Dean' : 'Save Changes'}
                        </LoadingButton>
                        {editingId !== null && (
                            <button type="button" className="rounded-md border px-4 py-2 text-sm" onClick={cancelEdit}>
                                Cancel
                            </button>
                        )}
                    </div>
                    {status && <p className="mt-2 text-sm font-medium text-emerald-600">{status}</p>}
                </section>

                <section className="overflow-hidden rounded-xl border">
                    <div className="border-b bg-muted/30 px-4 py-3">
                        <h2 className="font-semibold">Current Dean Accounts</h2>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-border text-sm">
                            <thead className="bg-muted/30 text-left">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Name</th>
                                    <th className="px-4 py-3 font-medium">Email</th>
                                    <th className="px-4 py-3 font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {deans.map((dean) => (
                                    <tr key={dean.id}>
                                        <td className="px-4 py-3">{dean.name}</td>
                                        <td className="px-4 py-3">{dean.email}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    className="rounded-md border px-3 py-1 text-xs"
                                                    onClick={() => startEdit(dean)}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    className="rounded-md border border-red-200 px-3 py-1 text-xs text-red-700"
                                                    onClick={() => removeDean(dean.id)}
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {deans.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">
                                            No dean accounts found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </AppLayout>
    );
}
