import { useMemo } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';

const ENTITLED_STATUSES = new Set(['trialing', 'active', 'past_due']);

export function useEntitlement(feature: string): boolean {
  const subscription = useAuthStore((s) => s.subscription);
  const plan = useAuthStore((s) => s.plan);

  return useMemo(() => {
    if (!subscription || !plan) return false;

    const status = subscription.status;
    let entitled = ENTITLED_STATUSES.has(status);
    if (
      status === 'canceled' &&
      subscription.currentPeriodEnd &&
      new Date(subscription.currentPeriodEnd).getTime() > Date.now()
    ) {
      entitled = true;
    }
    if (status === 'free') entitled = true; // free-plan features still apply

    if (!entitled) return false;
    return plan.entitlements[feature] === true;
  }, [subscription, plan, feature]);
}
