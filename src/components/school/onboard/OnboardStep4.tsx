'use client';

import { cn } from '@/lib/utils';
import type { WizardData } from './types';

const TIER_PRICES: Record<string, string> = {
  basic: 'R2,999/mo',
  standard: 'R7,999/mo',
  premium: 'R14,999/mo',
};

const TIER_DESCRIPTIONS: Record<string, string> = {
  basic: 'Up to 150 students, core modules only',
  standard: 'Up to 500 students, all modules included',
  premium: 'Unlimited students, priority support, custom branding',
};

interface Props {
  data: WizardData;
  update: (patch: Partial<WizardData>) => void;
}

export function OnboardStep4({ data, update }: Props) {
  return (
    <div className="space-y-3">
      {(['basic', 'standard', 'premium'] as const).map((tier) => (
        <button
          key={tier}
          type="button"
          onClick={() => update({ tier })}
          className={cn(
            'w-full rounded-lg border p-4 text-left transition-colors',
            data.tier === tier ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
          )}
        >
          <div className="flex items-center justify-between">
            <p className="font-semibold capitalize">{tier}</p>
            <p className="font-bold text-primary">{TIER_PRICES[tier]}</p>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{TIER_DESCRIPTIONS[tier]}</p>
        </button>
      ))}
    </div>
  );
}
