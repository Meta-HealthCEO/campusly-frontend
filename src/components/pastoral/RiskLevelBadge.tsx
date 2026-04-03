'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { PastoralRiskLevel } from '@/types';

const RISK_VARIANTS: Record<
  PastoralRiskLevel,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  low: 'outline',
  medium: 'secondary',
  high: 'destructive',
};

const RISK_LABELS: Record<PastoralRiskLevel, string> = {
  low: 'Low Risk',
  medium: 'Medium Risk',
  high: 'High Risk',
};

const RISK_CLASS_OVERRIDES: Partial<Record<PastoralRiskLevel, string>> = {
  low: 'text-green-700 border-green-300',
  medium: 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100',
};

interface RiskLevelBadgeProps {
  level: PastoralRiskLevel;
}

export function RiskLevelBadge({ level }: RiskLevelBadgeProps) {
  return (
    <Badge
      variant={RISK_VARIANTS[level]}
      className={cn(RISK_CLASS_OVERRIDES[level])}
    >
      {RISK_LABELS[level]}
    </Badge>
  );
}
