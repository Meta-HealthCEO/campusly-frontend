'use client';

import { Badge } from '@/components/ui/badge';

const statusStyles: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  rejected: 'bg-destructive/10 text-destructive dark:bg-red-900/30 dark:text-destructive',
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  expired: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  revoked: 'bg-destructive/10 text-destructive dark:bg-red-900/30 dark:text-destructive',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  defaulted: 'bg-destructive/10 text-destructive dark:bg-red-900/30 dark:text-destructive',
  paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  partial: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  overdue: 'bg-destructive/10 text-destructive dark:bg-red-900/30 dark:text-destructive',
};

interface FeeStatusBadgeProps {
  status: string;
}

export function FeeStatusBadge({ status }: FeeStatusBadgeProps) {
  const style = statusStyles[status] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
  const label = status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');

  return <Badge className={style}>{label}</Badge>;
}

const collectionStageLabels: Record<string, string> = {
  friendly_reminder: 'Friendly Reminder',
  warning_letter: 'Warning Letter',
  final_demand: 'Final Demand',
  legal_handover: 'Legal Handover',
  write_off: 'Write Off',
};

export function CollectionStageBadge({ stage }: { stage: string }) {
  const label = collectionStageLabels[stage] ?? stage;
  const stageColors: Record<string, string> = {
    friendly_reminder: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    warning_letter: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    final_demand: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    legal_handover: 'bg-destructive/10 text-destructive dark:bg-red-900/30 dark:text-destructive',
    write_off: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  };
  const style = stageColors[stage] ?? 'bg-gray-100 text-gray-700';

  return <Badge className={style}>{label}</Badge>;
}
