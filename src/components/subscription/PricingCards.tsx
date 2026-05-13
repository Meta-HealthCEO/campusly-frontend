'use client';

import { useMemo, useState } from 'react';
import { Check, Sparkles, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import type { Plan } from '@/types/subscription';

interface Props {
  plans: Plan[];
  currentPlanCode: string | null;
  onSelect: (planCode: 'pro_monthly' | 'pro_annual') => void;
  loading?: boolean;
}

const FREE_FEATURES = [
  '1 class',
  'Manual marking',
  'Basic gradebook',
];

const PRO_FEATURES = [
  'AI question generation',
  'Auto-marking with rubrics',
  'Unlimited classes & students',
  'Advanced analytics & reports',
  'Paper generation with memos',
  'Priority email support',
];

function formatRand(amountCents: number): string {
  return 'R' + (amountCents / 100).toLocaleString('en-ZA', { maximumFractionDigits: 0 });
}

export function PricingCards({ plans, currentPlanCode, onSelect, loading }: Props) {
  const [interval, setInterval] = useState<'monthly' | 'annual'>('annual');

  const free = plans.find((p) => p.code === 'free');
  const monthly = plans.find((p) => p.code === 'pro_monthly');
  const annual = plans.find((p) => p.code === 'pro_annual');
  const pro = interval === 'annual' ? annual : monthly;
  const proCode = interval === 'annual' ? 'pro_annual' : 'pro_monthly';

  const savingsPercent = useMemo(() => {
    if (!monthly || !annual) return null;
    const annualisedMonthly = monthly.amountExclTax * 12;
    if (annualisedMonthly === 0) return null;
    return Math.round(((annualisedMonthly - annual.amountExclTax) / annualisedMonthly) * 100);
  }, [monthly, annual]);

  const proPricePerMonth = useMemo(() => {
    if (!pro) return 0;
    return interval === 'annual' ? pro.amountExclTax / 12 : pro.amountExclTax;
  }, [pro, interval]);

  if (!free || !monthly || !annual || !pro) return null;

  const isCurrentFree = currentPlanCode === 'free';
  const isCurrentPro = currentPlanCode === proCode;

  return (
    <div className="space-y-6">
      {/* Billing-interval toggle */}
      <div className="flex items-center justify-center gap-3">
        <span
          className={`text-sm font-medium ${interval === 'monthly' ? 'text-foreground' : 'text-muted-foreground'}`}
        >
          Monthly
        </span>
        <Switch
          checked={interval === 'annual'}
          onCheckedChange={(v: boolean) => setInterval(v ? 'annual' : 'monthly')}
        />
        <span
          className={`text-sm font-medium ${interval === 'annual' ? 'text-foreground' : 'text-muted-foreground'}`}
        >
          Annual
        </span>
        {savingsPercent != null && savingsPercent > 0 && (
          <span className="ml-1 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
            Save {savingsPercent}%
          </span>
        )}
      </div>

      <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-2">
        {/* ─── Free ─── */}
        <div className="relative flex flex-col rounded-2xl border border-border bg-card p-6 sm:p-8">
          <div className="flex items-baseline gap-2">
            <h3 className="text-lg font-semibold">{free.name}</h3>
            {isCurrentFree && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                Current
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">Get started, no card required.</p>

          <div className="mt-6 flex items-baseline gap-1">
            <span className="text-5xl font-bold tracking-tight">R0</span>
            <span className="text-sm text-muted-foreground">/forever</span>
          </div>

          <ul className="mt-8 flex-1 space-y-3 text-sm">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-3">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <span>{f}</span>
              </li>
            ))}
          </ul>

          <Button variant="outline" disabled size="lg" className="mt-8 w-full">
            {isCurrentFree ? 'Your current plan' : 'Free tier'}
          </Button>
        </div>

        {/* ─── Pro ─── */}
        <div className="relative flex flex-col rounded-2xl border-2 border-primary bg-card p-6 shadow-lg shadow-primary/10 sm:p-8">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary-foreground">
              <Sparkles className="h-3 w-3" /> Most popular
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <h3 className="text-lg font-semibold">Pro</h3>
            {isCurrentPro && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                Current
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Full access to AI tools, papers, and analytics.
          </p>

          <div className="mt-6">
            <div className="flex items-baseline gap-1">
              <span className="text-5xl font-bold tracking-tight">{formatRand(proPricePerMonth)}</span>
              <span className="text-sm text-muted-foreground">/month</span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {interval === 'annual' ? (
                <>Billed annually as {formatRand(annual.amountExclTax)} · 14-day free trial</>
              ) : (
                <>Billed monthly · 14-day free trial</>
              )}
            </div>
          </div>

          <ul className="mt-8 flex-1 space-y-3 text-sm">
            {PRO_FEATURES.map((f, idx) => (
              <li key={f} className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Check className="h-3 w-3" />
                </span>
                <span>
                  {idx === 0 ? (
                    <span className="inline-flex items-center gap-1">
                      <Zap className="h-3.5 w-3.5 text-primary" /> {f}
                    </span>
                  ) : (
                    f
                  )}
                </span>
              </li>
            ))}
          </ul>

          <Button
            onClick={() => onSelect(proCode)}
            disabled={loading || isCurrentPro}
            size="lg"
            className="mt-8 w-full"
          >
            {isCurrentPro ? 'Your current plan' : 'Start 14-day free trial'}
          </Button>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            No charge during trial. Cancel anytime.
          </p>
        </div>
      </div>
    </div>
  );
}
