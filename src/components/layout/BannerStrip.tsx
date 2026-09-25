'use client';

import { TrialBanner } from '@/components/subscription/TrialBanner';
import { DunningBanner } from '@/components/subscription/DunningBanner';
import { VerifyEmailBanner } from '@/components/auth/VerifyEmailBanner';

/** Spec §3: trial, billing and email banners in one quiet accent strip under the top bar; gone when all are empty. */
export function BannerStrip() {
  return (
    <div className="border-b border-border bg-accent text-accent-foreground empty:hidden [&>*+*]:border-t [&>*+*]:border-border">
      <TrialBanner />
      <DunningBanner />
      <VerifyEmailBanner />
    </div>
  );
}
