'use client';

import { Badge } from '@/components/ui/badge';
import type { ConferenceEventStatus } from '@/types';

const STATUS_CONFIG: Record<ConferenceEventStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
  published: { label: 'Published', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  in_progress: { label: 'In Progress', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
  completed: { label: 'Completed', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' },
  cancelled: { label: 'Cancelled', className: 'bg-destructive/10 text-destructive' },
};

interface ConferenceStatusBadgeProps {
  status: ConferenceEventStatus;
}

export function ConferenceStatusBadge({ status }: ConferenceStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
