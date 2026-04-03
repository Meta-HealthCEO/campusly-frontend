'use client';

import { Badge } from '@/components/ui/badge';
import type { ConfidentialityLevel } from '@/types';

const LEVEL_VARIANTS: Record<
  ConfidentialityLevel,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  standard: 'outline',
  sensitive: 'secondary',
  restricted: 'destructive',
};

const LEVEL_LABELS: Record<ConfidentialityLevel, string> = {
  standard: 'Standard',
  sensitive: 'Sensitive',
  restricted: 'Restricted',
};

interface ConfidentialityBadgeProps {
  level: ConfidentialityLevel;
}

export function ConfidentialityBadge({ level }: ConfidentialityBadgeProps) {
  return (
    <Badge variant={LEVEL_VARIANTS[level]}>
      {LEVEL_LABELS[level]}
    </Badge>
  );
}
