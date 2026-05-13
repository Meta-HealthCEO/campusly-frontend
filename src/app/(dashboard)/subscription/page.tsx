'use client';

import { PricingCards } from '@/components/subscription/PricingCards';
import { usePlans } from '@/hooks/usePlans';
import { useSubscription } from '@/hooks/useSubscription';
import { useCheckout } from '@/hooks/useCheckout';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { PageHeader } from '@/components/shared/PageHeader';

export default function SubscriptionPage() {
  const { plans, loading: plansLoading } = usePlans();
  const { subscription, loading: subLoading } = useSubscription();
  const { launch, loading: launchLoading } = useCheckout();

  if (plansLoading || subLoading) return <LoadingSpinner />;

  return (
    <div className="container mx-auto py-8 px-4">
      <PageHeader
        title="Choose your plan"
        description="Start a 14-day Pro trial with no commitment. Cancel anytime."
      />
      <div className="mt-8">
        <PricingCards
          plans={plans}
          currentPlanCode={subscription?.planCode ?? null}
          onSelect={launch}
          loading={launchLoading}
        />
      </div>
      <p className="mt-8 text-xs text-muted-foreground text-center">
        A small verification charge is placed on your card to confirm it; this is automatically refunded.
      </p>
    </div>
  );
}
