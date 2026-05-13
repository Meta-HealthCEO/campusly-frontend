import { useCallback, useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import { useAuthStore } from '@/stores/useAuthStore';
import type { Subscription, Plan } from '@/types/subscription';

interface MeResponse {
  subscription: Subscription | null;
  plan: Plan | null;
}

export function useSubscription() {
  const subscription = useAuthStore((s) => s.subscription);
  const plan = useAuthStore((s) => s.plan);
  const setSubscription = useAuthStore((s) => s.setSubscription);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/subscriptions/me');
      const data = unwrapResponse<MeResponse>(res);
      setSubscription(data.subscription, data.plan);
    } finally {
      setLoading(false);
    }
  }, [setSubscription]);

  useEffect(() => {
    if (!subscription) {
      void refetch();
    }
  }, [subscription, refetch]);

  const status = subscription?.status;
  const isTrialing = status === 'trialing';
  const isActive = status === 'active';
  const isPastDue = status === 'past_due';
  const isCanceled = status === 'canceled';
  const canceledButStillEntitled =
    isCanceled &&
    !!subscription?.currentPeriodEnd &&
    new Date(subscription.currentPeriodEnd).getTime() > Date.now();

  const isPro = isTrialing || isActive || isPastDue || canceledButStillEntitled;

  let daysLeftInTrial: number | null = null;
  if (isTrialing && subscription?.trialEndsAt) {
    const ms = new Date(subscription.trialEndsAt).getTime() - Date.now();
    daysLeftInTrial = Math.max(0, Math.ceil(ms / 86400000));
  }

  return {
    subscription,
    plan,
    loading,
    refetch,
    isPro,
    isTrialing,
    isActive,
    isPastDue,
    isCanceled,
    daysLeftInTrial,
  };
}
