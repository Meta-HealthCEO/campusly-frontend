'use client';

import { useCallback, useState } from 'react';
import apiClient from '@/lib/api-client';
import { extractErrorMessage } from '@/lib/api-helpers';
import type { CreateReferralPayload, CreateThreadPayload } from '@/types';

/** What a teacher does from a learner's profile: message a parent, refer to the counsellor. */
export function useLearnerActions() {
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  /** True when the message went; otherwise the reason is in sendError and the dialog keeps what was typed. */
  const messageParent = useCallback(async (payload: CreateThreadPayload): Promise<boolean> => {
    setSending(true);
    setSendError(null);
    try {
      await apiClient.post('/messaging/threads', payload);
      return true;
    } catch (err: unknown) {
      setSendError(extractErrorMessage(err, "The message didn't send. Try again."));
      return false;
    } finally {
      setSending(false);
    }
  }, []);

  const refer = useCallback(async (data: CreateReferralPayload): Promise<void> => {
    await apiClient.post('/pastoral/referrals', data);
  }, []);

  return { messageParent, sending, sendError, clearSendError: () => setSendError(null), refer };
}
