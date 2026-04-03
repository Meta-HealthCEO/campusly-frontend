'use client';

import { Badge } from '@/components/ui/badge';
import type { IncidentStatus } from '@/types';

const STATUS_VARIANTS: Record<IncidentStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  reported: 'outline',
  investigating: 'default',
  resolved: 'secondary',
  escalated: 'destructive',
};

const STATUS_LABELS: Record<IncidentStatus, string> = {
  reported: 'Reported',
  investigating: 'Investigating',
  resolved: 'Resolved',
  escalated: 'Escalated',
};

interface IncidentStatusBadgeProps {
  status: IncidentStatus;
}

export function IncidentStatusBadge({ status }: IncidentStatusBadgeProps) {
  return (
    <Badge variant={STATUS_VARIANTS[status]}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}
