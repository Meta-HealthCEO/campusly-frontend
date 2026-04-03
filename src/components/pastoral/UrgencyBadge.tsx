'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ReferralUrgency } from '@/types';

const URGENCY_VARIANTS: Record<
  ReferralUrgency,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  low: 'outline',
  medium: 'secondary',
  high: 'default',
  critical: 'destructive',
};

const URGENCY_LABELS: Record<ReferralUrgency, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

const URGENCY_CLASS_OVERRIDES: Partial<Record<ReferralUrgency, string>> = {
  high: 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100',
};

interface UrgencyBadgeProps {
  urgency: ReferralUrgency;
}

export function UrgencyBadge({ urgency }: UrgencyBadgeProps) {
  return (
    <Badge
      variant={URGENCY_VARIANTS[urgency]}
      className={cn(URGENCY_CLASS_OVERRIDES[urgency])}
    >
      {URGENCY_LABELS[urgency]}
    </Badge>
  );
}
