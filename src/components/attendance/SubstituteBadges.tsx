'use client';

import { Badge } from '@/components/ui/badge';
import type {
  SubstituteStatus,
  SubstituteReasonCategory,
} from '@/types';

const STATUS_LABELS: Record<SubstituteStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  declined: 'Declined',
  cancelled: 'Cancelled',
};

const CATEGORY_LABELS: Record<SubstituteReasonCategory, string> = {
  sick: 'Sick',
  training: 'Training',
  personal: 'Personal',
  family: 'Family',
  emergency: 'Emergency',
  other: 'Other',
};

export function SubstituteStatusBadge({ status }: { status: SubstituteStatus }) {
  if (status === 'approved') {
    return (
      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20">
        {STATUS_LABELS[status]}
      </Badge>
    );
  }
  if (status === 'pending') {
    return (
      <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20">
        {STATUS_LABELS[status]}
      </Badge>
    );
  }
  if (status === 'declined') {
    return <Badge variant="destructive">{STATUS_LABELS[status]}</Badge>;
  }
  return <Badge variant="outline" className="text-muted-foreground">{STATUS_LABELS[status]}</Badge>;
}

export function SubstituteCategoryBadge({
  category,
}: { category: SubstituteReasonCategory }) {
  const label = CATEGORY_LABELS[category];
  if (category === 'sick') {
    return <Badge variant="outline" className="border-blue-500/30 text-blue-700 dark:text-blue-400">{label}</Badge>;
  }
  if (category === 'emergency') {
    return <Badge variant="destructive">{label}</Badge>;
  }
  if (category === 'training') {
    return <Badge variant="outline" className="border-violet-500/30 text-violet-700 dark:text-violet-400">{label}</Badge>;
  }
  if (category === 'family') {
    return <Badge variant="outline" className="border-pink-500/30 text-pink-700 dark:text-pink-400">{label}</Badge>;
  }
  return <Badge variant="outline">{label}</Badge>;
}
