import { useMemo, useState } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';

const ENTITLED_STATUSES = new Set(['trialing', 'active', 'past_due']);

export function useEntitlement(feature: string): boolean {
  const user = useAuthStore((s) => s.user);
  const subscription = useAuthStore((s) => s.subscription);
  const plan = useAuthStore((s) => s.plan);
  // Per-mount snapshot — the cancellation grace check doesn't need live time.
  const [nowMs] = useState(() => Date.now());

  return useMemo(() => {
    // Pro-feature gating currently applies only to standalone teachers.
    // School-tier users (admins, HODs, bursars) bypass this gate.
    if (user && user.isStandaloneTeacher !== true) return true;

    if (!subscription || !plan) return false;

    const status = subscription.status;
    let entitled = ENTITLED_STATUSES.has(status);
    if (
      status === 'canceled' &&
      subscription.currentPeriodEnd &&
      new Date(subscription.currentPeriodEnd).getTime() > nowMs
    ) {
      entitled = true;
    }
    if (status === 'free') entitled = true; // free-plan features still apply

    if (!entitled) return false;
    return plan.entitlements[feature] === true;
  }, [user, subscription, plan, feature, nowMs]);
}
