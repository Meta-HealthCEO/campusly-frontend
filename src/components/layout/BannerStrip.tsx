'use client';

import { TrialBanner } from '@/components/subscription/TrialBanner';
import { DunningBanner } from '@/components/subscription/DunningBanner';
import { VerifyEmailBanner } from '@/components/auth/VerifyEmailBanner';
import { useAuthStore } from '@/stores/useAuthStore';
import { isBillingOwner } from '@/lib/billing-owner';

/**
 * Spec §3: trial, billing and email banners in one neutral card-white strip under the top bar (ruling O1 revised);
 * gone when all are empty. Trial and billing are only for whoever pays (learner portal spec §2).
 */
export function BannerStrip() {
  const owner = useAuthStore((s) => isBillingOwner(s.user));
  return (
    <div className="border-b border-border bg-card text-foreground empty:hidden [&>*+*]:border-t [&>*+*]:border-border">
      {owner ? (
        <>
          <TrialBanner />
          <DunningBanner />
        </>
      ) : null}
      <VerifyEmailBanner />
    </div>
  );
}
