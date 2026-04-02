'use client';

import { Badge } from '@/components/ui/badge';
import type { AnnouncementPriority } from '@/hooks/useAnnouncements';

const priorityConfig: Record<AnnouncementPriority, { label: string; className: string }> = {
  low: { label: 'Low', className: 'bg-slate-100 text-slate-700' },
  medium: { label: 'Medium', className: 'bg-slate-100 text-slate-700' },
  high: { label: 'High', className: 'bg-amber-100 text-amber-800' },
  urgent: { label: 'Urgent', className: 'bg-destructive/10 text-destructive' },
};

interface AnnouncementPriorityBadgeProps {
  priority: AnnouncementPriority;
}

export function AnnouncementPriorityBadge({ priority }: AnnouncementPriorityBadgeProps) {
  const config = priorityConfig[priority] ?? priorityConfig.medium;
  return (
    <Badge variant="secondary" className={config.className}>
      {config.label}
    </Badge>
  );
}
