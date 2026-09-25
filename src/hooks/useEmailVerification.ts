'use client';

import { useCallback, useState } from 'react';
import apiClient from '@/lib/api-client';
import { extractErrorMessage } from '@/lib/api-helpers';
import { useAuthStore } from '@/stores/useAuthStore';

export type VerifyResult = 'ok' | 'expired';

/** Verify the emailed link, and resend it. A verified link refreshes the signed-in user. */
export function useEmailVerification() {
  const refreshAccount = useAuthStore((s) => s.refreshAccount);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verify = useCallback(async (token: string): Promise<VerifyResult> => {
    try {
      await apiClient.post('/auth/verify-email', { token });
    } catch (err: unknown) {
      // A used or expired link is a 400 the page explains; anything else is worth logging.
      const status = (err as { response?: { status?: number } }).response?.status;
      if (status !== 400) console.error('Email verification failed', err);
      return 'expired';
    }
    if (isAuthenticated) await refreshAccount();
    return 'ok';
  }, [isAuthenticated, refreshAccount]);

  const resend = useCallback(async (): Promise<void> => {
    setResending(true);
    setError(null);
    try {
      await apiClient.post('/auth/resend-verification');
      setResent(true);
    } catch (err: unknown) {
      setError(extractErrorMessage(err, "We couldn't send a new link. Try again in a minute."));
    } finally {
      setResending(false);
    }
  }, []);

  return { verify, resend, resending, resent, error };
}
