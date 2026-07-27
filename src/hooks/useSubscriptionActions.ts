'use client';

import { useCallback, useState } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';

export interface CheckoutSessionStatus {
  status: string;
}

interface UseSubscriptionActionsResult {
  busy: boolean;
  /** Cancel at period end. Throws on failure. */
  cancelSubscription: () => Promise<void>;
  /** Undo a pending cancellation. Throws on failure. */
  resumeSubscription: () => Promise<void>;
  /** Poll a checkout session's payment status. Throws on failure. */
  fetchCheckoutSessionStatus: (sessionId: string) => Promise<CheckoutSessionStatus>;
}

export function useSubscriptionActions(): UseSubscriptionActionsResult {
  const [busy, setBusy] = useState(false);

  const cancelSubscription = useCallback(async (): Promise<void> => {
    setBusy(true);
    try {
      await apiClient.post('/subscriptions/cancel', {});
    } finally {
      setBusy(false);
    }
  }, []);

  const resumeSubscription = useCallback(async (): Promise<void> => {
    setBusy(true);
    try {
      await apiClient.post('/subscriptions/resume', {});
    } finally {
      setBusy(false);
    }
  }, []);

  const fetchCheckoutSessionStatus = useCallback(
    async (sessionId: string): Promise<CheckoutSessionStatus> => {
      const res = await apiClient.get(`/subscriptions/checkout-session/${sessionId}`);
      return unwrapResponse<CheckoutSessionStatus>(res);
    },
    [],
  );

  return { busy, cancelSubscription, resumeSubscription, fetchCheckoutSessionStatus };
}
