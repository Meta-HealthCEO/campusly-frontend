'use client';

import { Card, CardContent } from '@/components/ui/card';
import { useTeacherHomeworkWizardStore } from '@/stores/useTeacherHomeworkWizardStore';

export function HomeworkWizardStep3() {
  const state = useTeacherHomeworkWizardStore();

  const itemCount =
    state.type === 'quiz'
      ? 1
      : state.type === 'reading'
        ? state.comprehensionQuestionIds.length
        : state.exerciseQuestionIds.length;

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Review and Assign</h2>
        <p className="text-sm text-muted-foreground">
          Check the setup, then assign it to the class.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-2 p-4 text-sm">
          <Row label="Type" value={state.type ?? '-'} />
          <Row label="Title" value={state.title} />
          <Row label="Due date" value={state.dueDate} />
          <Row label="Total marks" value={String(state.totalMarks)} />
          <Row
            label="Late policy"
            value={
              state.latePolicy === 'penalty'
                ? `Penalty (${state.latePenaltyPercent}%)`
                : state.latePolicy
            }
          />
          <Row
            label="Auto-publish to gradebook"
            value={state.gradebookAutoPublish ? 'Yes' : 'No'}
          />
          <Row
            label="Items"
            value={`${itemCount} ${state.type === 'quiz' ? 'quiz' : 'question'}${itemCount === 1 ? '' : 's'}`}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
      <span className="text-xs text-muted-foreground sm:w-44">{label}</span>
      <span className="font-medium break-words">{value}</span>
    </div>
  );
}
