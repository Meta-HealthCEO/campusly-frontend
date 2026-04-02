'use client';

import { Badge } from '@/components/ui/badge';

type HealthRisk = 'healthy' | 'at_risk' | 'critical';

interface TenantHealthBadgeProps {
  risk: HealthRisk;
  score?: number;
}

const RISK_VARIANT: Record<HealthRisk, 'default' | 'secondary' | 'destructive'> = {
  healthy: 'default',
  at_risk: 'secondary',
  critical: 'destructive',
};

const RISK_LABEL: Record<HealthRisk, string> = {
  healthy: 'Healthy',
  at_risk: 'At Risk',
  critical: 'Critical',
};

export function TenantHealthBadge({ risk, score }: TenantHealthBadgeProps) {
  return (
    <Badge variant={RISK_VARIANT[risk]}>
      {RISK_LABEL[risk]}{score !== undefined ? ` (${score})` : ''}
    </Badge>
  );
}
