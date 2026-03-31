'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type AuditAction = 'create' | 'update' | 'delete' | 'login' | 'export';

interface AuditActionBadgeProps {
  action: AuditAction;
}

const actionStyles: Record<AuditAction, string> = {
  create: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  update: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  delete: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  login: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  export: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

const actionLabels: Record<AuditAction, string> = {
  create: 'Create',
  update: 'Update',
  delete: 'Delete',
  login: 'Login',
  export: 'Export',
};

export function AuditActionBadge({ action }: AuditActionBadgeProps) {
  return (
    <Badge className={cn(actionStyles[action])}>
      {actionLabels[action]}
    </Badge>
  );
}
