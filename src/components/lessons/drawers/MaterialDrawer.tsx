'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useLessonWorkspaceStore } from '@/stores/useLessonWorkspaceStore';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { MaterialDrawerShell } from '../MaterialDrawerShell';
import { MaterialTypePicker } from '../MaterialTypePicker';
import { ReadingDrawer } from './ReadingDrawer';
import { WorksheetDrawer } from './WorksheetDrawer';
import { ActivityDrawer } from './ActivityDrawer';
import { NotesDrawer } from './NotesDrawer';
import { WorkedExampleDrawer } from './WorkedExampleDrawer';
import { QuizDrawer } from './QuizDrawer';
import { PracticeQuestionsDrawer } from './PracticeQuestionsDrawer';
import { HomeworkDrawer } from './HomeworkDrawer';
import { PaperDrawer } from './PaperDrawer';
import type { LessonMaterial } from '@/types/lesson';

interface Props {
  materials: LessonMaterial[];
  /** Whether the lesson has at least one class assignment. Homework
   *  drawers (AI / Create) need this to gate inline creation. */
  lessonHasAssignedClass: boolean;
  addMaterial: (payload: Record<string, unknown>) => Promise<LessonMaterial>;
  regenerateMaterial: (mid: string, payload?: Record<string, unknown>) => Promise<LessonMaterial>;
}

export function MaterialDrawer({
  materials,
  lessonHasAssignedClass,
  addMaterial,
  regenerateMaterial,
}: Props) {
  const drawer = useLessonWorkspaceStore((s) => s.drawer);
  const setKind = useLessonWorkspaceStore((s) => s.setKind);
  const closeDrawer = useLessonWorkspaceStore((s) => s.closeDrawer);
  const [generating, setGenerating] = useState<string | null>(null);

  const submit = async (payload: Record<string, unknown>) => {
    if (!drawer.phase) return;
    const isRegenerate = !!drawer.materialId;
    const label = typeof payload.title === 'string' && payload.title.trim()
      ? payload.title.trim()
      : 'material';
    // Close drawer first, show a busy modal during the AI call so the
    // teacher gets visible "something's happening" feedback (drawers
    // were just showing 'Saving...' on the submit button).
    closeDrawer();
    setGenerating(isRegenerate ? `Regenerating ${label}` : `Generating ${label}`);
    try {
      if (isRegenerate && drawer.materialId) {
        await regenerateMaterial(drawer.materialId, { ...payload, phase: drawer.phase });
      } else {
        await addMaterial({ ...payload, phase: drawer.phase });
      }
    } finally {
      setGenerating(null);
    }
  };

  const existing = drawer.materialId
    ? materials.find((m) => m._id === drawer.materialId)
    : undefined;

  const title = drawer.kind
    ? `${existing ? 'Regenerate' : 'Add'} ${drawer.kind.replace('_', ' ')}`
    : 'Add material';

  return (
    <MaterialDrawerShell open={drawer.open} onClose={closeDrawer} title={title}>
      {!drawer.kind && <MaterialTypePicker onPick={setKind} />}
      {drawer.kind === 'reading' && (
        <ReadingDrawer
          onSubmit={submit}
          existing={existing?.kind === 'reading' ? existing : undefined}
        />
      )}
      {drawer.kind === 'worksheet' && (
        <WorksheetDrawer
          onSubmit={submit}
          existing={existing?.kind === 'worksheet' ? existing : undefined}
        />
      )}
      {drawer.kind === 'activity' && (
        <ActivityDrawer
          onSubmit={submit}
          existing={existing?.kind === 'activity' ? existing : undefined}
        />
      )}
      {drawer.kind === 'study_notes' && (
        <NotesDrawer
          onSubmit={submit}
          existing={existing?.kind === 'study_notes' ? existing : undefined}
        />
      )}
      {drawer.kind === 'worked_example' && (
        <WorkedExampleDrawer
          onSubmit={submit}
          existing={existing?.kind === 'worked_example' ? existing : undefined}
        />
      )}
      {drawer.kind === 'quiz' && (
        <QuizDrawer
          onSubmit={submit}
          existing={existing?.kind === 'quiz' ? existing : undefined}
        />
      )}
      {drawer.kind === 'practice_questions' && (
        <PracticeQuestionsDrawer
          onSubmit={submit}
          existing={existing?.kind === 'practice_questions' ? existing : undefined}
        />
      )}
      {drawer.kind === 'homework' && (
        <HomeworkDrawer
          onSubmit={submit}
          existing={existing?.kind === 'homework' ? existing : undefined}
          lessonHasAssignedClass={lessonHasAssignedClass}
        />
      )}
      {drawer.kind === 'paper' && (
        <PaperDrawer
          onSubmit={submit}
          existing={existing?.kind === 'paper' ? existing : undefined}
        />
      )}

      <Dialog open={!!generating} onOpenChange={() => { /* uncloseable while busy */ }}>
        <DialogContent
          showCloseButton={false}
          className="max-w-md flex flex-col items-center text-center gap-4 py-8"
        >
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Loader2 className="h-6 w-6 animate-spin" />
          </span>
          <div>
            <p className="text-base font-semibold">{generating}</p>
            <p className="text-sm text-muted-foreground mt-1">
              The AI is composing your material. This usually takes 30-60 seconds.
            </p>
            <p className="text-xs text-muted-foreground mt-3">
              Don't navigate away — we'll close this when it's done.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </MaterialDrawerShell>
  );
}
