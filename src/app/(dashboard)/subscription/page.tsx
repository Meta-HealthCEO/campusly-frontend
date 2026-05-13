'use client';

import { ShieldCheck, RefreshCcw, Lock } from 'lucide-react';
import { PricingCards } from '@/components/subscription/PricingCards';
import { usePlans } from '@/hooks/usePlans';
import { useSubscription } from '@/hooks/useSubscription';
import { useCheckout } from '@/hooks/useCheckout';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

const TRUST_POINTS = [
  { icon: ShieldCheck, text: 'PCI-compliant card handling — your card never touches our servers' },
  { icon: RefreshCcw, text: '14-day free trial, then cancel anytime' },
  { icon: Lock, text: 'A R1 verification charge is refunded automatically' },
];

export default function SubscriptionPage() {
  const { plans, loading: plansLoading } = usePlans();
  const { subscription, loading: subLoading } = useSubscription();
  const { launch, loading: launchLoading } = useCheckout();

  if (plansLoading || subLoading) return <LoadingSpinner />;

  return (
    <div className="mx-auto max-w-5xl py-10 px-4 sm:py-14">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Choose your plan</h1>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Start with everything Pro for 14 days. No charge during the trial, cancel anytime from
          your billing settings.
        </p>
      </div>

      <div className="mt-10 sm:mt-12">
        <PricingCards
          plans={plans}
          currentPlanCode={subscription?.planCode ?? null}
          onSelect={launch}
          loading={launchLoading}
        />
      </div>

      <div className="mx-auto mt-12 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
        {TRUST_POINTS.map(({ icon: Icon, text }) => (
          <div
            key={text}
            className="flex items-start gap-3 rounded-xl border border-border bg-card/50 p-4 text-sm text-muted-foreground"
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
