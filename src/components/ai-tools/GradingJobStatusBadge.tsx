'use client';

import { Badge } from '@/components/ui/badge';

const statusConfig: Record<string, { label: string; variant: 'default' | 'outline' | 'secondary' | 'destructive' }> = {
  queued: { label: 'Queued', variant: 'outline' },
  grading: { label: 'Grading...', variant: 'outline' },
  completed: { label: 'AI Graded', variant: 'secondary' },
  reviewed: { label: 'Reviewed', variant: 'default' },
  published: { label: 'Published', variant: 'default' },
};

interface GradingJobStatusBadgeProps {
  status: string;
}

export function GradingJobStatusBadge({ status }: GradingJobStatusBadgeProps) {
  const config = statusConfig[status] ?? { label: status, variant: 'outline' as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
