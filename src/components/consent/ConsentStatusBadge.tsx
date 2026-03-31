'use client';

import { Badge } from '@/components/ui/badge';

const statusStyles: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  granted: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  denied: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  granted: 'Granted',
  denied: 'Denied',
};

interface ConsentStatusBadgeProps {
  status: string;
}

export function ConsentStatusBadge({ status }: ConsentStatusBadgeProps) {
  return (
    <Badge variant="secondary" className={statusStyles[status] ?? ''}>
      {statusLabels[status] ?? status}
    </Badge>
  );
}
