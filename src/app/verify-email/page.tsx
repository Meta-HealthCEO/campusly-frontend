'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Loader2, MailWarning } from 'lucide-react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { AuthCard } from '@/components/auth/AuthCard';
import { Button, buttonVariants } from '@/components/ui/button';
import { useEmailVerification, type VerifyResult } from '@/hooks/useEmailVerification';
import { useAuthStore } from '@/stores/useAuthStore';
import { cn } from '@/lib/utils';

const ACTION = 'min-h-11 w-full';

function VerifyEmailContent() {
  const token = useSearchParams().get('token');
  const authLoading = useAuthStore((s) => s.isLoading);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { verify, resend, resending, resent, error } = useEmailVerification();
  const [result, setResult] = useState<VerifyResult | null>(null);
  const started = useRef(false);

  // Wait for the session to load, so a signed-in teacher's user refreshes after verifying.
  // A link works once, so verify only once (effects can run twice in development).
  useEffect(() => {
    if (authLoading || started.current || !token) return;
    started.current = true;
    void verify(token).then(setResult);
  }, [authLoading, token, verify]);

  const outcome: VerifyResult | null = token ? result : 'expired';
  if (outcome === null) return <VerifyEmailChecking />;

  if (outcome === 'ok') {
    return (
      <AuthLayout>
        <AuthCard title="Your email is verified" description="You can now use AI to build lessons, papers and homework.">
          <div className="flex flex-col items-center gap-4">
            <CheckCircle2 className="h-10 w-10 text-primary" aria-hidden="true" />
            <Link href={isAuthenticated ? '/teacher' : '/login'} className={cn(buttonVariants(), ACTION)}>
              {isAuthenticated ? 'Go to Today' : 'Sign in'}
            </Link>
          </div>
        </AuthCard>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <AuthCard title="This link has expired or was already used" description="Links work once and last 24 hours.">
        <div className="flex flex-col items-center gap-4">
          <MailWarning className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
          {isAuthenticated ? (
            <>
              <Button className={ACTION} onClick={() => void resend()} disabled={resending || resent}>
                {resending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {resent ? 'Sent — check your inbox' : 'Send a new link'}
              </Button>
              {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
              <Link href="/teacher" className="text-sm font-medium underline hover:no-underline">Go to Today</Link>
            </>
          ) : (
            <Link href="/login" className={cn(buttonVariants(), ACTION)}>Sign in to send a new link</Link>
          )}
        </div>
      </AuthCard>
    </AuthLayout>
  );
}

function VerifyEmailChecking() {
  return (
    <AuthLayout>
      <AuthCard title="Verifying your email" description="Checking your link…">
        <div className="flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
        </div>
      </AuthCard>
    </AuthLayout>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<VerifyEmailChecking />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
