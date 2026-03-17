import { useEffect, useState } from 'react';
import { Spinner } from '@/components/ui/spinner';

export function GlobalInertiaActivity() {
    const [active, setActive] = useState(false);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const handleStart = () => setActive(true);
        const handleFinish = () => setActive(false);

        document.addEventListener('inertia:start', handleStart);
        document.addEventListener('inertia:finish', handleFinish);
        document.addEventListener('inertia:error', handleFinish);
        document.addEventListener('inertia:invalid', handleFinish);

        return () => {
            document.removeEventListener('inertia:start', handleStart);
            document.removeEventListener('inertia:finish', handleFinish);
            document.removeEventListener('inertia:error', handleFinish);
            document.removeEventListener('inertia:invalid', handleFinish);
        };
    }, []);

    useEffect(() => {
        let timeoutId: number | undefined;

        if (active) {
            timeoutId = window.setTimeout(() => setVisible(true), 120);
        } else {
            setVisible(false);
        }

        return () => {
            if (timeoutId) {
                window.clearTimeout(timeoutId);
            }
        };
    }, [active]);

    if (!visible) {
        return null;
    }

    return (
        <div className="pointer-events-none fixed inset-x-0 top-0 z-50">
            <div className="h-0.5 w-full animate-pulse bg-primary" />
            <div className="absolute right-3 top-3 rounded-md border bg-background/95 px-2 py-1 text-xs shadow">
                <span className="inline-flex items-center gap-2 text-muted-foreground">
                    <Spinner className="size-3" />
                    Processing
                </span>
            </div>
        </div>
    );
}
