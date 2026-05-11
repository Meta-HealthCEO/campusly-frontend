'use client';

import { useLessonWorkspaceStore } from '@/stores/useLessonWorkspaceStore';
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
  lessonId: string;
  materials: LessonMaterial[];
  /** Whether the lesson has at least one class assignment. Homework
   *  drawers (AI / Create) need this to gate inline creation. */
  lessonHasAssignedClass: boolean;
  addMaterial: (payload: Record<string, unknown>) => Promise<LessonMaterial>;
  regenerateMaterial: (mid: string, payload?: Record<string, unknown>) => Promise<LessonMaterial>;
}

export function MaterialDrawer({
  lessonId: _lessonId,
  materials,
  lessonHasAssignedClass,
  addMaterial,
  regenerateMaterial,
}: Props) {
  const drawer = useLessonWorkspaceStore((s) => s.drawer);
  const setKind = useLessonWorkspaceStore((s) => s.setKind);
  const closeDrawer = useLessonWorkspaceStore((s) => s.closeDrawer);

  const submit = async (payload: Record<string, unknown>) => {
    if (!drawer.phase) return;
    if (drawer.materialId) {
      await regenerateMaterial(drawer.materialId, { ...payload, phase: drawer.phase });
    } else {
      await addMaterial({ ...payload, phase: drawer.phase });
    }
    closeDrawer();
  };

  const existing = drawer.materialId
    ? materials.find((m) => m._id === drawer.materialId)
    : undefined;

  const title = drawer.kind
    ? `${existing ? 'Edit' : 'Add'} ${drawer.kind.replace('_', ' ')}`
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
    </MaterialDrawerShell>
  );
}
