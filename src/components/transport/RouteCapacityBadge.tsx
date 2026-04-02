'use client';

import { Badge } from '@/components/ui/badge';

interface RouteCapacityBadgeProps {
  assignedCount: number;
  capacity: number;
}

export function RouteCapacityBadge({ assignedCount, capacity }: RouteCapacityBadgeProps) {
  if (capacity <= 0) return null;

  const percent = Math.round((assignedCount / capacity) * 100);

  const colorClass =
    percent >= 90
      ? 'bg-destructive/10 text-destructive'
      : percent >= 70
        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';

  return (
    <Badge className={colorClass}>
      {assignedCount}/{capacity} seats
    </Badge>
  );
}
