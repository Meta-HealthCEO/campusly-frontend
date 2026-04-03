'use client';

import { Badge } from '@/components/ui/badge';
import type { PastoralReferralStatus } from '@/types';

const STATUS_VARIANTS: Record<
  PastoralReferralStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  referred: 'secondary',
  acknowledged: 'outline',
  in_progress: 'default',
  resolved: 'default',
  closed: 'secondary',
};

const STATUS_LABELS: Record<PastoralReferralStatus, string> = {
  referred: 'Referred',
  acknowledged: 'Acknowledged',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

const STATUS_CLASS_OVERRIDES: Partial<Record<PastoralReferralStatus, string>> = {
  resolved: 'text-green-700',
};

interface ReferralStatusBadgeProps {
  status: PastoralReferralStatus;
}

export function ReferralStatusBadge({ status }: ReferralStatusBadgeProps) {
  return (
    <Badge
      variant={STATUS_VARIANTS[status]}
      className={STATUS_CLASS_OVERRIDES[status]}
    >
      {STATUS_LABELS[status]}
    </Badge>
  );
}
