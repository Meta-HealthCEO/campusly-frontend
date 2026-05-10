// STUB — replaced in Task 16
'use client';

import type { Lesson, LessonPhase } from '@/types/lesson';

interface Props {
  phase: LessonPhase;
  lesson: Lesson;
  onUpdateMaterial: (
    mid: string,
    patch: { title?: string; teacherNotes?: string },
  ) => Promise<unknown>;
  onMoveMaterial: (
    mid: string,
    toPhase: LessonPhase,
    toIndex: number,
  ) => Promise<void>;
  onDeleteMaterial: (mid: string) => Promise<void>;
}

export function LessonPhaseSection(_props: Props) {
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line no-console
    console.warn(
      '[LessonPhaseSection] STUB — replaced in Task 16',
      _props.phase,
    );
  }
  return (
    <div
      id={`phase-${_props.phase}`}
      className="rounded border p-4 text-sm text-muted-foreground"
    >
      [Task 16 — phase section placeholder for {_props.phase}]
    </div>
  );
}
