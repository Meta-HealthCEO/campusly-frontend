'use client';

import { Badge } from '@/components/ui/badge';

const BADGE_STYLES: Record<string, string> = {
  principal: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  hod: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  bursar: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  receptionist: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  counselor: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
};

interface PermissionBadgeProps {
  type: 'principal' | 'hod' | 'bursar' | 'receptionist' | 'counselor';
  label?: string;
}

const DEFAULT_LABELS: Record<string, string> = {
  principal: 'Principal',
  hod: 'HOD',
  bursar: 'Bursar',
  receptionist: 'Receptionist',
  counselor: 'Counselor',
};

export function PermissionBadge({ type, label }: PermissionBadgeProps) {
  return (
    <Badge variant="outline" className={BADGE_STYLES[type]}>
      {label ?? DEFAULT_LABELS[type]}
    </Badge>
  );
}
