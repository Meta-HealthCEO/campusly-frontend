'use client';

import { Badge } from '@/components/ui/badge';
import type { LeaveStatus } from '@/types';

const STATUS_CONFIG: Record<LeaveStatus, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
  approved: { label: 'Approved', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' },
  declined: { label: 'Declined', className: 'bg-destructive/10 text-destructive' },
  cancelled: { label: 'Cancelled', className: 'bg-muted text-muted-foreground' },
};

interface LeaveStatusBadgeProps {
  status: LeaveStatus;
}

export function LeaveStatusBadge({ status }: LeaveStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
