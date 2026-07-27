'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useSubscriptionActions } from '@/hooks/useSubscriptionActions';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Button } from '@/components/ui/button';

type ViewStatus = 'loading' | 'ready' | 'failed';

const MAX_POLL_ATTEMPTS = 15;
const POLL_INTERVAL_MS = 1000;

export default function SubscriptionSuccessPage() {
  const params = useSearchParams();
  const router = useRouter();
  const { refetch } = useSubscription();
  const { fetchCheckoutSessionStatus } = useSubscriptionActions();
  const [status, setStatus] = useState<ViewStatus>('loading');

  useEffect(() => {
    const sessionId = params.get('session');
    if (!sessionId) {
      setStatus('failed');
      return;
    }
    let cancelled = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      attempts++;
      try {
        const data = await fetchCheckoutSessionStatus(sessionId);
        if (cancelled) return;

        if (data.status === 'completed') {
          await refetch();
          if (!cancelled) setStatus('ready');
        } else if (data.status === 'failed' || attempts >= MAX_POLL_ATTEMPTS) {
          setStatus('failed');
        } else {
          timer = setTimeout(poll, POLL_INTERVAL_MS);
        }
      } catch {
        if (cancelled) return;
        if (attempts >= MAX_POLL_ATTEMPTS) setStatus('failed');
        else timer = setTimeout(poll, POLL_INTERVAL_MS);
      }
    };
    void poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [params, refetch]);

  if (status === 'loading') {
    return (
      <div className="py-16 text-center">
        <LoadingSpinner />
        <p className="mt-4 text-muted-foreground">Confirming your subscription…</p>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="container mx-auto py-16 text-center">
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        <p className="mt-2 text-muted-foreground">
          We couldn&apos;t confirm your subscription. Please try again.
        </p>
        <Button onClick={() => router.push('/subscription')} size="lg" className="mt-6">
          Back to plans
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-16 text-center max-w-md">
      <CheckCircle2 className="w-12 h-12 mx-auto text-primary" />
      <h1 className="mt-4 text-2xl font-bold">You&apos;re on Pro</h1>
      <p className="mt-2 text-muted-foreground">
        Your 14-day trial has started. No charge until trial ends.
      </p>
      <Button onClick={() => router.push('/teacher')} size="lg" className="mt-6">
        Go to dashboard
      </Button>
    </div>
  );
}
