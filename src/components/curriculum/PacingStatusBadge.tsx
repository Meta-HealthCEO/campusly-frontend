'use client';

import { cn } from '@/lib/utils';
import type { PacingStatus } from '@/types/curriculum';

interface PacingStatusBadgeProps {
  status: PacingStatus;
  className?: string;
}

const statusConfig: Record<PacingStatus, { label: string; className: string }> = {
  on_track: {
    label: 'On Track',
    className: 'bg-emerald-100 text-emerald-800',
  },
  slightly_behind: {
    label: 'Slightly Behind',
    className: 'bg-amber-100 text-amber-800',
  },
  significantly_behind: {
    label: 'Significantly Behind',
    className: 'bg-destructive/10 text-destructive',
  },
};

export function PacingStatusBadge({ status, className }: PacingStatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  );
}
