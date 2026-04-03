'use client';

import { Badge } from '@/components/ui/badge';
import type { WaitlistStatus } from '@/types';

const STATUS_CONFIG: Record<WaitlistStatus, { label: string; className: string }> = {
  waiting: { label: 'Waiting', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
  offered: { label: 'Slot Offered', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  expired: { label: 'Expired', className: 'bg-muted text-muted-foreground' },
};

interface WaitlistBadgeProps {
  position: number;
  status: WaitlistStatus;
}

export function WaitlistBadge({ position, status }: WaitlistBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.waiting;
  return (
    <Badge variant="outline" className={config.className}>
      {status === 'waiting' ? `#${position} in line` : config.label}
    </Badge>
  );
}
