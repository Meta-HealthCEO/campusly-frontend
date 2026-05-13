'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  Receipt,
  Sparkles,
} from 'lucide-react';
import apiClient from '@/lib/api-client';
import { useSubscription } from '@/hooks/useSubscription';
import { useInvoices } from '@/hooks/useInvoices';
import { useCheckout } from '@/hooks/useCheckout';
import { CancelDialog } from '@/components/subscription/CancelDialog';
import { InvoicesTable } from '@/components/subscription/InvoicesTable';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Button } from '@/components/ui/button';

type ViewStatus = 'free' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid';

const STATUS_META: Record<ViewStatus, { label: string; tone: 'neutral' | 'positive' | 'warning' | 'danger' }> = {
  free: { label: 'Free', tone: 'neutral' },
  trialing: { label: 'On trial', tone: 'positive' },
  active: { label: 'Active', tone: 'positive' },
  past_due: { label: 'Payment issue', tone: 'danger' },
  canceled: { label: 'Cancelling', tone: 'warning' },
  unpaid: { label: 'Unpaid', tone: 'danger' },
};

function StatusPill({ status }: { status: ViewStatus }) {
  const meta = STATUS_META[status];
  const tone =
    meta.tone === 'positive'
      ? 'bg-primary/10 text-primary'
      : meta.tone === 'warning'
        ? 'bg-amber-100 text-amber-900'
        : meta.tone === 'danger'
          ? 'bg-destructive/10 text-destructive'
          : 'bg-muted text-foreground';
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>
      {meta.label}
    </span>
  );
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function brandLabel(brand: string | null | undefined): string {
  if (!brand) return 'Card';
  const upper = brand.toUpperCase();
  if (upper === 'VISA') return 'Visa';
  if (upper === 'MASTERCARD' || upper === 'MC') return 'Mastercard';
  if (upper === 'AMEX') return 'Amex';
  return brand;
}

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
    daysLeftInTrial,
  } = useSubscription();
  const { invoices, loading: invLoading } = useInvoices();
  const { launch, loading: launchLoading } = useCheckout();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [resumeLoading, setResumeLoading] = useState(false);

  const trialProgress = useMemo(() => {
    if (!isTrialing || !subscription?.trialEndsAt || daysLeftInTrial == null) return null;
    const total = 14;
    const remaining = Math.max(0, Math.min(total, daysLeftInTrial));
    return Math.round(((total - remaining) / total) * 100);
  }, [isTrialing, subscription?.trialEndsAt, daysLeftInTrial]);

  if (loading || !subscription || !plan) return <LoadingSpinner />;

  const status = subscription.status as ViewStatus;
  const isFreeNoCard = status === 'free' && !subscription.cardLastFour;
  const isActive = status === 'active';

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

  const nextEvent = (() => {
    if (isTrialing && subscription.trialEndsAt) {
      return {
        label: 'Trial ends',
        date: fmtDate(subscription.trialEndsAt),
        note: 'First charge will follow if you stay on Pro',
      };
    }
    if (isCanceled && subscription.currentPeriodEnd) {
      return {
        label: 'Pro ends',
        date: fmtDate(subscription.currentPeriodEnd),
        note: "You'll move to Free after this date",
      };
    }
    if (isActive && subscription.nextBillingAt) {
      return {
        label: 'Next charge',
        date: fmtDate(subscription.nextBillingAt),
        note: `Auto-renews at ${plan.amountExclTax === 0 ? 'Free' : 'R' + (plan.amountExclTax / 100).toFixed(0)}`,
      };
    }
    if (isPastDue && subscription.nextRetryAt) {
      return {
        label: 'Next retry',
        date: fmtDate(subscription.nextRetryAt),
        note: 'We will try the card again',
      };
    }
    return null;
  })();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-10">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Billing</h1>
        <Button variant="outline" size="sm" onClick={() => router.push('/subscription')}>
          See plans
        </Button>
      </div>

      {/* ─── Hero plan card ─── */}
      <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="bg-linear-to-br from-primary/5 to-transparent p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Current plan
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-bold tracking-tight">{plan.name}</h2>
                <StatusPill status={status} />
              </div>
              {plan.amountExclTax > 0 && (
                <p className="mt-1 text-sm text-muted-foreground">
                  R{(plan.amountExclTax / 100).toFixed(0)}/{plan.interval ?? 'month'}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {isFreeNoCard && (
                <Button onClick={() => launch('pro_monthly')} disabled={launchLoading} size="default">
                  <Sparkles className="mr-2 h-4 w-4" />
                  {launchLoading ? 'Opening checkout…' : 'Start Pro trial'}
                </Button>
              )}
              {!isPro && !isFreeNoCard && (
                <Button onClick={() => router.push('/subscription')}>Choose a plan</Button>
              )}
              {(isTrialing || isActive || isPastDue) && !isCanceled && (
                <Button variant="outline" onClick={() => setCancelOpen(true)}>
                  Cancel plan
                </Button>
              )}
              {isCanceled && (
                <Button onClick={resume} disabled={resumeLoading}>
                  {resumeLoading ? 'Resuming…' : 'Resume plan'}
                </Button>
              )}
            </div>
          </div>

          {/* Trial progress */}
          {isTrialing && trialProgress != null && (
            <div className="mt-6 max-w-md">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">Free trial</span>
                <span className="text-muted-foreground">
                  {daysLeftInTrial} {daysLeftInTrial === 1 ? 'day' : 'days'} left
                </span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-primary/15">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${trialProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Past-due / canceled notices */}
          {isPastDue && (
            <div className="mt-6 flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <div className="font-medium">
                  {subscription.lastFailureReason === 'card_expired'
                    ? 'Your card on file has expired'
                    : "Your last payment didn't go through"}
                </div>
                <div className="mt-0.5 text-xs">
                  Update your card to keep Pro features. We&apos;ll retry automatically.
                </div>
              </div>
            </div>
          )}

          {isCanceled && subscription.currentPeriodEnd && (
            <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <div className="font-medium">
                  Pro stays active until {fmtDate(subscription.currentPeriodEnd)}
                </div>
                <div className="mt-0.5 text-xs">
                  After that you&apos;ll move to the Free tier. Change your mind? You can resume any
                  time before then.
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ─── Payment method + Next event row ─── */}
      <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Payment method */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <CreditCard className="h-3.5 w-3.5" />
            Payment method
          </div>
          {subscription.cardLastFour ? (
            <div className="mt-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-12 items-center justify-center rounded-md border border-border bg-muted text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {brandLabel(subscription.cardBrand).slice(0, 4)}
                </div>
                <div className="min-w-0">
                  <div className="font-medium">
                    {brandLabel(subscription.cardBrand)} •••• {subscription.cardLastFour}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Expires {String(subscription.cardExpiryMonth).padStart(2, '0')}/
                    {String(subscription.cardExpiryYear).slice(-2)}
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => router.push('/subscription')}
              >
                Update card
              </Button>
            </div>
          ) : (
            <div className="mt-3 text-sm text-muted-foreground">
              No card on file yet. Add one when you start a Pro trial.
            </div>
          )}
        </div>

        {/* Next event */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <CalendarClock className="h-3.5 w-3.5" />
            {nextEvent?.label ?? 'Upcoming'}
          </div>
          {nextEvent ? (
            <div className="mt-3">
              <div className="text-xl font-semibold">{nextEvent.date}</div>
              <div className="mt-1 text-xs text-muted-foreground">{nextEvent.note}</div>
            </div>
          ) : (
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Nothing scheduled
            </div>
          )}
        </div>
      </section>

      {/* ─── Invoices ─── */}
      <section className="mt-6 rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-base font-semibold">Invoices</h2>
          </div>
        </div>
        <div className="px-6 py-4">
          {invLoading ? <LoadingSpinner /> : <InvoicesTable invoices={invoices} />}
        </div>
      </section>

      <CancelDialog open={cancelOpen} onOpenChange={setCancelOpen} />
    </div>
  );
}
