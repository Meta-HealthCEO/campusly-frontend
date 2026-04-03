'use client';

import { Badge } from '@/components/ui/badge';

const WSE_LABELS: Record<number, string> = {
  1: 'Basic Functionality',
  2: 'Leadership & Management',
  3: 'Governance & Relationships',
  4: 'Teaching & Learning',
  5: 'Curriculum & Resources',
  6: 'Learner Achievement',
  7: 'Safety & Discipline',
  8: 'Infrastructure',
  9: 'Parents & Community',
};

interface WSEAreaBadgeProps {
  area: number;
}

export function WSEAreaBadge({ area }: WSEAreaBadgeProps) {
  const label = WSE_LABELS[area] ?? 'Unknown';

  return (
    <Badge variant="secondary">
      WSE {area}: {label}
    </Badge>
  );
}
