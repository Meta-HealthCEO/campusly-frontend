'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useHomeworkSubmission } from '@/hooks/useHomeworkSubmission';
import { useQuiz } from '@/hooks/useQuiz';
import type {
  QuizHomework,
  QuizSubmission,
  SubmitHomeworkPayload,
  StructuredHomeworkSubmission,
} from '@/types/homework';

interface Props {
  homework: QuizHomework;
  submission: StructuredHomeworkSubmission | null;
  onSubmit: (payload: SubmitHomeworkPayload) => Promise<StructuredHomeworkSubmission | null>;
}

export function QuizSubmissionForm({ homework, submission, onSubmit }: Props) {
  const { quiz, loading } = useQuiz(homework.quizId);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submittedId, setSubmittedId] = useState<string | null>(submission?._id ?? null);
  const [submitting, setSubmitting] = useState(false);
  const live = useHomeworkSubmission(submittedId);

  const handleSubmit = async (): Promise<void> => {
    if (!quiz || submitting) return;
    setSubmitting(true);
    try {
      const payload: SubmitHomeworkPayload = {
        type: 'quiz',
        answers: quiz.questions.map((_, i) => ({
          questionIndex: i,
          studentAnswer: answers[i] ?? '',
        })),
      };
      const result = await onSubmit(payload);
      if (result) setSubmittedId(result._id);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!quiz) return <p className="text-sm text-destructive">Quiz could not be loaded.</p>;

  const liveSub = live.submission?.type === 'quiz' ? (live.submission as QuizSubmission) : null;
  const isLocked = !!submittedId;

  return (
    <div className="space-y-4">
      {quiz.questions.map((q, i) => {
        const liveAnswer = liveSub?.answers[i];
        return (
          <Card key={i}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium break-words">
                  Q{i + 1}. {q.questionText}
                </p>
                <span className="text-xs text-muted-foreground shrink-0">{q.points} marks</span>
              </div>

              {q.questionType === 'mcq' && (
                <div className="space-y-2">
                  {q.options.map((opt, oi) => (
                    <label key={oi} className="flex items-start gap-2 text-sm cursor-pointer">
                      <input
                        type="radio"
                        name={`q${i}`}
                        checked={answers[i] === opt.text}
                        onChange={() => setAnswers((p) => ({ ...p, [i]: opt.text }))}
                        disabled={isLocked}
                      />
                      <span>{opt.text}</span>
                    </label>
                  ))}
                </div>
              )}

              {q.questionType === 'true_false' && (
                <div className="flex gap-4">
                  {(['true', 'false'] as const).map((v) => (
                    <label key={v} className="flex items-center gap-2 text-sm capitalize cursor-pointer">
                      <input
                        type="radio"
                        name={`q${i}`}
                        checked={answers[i] === v}
                        onChange={() => setAnswers((p) => ({ ...p, [i]: v }))}
                        disabled={isLocked}
                      />
                      {v}
                    </label>
                  ))}
                </div>
              )}

              {q.questionType === 'short_answer' && (
                <Input
                  value={answers[i] ?? ''}
                  onChange={(e) => setAnswers((p) => ({ ...p, [i]: e.target.value }))}
                  disabled={isLocked}
                  placeholder="Your answer"
                />
              )}

              {q.questionType === 'matching' && (
                <p className="text-xs text-muted-foreground">
                  Matching not supported in v1 — pick a different quiz.
                </p>
              )}

              {liveAnswer && (
                <div className="text-xs text-muted-foreground border-t pt-2">
                  {liveAnswer.gradingMethod === 'pending' ? (
                    <span>Grading...</span>
                  ) : (
                    <span>
                      Awarded: {liveAnswer.awarded ?? 0} / {q.points}
                      {liveAnswer.rationale ? ` — ${liveAnswer.rationale}` : ''}
                    </span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {!submittedId && (
        <Button
          onClick={() => void handleSubmit()}
          disabled={submitting}
          className="w-full sm:w-auto"
        >
          {submitting ? 'Submitting...' : 'Submit'}
        </Button>
      )}

      {submittedId && live.polling && (
        <p className="text-sm text-muted-foreground">Auto-grading in progress...</p>
      )}

      {submittedId && !live.polling && liveSub?.gradingStatus === 'graded' && (
        <p className="text-sm font-medium">
          Final mark: {liveSub.mark ?? '-'} / {liveSub.maxMarks}
        </p>
      )}
    </div>
  );
}
