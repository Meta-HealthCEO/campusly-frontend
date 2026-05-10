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
  addMaterial: (payload: Record<string, unknown>) => Promise<LessonMaterial>;
}

export function MaterialDrawer({ lessonId: _lessonId, addMaterial }: Props) {
  const drawer = useLessonWorkspaceStore((s) => s.drawer);
  const setKind = useLessonWorkspaceStore((s) => s.setKind);
  const closeDrawer = useLessonWorkspaceStore((s) => s.closeDrawer);

  const submit = async (payload: Record<string, unknown>) => {
    if (!drawer.phase) return;
    await addMaterial({ ...payload, phase: drawer.phase });
    closeDrawer();
  };

  const title = drawer.kind
    ? `Add ${drawer.kind.replace('_', ' ')}`
    : 'Add material';

  return (
    <MaterialDrawerShell open={drawer.open} onClose={closeDrawer} title={title}>
      {!drawer.kind && <MaterialTypePicker onPick={setKind} />}
      {drawer.kind === 'reading' && <ReadingDrawer onSubmit={submit} />}
      {drawer.kind === 'worksheet' && <WorksheetDrawer onSubmit={submit} />}
      {drawer.kind === 'activity' && <ActivityDrawer onSubmit={submit} />}
      {drawer.kind === 'notes' && <NotesDrawer onSubmit={submit} />}
      {drawer.kind === 'worked_example' && <WorkedExampleDrawer onSubmit={submit} />}
      {drawer.kind === 'quiz' && <QuizDrawer onSubmit={submit} />}
      {drawer.kind === 'practice_questions' && <PracticeQuestionsDrawer onSubmit={submit} />}
      {drawer.kind === 'homework' && <HomeworkDrawer onSubmit={submit} />}
      {drawer.kind === 'paper' && <PaperDrawer onSubmit={submit} />}
    </MaterialDrawerShell>
  );
}
