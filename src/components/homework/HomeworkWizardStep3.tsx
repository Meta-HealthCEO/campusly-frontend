'use client';
import { Button } from '@/components/ui/button';
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
      <Card>
        <CardContent className="p-4 space-y-2 text-sm">
          <Row label="Type" value={state.type ?? '-'} />
          <Row label="Title" value={state.title} />
          <Row label="Due date" value={state.dueDate} />
          <Row label="Total marks" value={String(state.totalMarks)} />
          <Row
            label="Late policy"
            value={
              state.latePolicy === 'penalty'
                ? `penalty (${state.latePenaltyPercent}%)`
                : state.latePolicy
            }
          />
          <Row
            label="Auto-publish to gradebook"
            value={state.gradebookAutoPublish ? 'Yes' : 'No'}
          />
          <Row
            label="Items"
            value={`${itemCount} ${state.type === 'quiz' ? 'quiz' : 'questions'}`}
          />
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => state.set({ step: 2 })}>
          Back
        </Button>
        <Button onClick={() => state.set({ step: 4 })}>Next</Button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
      <span className="text-xs text-muted-foreground sm:w-40">{label}</span>
      <span className="font-medium break-words">{value}</span>
    </div>
  );
}
