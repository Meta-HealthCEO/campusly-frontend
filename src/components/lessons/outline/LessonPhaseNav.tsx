'use client';

import { Label } from '@/components/ui/label';
import { LESSON_PHASES } from '@/types/lesson';
import type { LessonPhase } from '@/types/lesson';

const PHASE_LABEL: Record<LessonPhase, string> = {
  introduction: 'Introduction',
  direct_instruction: 'Direct Instruction',
  practice: 'Practice',
  assessment: 'Assessment',
  homework: 'Homework',
};

interface Props {
  counts: Record<LessonPhase, number>;
}

export function LessonPhaseNav({ counts }: Props) {
  const scrollTo = (phase: LessonPhase) => {
    if (typeof document === 'undefined') return;
    const el = document.getElementById(`phase-${phase}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Jump to phase
      </Label>
      <div className="flex flex-col gap-1">
        {LESSON_PHASES.map((phase) => (
          <button
            key={phase}
            type="button"
            onClick={() => scrollTo(phase)}
            className="flex items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="truncate">{PHASE_LABEL[phase]}</span>
            <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium text-muted-foreground">
              {counts[phase]}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
