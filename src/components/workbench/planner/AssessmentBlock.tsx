'use client';

import { cn } from '@/lib/utils';
import type { PlannedAssessment, AssessmentPlanType } from '@/types';

interface Props {
  assessment: PlannedAssessment;
  onClick: () => void;
}

function borderColor(type: AssessmentPlanType): string {
  switch (type) {
    case 'test':
      return 'border-l-blue-500';
    case 'exam':
      return 'border-l-purple-500';
    case 'assignment':
      return 'border-l-emerald-500';
    case 'practical':
      return 'border-l-amber-500';
    case 'project':
      return 'border-l-teal-500';
  }
}

export function AssessmentBlock({ assessment, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        'w-full text-left border-l-4 bg-card rounded-sm px-1.5 py-0.5 text-xs',
        'hover:brightness-95 transition-all truncate',
        borderColor(assessment.type),
      )}
    >
      <span className="font-medium truncate block">{assessment.title}</span>
      <span className="text-muted-foreground">{assessment.marks} marks</span>
    </button>
  );
}
