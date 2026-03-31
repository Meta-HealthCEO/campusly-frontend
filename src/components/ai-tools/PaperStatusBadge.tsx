'use client';

import { Badge } from '@/components/ui/badge';

const statusConfig: Record<string, { label: string; variant: 'default' | 'outline' | 'secondary' }> = {
  generating: { label: 'Generating', variant: 'outline' },
  ready: { label: 'Ready', variant: 'default' },
  edited: { label: 'Edited', variant: 'secondary' },
};

interface PaperStatusBadgeProps {
  status: string;
}

export function PaperStatusBadge({ status }: PaperStatusBadgeProps) {
  const config = statusConfig[status] ?? { label: status, variant: 'outline' as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
