'use client';

import { Badge } from '@/components/ui/badge';
import type { LeaveType } from '@/types';

const TYPE_CONFIG: Record<LeaveType, { label: string; className: string }> = {
  annual: { label: 'Annual', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  sick: { label: 'Sick', className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
  family_responsibility: { label: 'Family', className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
  maternity: { label: 'Maternity', className: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400' },
  paternity: { label: 'Paternity', className: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400' },
  unpaid: { label: 'Unpaid', className: 'bg-muted text-muted-foreground' },
  study: { label: 'Study', className: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400' },
};

interface LeaveTypeBadgeProps {
  type: LeaveType;
}

export function LeaveTypeBadge({ type }: LeaveTypeBadgeProps) {
  const config = TYPE_CONFIG[type] ?? { label: type, className: 'bg-muted text-muted-foreground' };
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
