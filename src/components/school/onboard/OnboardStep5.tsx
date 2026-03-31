'use client';

import type { WizardData } from './types';

const TIER_PRICES: Record<string, string> = {
  basic: 'R2,999/mo',
  standard: 'R7,999/mo',
  premium: 'R14,999/mo',
};

interface Props {
  data: WizardData;
}

export function OnboardStep5({ data }: Props) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-muted/50 p-4 space-y-2">
        <p className="font-semibold text-sm">School</p>
        <p>
          {data.schoolName} — {data.city}, {data.province}
        </p>
        <p className="text-muted-foreground text-sm capitalize">{data.schoolType} school</p>
        {data.phone && (
          <p className="text-muted-foreground text-sm">{data.phone}</p>
        )}
      </div>
      <div className="rounded-lg bg-muted/50 p-4 space-y-2">
        <p className="font-semibold text-sm">Admin User</p>
        <p>
          {data.adminFirstName} {data.adminLastName}
        </p>
        <p className="text-muted-foreground text-sm">{data.adminEmail}</p>
      </div>
      <div className="rounded-lg bg-muted/50 p-4 space-y-2">
        <p className="font-semibold text-sm">Modules ({data.modules.length})</p>
        <p className="text-sm text-muted-foreground">
          {data.modules.join(', ') || 'None selected'}
        </p>
      </div>
      <div className="rounded-lg bg-muted/50 p-4 space-y-1">
        <p className="font-semibold text-sm">Plan</p>
        <p className="capitalize">
          {data.tier} — {TIER_PRICES[data.tier] ?? ''}
        </p>
      </div>
    </div>
  );
}
