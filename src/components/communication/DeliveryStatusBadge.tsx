'use client';

import { Badge } from '@/components/ui/badge';
import type { DeliveryStatus } from '@/types';

const statusConfig: Record<DeliveryStatus, { label: string; className: string }> = {
  queued: {
    label: 'Queued',
    className: 'bg-muted text-muted-foreground',
  },
  sent: {
    label: 'Sent',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  delivered: {
    label: 'Delivered',
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  failed: {
    label: 'Failed',
    className: 'bg-destructive/10 text-destructive',
  },
  bounced: {
    label: 'Bounced',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  },
  opened: {
    label: 'Opened',
    className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  },
};

interface DeliveryStatusBadgeProps {
  status: DeliveryStatus;
}

export function DeliveryStatusBadge({ status }: DeliveryStatusBadgeProps) {
  const cfg = statusConfig[status] ?? statusConfig.queued;
  return <Badge className={cfg.className}>{cfg.label}</Badge>;
}
