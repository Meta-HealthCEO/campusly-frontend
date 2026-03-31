'use client';

import { Badge } from '@/components/ui/badge';

const typeStyles: Record<string, string> = {
  trip: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  medical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  general: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  photo: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  data: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
};

const typeLabels: Record<string, string> = {
  trip: 'Trip',
  medical: 'Medical',
  general: 'General',
  photo: 'Photo',
  data: 'Data',
};

interface ConsentTypeBadgeProps {
  type: string;
}

export function ConsentTypeBadge({ type }: ConsentTypeBadgeProps) {
  return (
    <Badge variant="secondary" className={typeStyles[type] ?? ''}>
      {typeLabels[type] ?? type}
    </Badge>
  );
}
