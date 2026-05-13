'use client';

import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { Plan } from '@/types/subscription';

interface Props {
  plans: Plan[];
  currentPlanCode: string | null;
  onSelect: (planCode: 'pro_monthly' | 'pro_annual') => void;
  loading?: boolean;
}

const PRO_FEATURES = [
  'AI question generation',
  'Auto-marking with rubrics',
  'Unlimited classes',
  'Advanced analytics & reports',
  'Paper generation',
  'Email support',
];

const FREE_FEATURES = ['1 class', 'Manual marking', 'Basic analytics'];

function formatPrice(amountCents: number, interval: string | null): string {
  if (amountCents === 0) return 'Free';
  const r = (amountCents / 100).toFixed(0);
  return `R${r}/${interval === 'year' ? 'year' : 'month'}`;
}

export function PricingCards({ plans, currentPlanCode, onSelect, loading }: Props) {
  const free = plans.find((p) => p.code === 'free');
  const monthly = plans.find((p) => p.code === 'pro_monthly');
  const annual = plans.find((p) => p.code === 'pro_annual');

  return (
    <div className="grid gap-6 grid-cols-1 sm:grid-cols-3">
      {free && (
        <Card className="p-6 flex flex-col">
          <h3 className="text-lg font-semibold">{free.name}</h3>
          <div className="mt-2 text-3xl font-bold">Free</div>
          <p className="mt-1 text-sm text-muted-foreground">Get started, no card needed.</p>
          <ul className="mt-6 space-y-2 text-sm flex-1">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex gap-2 items-start">
                <Check className="w-4 h-4 mt-0.5 text-muted-foreground" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <Button variant="outline" disabled size="lg" className="mt-6 w-full">
            {currentPlanCode === 'free' ? 'Current plan' : 'Free tier'}
          </Button>
        </Card>
      )}

      {monthly && (
        <Card className="p-6 flex flex-col border-primary">
          <h3 className="text-lg font-semibold">{monthly.name}</h3>
          <div className="mt-2 text-3xl font-bold">{formatPrice(monthly.amountExclTax, monthly.interval)}</div>
          <p className="mt-1 text-sm text-muted-foreground">14-day free trial. Cancel anytime.</p>
          <ul className="mt-6 space-y-2 text-sm flex-1">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex gap-2 items-start">
                <Check className="w-4 h-4 mt-0.5 text-primary" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <Button
            onClick={() => onSelect('pro_monthly')}
            disabled={loading || currentPlanCode === 'pro_monthly'}
            size="lg"
            className="mt-6 w-full"
          >
            {currentPlanCode === 'pro_monthly' ? 'Current plan' : 'Start 14-day trial'}
          </Button>
        </Card>
      )}

      {annual && (
        <Card className="p-6 flex flex-col">
          <h3 className="text-lg font-semibold">{annual.name}</h3>
          <div className="mt-2 text-3xl font-bold">{formatPrice(annual.amountExclTax, annual.interval)}</div>
          <p className="mt-1 text-sm text-muted-foreground">2 months free vs monthly.</p>
          <ul className="mt-6 space-y-2 text-sm flex-1">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex gap-2 items-start">
                <Check className="w-4 h-4 mt-0.5 text-primary" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <Button
            onClick={() => onSelect('pro_annual')}
            disabled={loading || currentPlanCode === 'pro_annual'}
            variant="outline"
            size="lg"
            className="mt-6 w-full"
          >
            {currentPlanCode === 'pro_annual' ? 'Current plan' : 'Start 14-day trial'}
          </Button>
        </Card>
      )}
    </div>
  );
}
