'use client';

import { Badge } from '@/components/ui/badge';
import type { LessonStatus } from '@/types/lesson';

const VARIANTS: Record<LessonStatus, { label: string; className: string }> = {
  draft: {
    label: 'Draft',
    className: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  },
  ready: {
    label: 'Ready',
    className: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
  },
  taught: {
    label: 'Taught',
    className: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
  },
};

export function LessonStatusPill({ status }: { status: LessonStatus }) {
  const v = VARIANTS[status];
  return (
    <Badge variant="outline" className={v.className}>
      {v.label}
    </Badge>
  );
}
