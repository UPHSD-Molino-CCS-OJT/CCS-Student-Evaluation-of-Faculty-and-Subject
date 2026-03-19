import * as React from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import type { VariantProps } from 'class-variance-authority';

type LoadingButtonProps = React.ComponentProps<'button'> &
    VariantProps<typeof buttonVariants> & {
        loading?: boolean;
        loadingText?: string;
    };

export function LoadingButton({
    loading = false,
    loadingText = 'Processing...',
    children,
    disabled,
    ...props
}: LoadingButtonProps) {
    return (
        <Button {...props} disabled={disabled || loading} aria-busy={loading || undefined}>
            {loading ? (
                <>
                    <Spinner className="size-4" />
                    {loadingText}
                </>
            ) : (
                children
            )}
        </Button>
    );
}
