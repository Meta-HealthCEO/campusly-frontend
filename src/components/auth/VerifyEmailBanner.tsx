'use client';

import { Loader2, MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/useAuthStore';
import { useEmailVerification } from '@/hooks/useEmailVerification';
import { needsEmailVerification } from '@/lib/email-verification';

/** Shown to a standalone teacher until they open the emailed verification link. */
export function VerifyEmailBanner() {
  const user = useAuthStore((s) => s.user);
  const { resend, resending, resent, error } = useEmailVerification();
  if (!needsEmailVerification(user)) return null;

  return (
    <div
      role="status"
      className="flex flex-col gap-2 px-4 py-2 text-sm sm:flex-row sm:items-center sm:justify-between md:px-6 lg:px-8"
    >
      <div className="flex min-w-0 items-center gap-2">
        <MailCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <span className="min-w-0 break-words">
          Check your inbox to verify <strong className="font-semibold">{user?.email}</strong>. You&apos;ll need it to use AI.
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {error && <span className="text-destructive">{error}</span>}
        <Button
          variant="outline"
          className="min-h-11"
          onClick={() => void resend()}
          disabled={resending || resent}
        >
          {resending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {resent ? 'Sent — check your inbox' : 'Resend link'}
        </Button>
      </div>
    </div>
  );
}
