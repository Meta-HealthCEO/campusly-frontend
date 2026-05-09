'use client';
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useHomeworkSubmission } from '@/hooks/useHomeworkSubmission';
import { useQuestionsByIds } from '@/hooks/useQuestionsByIds';
import { ExerciseQuestionRenderer } from './ExerciseQuestionRenderer';
import type {
  ExerciseSubmission,
  SubmitHomeworkPayload,
  StructuredHomeworkSubmission,
} from '@/types/homework';
import type { ExerciseHomework } from '@/types/homework';

interface Props {
  homework: ExerciseHomework;
  submission: StructuredHomeworkSubmission | null;
  onSubmit: (payload: SubmitHomeworkPayload) => Promise<StructuredHomeworkSubmission | null>;
}

export function ExerciseSubmissionForm({ homework, submission, onSubmit }: Props) {
  const ids = homework.exerciseQuestionIds;
  const { questions, loading } = useQuestionsByIds(ids);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submittedId, setSubmittedId] = useState<string | null>(
    submission?._id ?? null,
  );
  const [submitting, setSubmitting] = useState(false);
  const live = useHomeworkSubmission(submittedId);

  const handleSubmit = async (): Promise<void> => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const payload: SubmitHomeworkPayload = {
        type: 'exercise',
        answers: questions.map((q) => ({
          questionId: q.id,
          studentAnswer: answers[q.id] ?? '',
        })),
      };
      const result = await onSubmit(payload);
      if (result) setSubmittedId(result._id);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  if (questions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No questions found for this exercise.
      </p>
    );
  }

  const liveSub =
    live.submission?.type === 'exercise'
      ? (live.submission as ExerciseSubmission)
      : null;

  const liveAnswerMap = new Map(
    liveSub?.answers.map((a) => [a.questionId, a]) ?? [],
  );
  const isLocked = !!submittedId;

  return (
    <div className="space-y-4">
      {questions.map((q, i) => {
        const la = liveAnswerMap.get(q.id);
        return (
          <Card key={q.id}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium break-words">
                  Q{i + 1}. {q.stem}
                </p>
                <span className="text-xs text-muted-foreground shrink-0">
                  {q.marks} marks
                </span>
              </div>

              <ExerciseQuestionRenderer
                question={q}
                value={answers[q.id] ?? ''}
                onChange={(v) => setAnswers((prev) => ({ ...prev, [q.id]: v }))}
                disabled={isLocked}
              />

              {la && (
                <div className="text-xs text-muted-foreground border-t pt-2">
                  {la.gradingMethod === 'pending' ? (
                    <span>Grading...</span>
                  ) : (
                    <span>
                      Awarded: {la.awarded ?? 0} / {q.marks}
                      {la.rationale ? ` — ${la.rationale}` : ''}
                    </span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {!isLocked && (
        <Button
          onClick={() => void handleSubmit()}
          disabled={submitting || questions.length === 0}
          className="w-full sm:w-auto"
        >
          {submitting ? 'Submitting...' : 'Submit'}
        </Button>
      )}

      {isLocked && live.polling && (
        <p className="text-sm text-muted-foreground">Auto-grading in progress...</p>
      )}

      {isLocked && !live.polling && liveSub?.gradingStatus === 'graded' && (
        <p className="text-sm font-medium">
          Final mark: {liveSub.mark ?? '-'} / {liveSub.maxMarks}
        </p>
      )}
    </div>
  );
}
