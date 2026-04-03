'use client';

import { Badge } from '@/components/ui/badge';
import type { BookingStatus } from '@/types';

const STATUS_CONFIG: Record<BookingStatus, { label: string; className: string }> = {
  confirmed: { label: 'Confirmed', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' },
  cancelled: { label: 'Cancelled', className: 'bg-muted text-muted-foreground' },
  completed: { label: 'Completed', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  no_show: { label: 'No Show', className: 'bg-destructive/10 text-destructive' },
};

interface BookingStatusBadgeProps {
  status: BookingStatus;
}

export function BookingStatusBadge({ status }: BookingStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.confirmed;
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
