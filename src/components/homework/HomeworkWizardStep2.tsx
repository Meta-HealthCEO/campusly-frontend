'use client';
import { useTeacherHomeworkWizardStore } from '@/stores/useTeacherHomeworkWizardStore';
import type { HomeworkWizardState } from '@/stores/useTeacherHomeworkWizardStore';
import { QuizPicker } from './QuizPicker';
import { ResourcePicker } from './ResourcePicker';
import { HomeworkExercisePicker } from './HomeworkExercisePicker';

export function HomeworkWizardStep2() {
  const state = useTeacherHomeworkWizardStore();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Choose Content</h2>
        <p className="text-sm text-muted-foreground">
          Pick the quiz, resource, or question set students will complete.
        </p>
      </div>

      {state.type === 'quiz' && (
        <QuizPicker
          subjectId={state.subjectId}
          classId={state.classId}
          selectedId={state.quizId}
          onSelect={(id) => state.set({ quizId: id })}
        />
      )}
      {state.type === 'reading' && (
        <ResourcePicker
          subjectId={state.subjectId}
          gradeId={state.gradeId}
          curriculumNodeId={state.curriculumNodeId}
          selectedId={state.contentResourceId}
          onSelect={(id) => state.set({ contentResourceId: id })}
          onComprehensionReady={(ids) => state.set({ comprehensionQuestionIds: ids })}
        />
      )}
      {state.type === 'exercise' && (
        <HomeworkExercisePicker
          subjectId={state.subjectId}
          gradeId={state.gradeId}
          curriculumNodeId={state.curriculumNodeId}
          selectedIds={state.exerciseQuestionIds}
          onChange={(ids: string[]) => state.set({ exerciseQuestionIds: ids })}
        />
      )}
    </div>
  );
}

/** Whether step 2's content selection is complete — read by the page footer. */
export function isHomeworkStep2Ready(state: HomeworkWizardState): boolean {
  return (
    (state.type === 'quiz' && !!state.quizId) ||
    (state.type === 'reading' &&
      !!state.contentResourceId &&
      state.comprehensionQuestionIds.length > 0) ||
    (state.type === 'exercise' && state.exerciseQuestionIds.length > 0)
  );
}
