'use client';
import { Button } from '@/components/ui/button';
import { useTeacherHomeworkWizardStore } from '@/stores/useTeacherHomeworkWizardStore';
import { QuizPicker } from './QuizPicker';
import { ResourcePicker } from './ResourcePicker';
import { HomeworkExercisePicker } from './HomeworkExercisePicker';

export function HomeworkWizardStep2() {
  const state = useTeacherHomeworkWizardStore();

  const canAdvance =
    (state.type === 'quiz' && !!state.quizId) ||
    (state.type === 'reading' &&
      !!state.contentResourceId &&
      state.comprehensionQuestionIds.length > 0) ||
    (state.type === 'exercise' && state.exerciseQuestionIds.length > 0);

  return (
    <div className="space-y-6">
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
          selectedIds={state.exerciseQuestionIds}
          onChange={(ids: string[]) => state.set({ exerciseQuestionIds: ids })}
        />
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => state.set({ step: 1 })}>
          Back
        </Button>
        <Button onClick={() => state.set({ step: 3 })} disabled={!canAdvance}>
          Next
        </Button>
      </div>
    </div>
  );
}
