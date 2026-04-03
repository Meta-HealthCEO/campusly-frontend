'use client';

import { Badge } from '@/components/ui/badge';
import type { SeverityLevel } from '@/types';

const SEVERITY_VARIANTS: Record<SeverityLevel, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  low: 'secondary',
  medium: 'default',
  high: 'destructive',
  critical: 'destructive',
};

const SEVERITY_LABELS: Record<SeverityLevel, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

interface SeverityBadgeProps {
  severity: SeverityLevel;
}

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  return (
    <Badge variant={SEVERITY_VARIANTS[severity]}>
      {SEVERITY_LABELS[severity]}
    </Badge>
  );
}
