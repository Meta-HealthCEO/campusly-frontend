'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { useSubscription } from '@/hooks/useSubscription';
import { useInvoices } from '@/hooks/useInvoices';
import { useCheckout } from '@/hooks/useCheckout';
import { CancelDialog } from '@/components/subscription/CancelDialog';
import { InvoicesTable } from '@/components/subscription/InvoicesTable';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function BillingPage() {
  const router = useRouter();
  const {
    subscription,
    plan,
    loading,
    refetch,
    isPro,
    isTrialing,
    isCanceled,
    isPastDue,
  } = useSubscription();
  const { invoices, loading: invLoading } = useInvoices();
  const { launch, loading: launchLoading } = useCheckout();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [resumeLoading, setResumeLoading] = useState(false);

  if (loading || !subscription || !plan) return <LoadingSpinner />;

  const card = subscription.cardLastFour
    ? `${subscription.cardBrand?.toUpperCase() ?? 'CARD'} •••• ${subscription.cardLastFour} (exp ${String(
        subscription.cardExpiryMonth,
      ).padStart(2, '0')}/${String(subscription.cardExpiryYear).slice(-2)})`
    : 'No card on file';

  const resume = async () => {
    setResumeLoading(true);
    try {
      await apiClient.post('/subscriptions/resume', {});
      toast.success('Subscription resumed');
      await refetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to resume');
    } finally {
      setResumeLoading(false);
    }
  };

  const isActive = subscription.status === 'active';
  const isFreeNoCard = subscription.status === 'free' && !subscription.cardLastFour;

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <PageHeader title="Billing" description="Manage your plan, card and invoices." />

      <Card className="p-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="min-w-0">
            <div className="text-sm text-muted-foreground">Current plan</div>
            <div className="text-xl font-semibold truncate">{plan.name}</div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge variant={isPro ? 'default' : 'outline'}>{subscription.status}</Badge>
              {isTrialing && subscription.trialEndsAt && (
                <span className="text-sm text-muted-foreground">
                  Trial ends {new Date(subscription.trialEndsAt).toLocaleDateString()}
                </span>
              )}
              {isCanceled && subscription.currentPeriodEnd && (
                <span className="text-sm text-muted-foreground">
                  Ends {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col sm:items-end gap-2 shrink-0">
            <div className="text-sm text-muted-foreground">Payment method</div>
            <div className="text-sm">{card}</div>
            {subscription.cardLastFour && (
              <Button variant="outline" size="sm" onClick={() => router.push('/subscription')}>
                Update card
              </Button>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {!isPro && !isFreeNoCard && (
            <Button onClick={() => router.push('/subscription')}>Choose a plan</Button>
          )}
          {(isTrialing || isActive || isPastDue) && !isCanceled && (
            <Button variant="destructive" onClick={() => setCancelOpen(true)}>
              Cancel subscription
            </Button>
          )}
          {isCanceled && (
            <Button onClick={resume} disabled={resumeLoading}>
              {resumeLoading ? 'Resuming…' : 'Resume subscription'}
            </Button>
          )}
          {isFreeNoCard && (
            <Button onClick={() => launch('pro_monthly')} disabled={launchLoading}>
              Start Pro trial
            </Button>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold">Invoices</h2>
        <div className="mt-4">
          {invLoading ? <LoadingSpinner /> : <InvoicesTable invoices={invoices} />}
        </div>
      </Card>

      <CancelDialog open={cancelOpen} onOpenChange={setCancelOpen} />
    </div>
  );
}
