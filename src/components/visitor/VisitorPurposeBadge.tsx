'use client';

import { Badge } from '@/components/ui/badge';
import type { VisitorPurpose } from '@/types';

const PURPOSE_CONFIG: Record<VisitorPurpose, { label: string; className: string }> = {
  meeting: { label: 'Meeting', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  delivery: { label: 'Delivery', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  maintenance: { label: 'Maintenance', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  parent_visit: { label: 'Parent Visit', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  government: { label: 'Government', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  interview: { label: 'Interview', className: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' },
  contractor: { label: 'Contractor', className: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' },
  other: { label: 'Other', className: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400' },
};

interface VisitorPurposeBadgeProps {
  purpose: VisitorPurpose;
}

export function VisitorPurposeBadge({ purpose }: VisitorPurposeBadgeProps) {
  const config = PURPOSE_CONFIG[purpose] ?? PURPOSE_CONFIG.other;
  return <Badge className={config.className}>{config.label}</Badge>;
}
