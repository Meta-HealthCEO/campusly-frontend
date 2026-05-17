'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useHomeworkSubmission } from '@/hooks/useHomeworkSubmission';
import { useContentResource } from '@/hooks/useContentResource';
import { ExerciseQuestionRenderer } from './ExerciseQuestionRenderer';
import { ResourceHomeworkViewer } from './ResourceHomeworkViewer';
import type {
  ReadingHomework,
  ReadingSubmission,
  SubmitHomeworkPayload,
  StructuredHomeworkSubmission,
} from '@/types/homework';

// ─── Props ──────────────────────────────────────────────────────────────────

interface Props {
  homework: ReadingHomework;
  submission: StructuredHomeworkSubmission | null;
  onSubmit: (payload: SubmitHomeworkPayload) => Promise<StructuredHomeworkSubmission | null>;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ReadingSubmissionForm({ homework, submission, onSubmit }: Props) {
  const questions = homework.comprehensionQuestions ?? [];
  const { resource, loading: resourceLoading } = useContentResource(homework.contentResourceId);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submittedId, setSubmittedId] = useState<string | null>(submission?._id ?? null);
  const [submitting, setSubmitting] = useState(false);
  const live = useHomeworkSubmission(submittedId);

  const handleSubmit = async (): Promise<void> => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const payload: SubmitHomeworkPayload = {
        type: 'reading',
        markedReadAt: new Date().toISOString(),
        comprehensionAnswers: questions.map((q) => ({
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

  if (resourceLoading) return <LoadingSpinner />;

  const isLocked = !!submittedId;
  const liveSub = live.submission as ReadingSubmission | null;
  const liveAnswerMap = new Map(
    liveSub?.comprehensionAnswers.map((a) => [a.questionId, a]) ?? [],
  );

  return (
    <div className="space-y-4">
      {/* Resource viewer — submitted=true suppresses its internal submit button */}
      {resource && (
        <ResourceHomeworkViewer
          resource={resource}
          submitted={isLocked}
          isOverdue={false}
          submitting={false}
          onSubmit={() => undefined}
        />
      )}

      <h3 className="text-sm font-semibold">Comprehension questions</h3>

      {questions.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No comprehension questions for this reading.
        </p>
      )}

      {questions.map((q, i) => {
        const la = liveAnswerMap.get(q.id);
        return (
          <Card key={q.id}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium break-words">
                  Q{i + 1}. {q.stem}
                </p>
                <span className="text-xs text-muted-foreground shrink-0">{q.marks} marks</span>
              </div>
              <ExerciseQuestionRenderer
                question={q}
                value={answers[q.id] ?? ''}
                onChange={(v) =>
                  setAnswers((prev) => ({ ...prev, [q.id]: v }))
                }
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
          disabled={submitting || (questions.length === 0 && !resource)}
          className="w-full sm:w-auto"
        >
          {submitting ? 'Submitting...' : 'Mark read & Submit'}
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
