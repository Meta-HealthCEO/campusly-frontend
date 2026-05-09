'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type {
  QuizSubmission,
  ExerciseSubmission,
  ReadingSubmission,
  StructuredHomeworkSubmission,
  GradedAnswerBase,
} from '@/types/homework';

interface PopulatedStudent {
  _id: string;
  user?: { firstName: string; lastName: string };
}

type WithPopulatedStudent<T> = Omit<T, 'studentId'> & {
  studentId: string | PopulatedStudent;
};

type RowSubmission =
  | WithPopulatedStudent<QuizSubmission>
  | WithPopulatedStudent<ExerciseSubmission>
  | WithPopulatedStudent<ReadingSubmission>;

interface Props {
  submission: RowSubmission;
  homeworkVersion: number;
  onRegrade: (submissionId: string) => Promise<StructuredHomeworkSubmission | null>;
}

export function HomeworkSubmissionRow({ submission, homeworkVersion, onRegrade }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const studentName = (() => {
    if (typeof submission.studentId === 'string') return '(student)';
    const u = submission.studentId.user;
    return `${u?.firstName ?? ''} ${u?.lastName ?? ''}`.trim() || '(unnamed)';
  })();

  const isStale = submission.homeworkVersion < homeworkVersion;
  const variant =
    submission.gradingStatus === 'graded'
      ? 'default'
      : submission.gradingStatus === 'failed'
      ? 'destructive'
      : 'secondary';

  const handleRegrade = async (): Promise<void> => {
    setSubmitting(true);
    try {
      await onRegrade(submission._id);
    } finally {
      setSubmitting(false);
    }
  };

  const answers: GradedAnswerBase[] =
    submission.type === 'reading'
      ? submission.comprehensionAnswers
      : submission.answers;

  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <span className="text-sm font-medium truncate">{studentName}</span>
            <Badge variant={variant} className="capitalize shrink-0">
              {submission.gradingStatus}
            </Badge>
            {isStale && (
              <Badge variant="outline" className="shrink-0">
                stale
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm">
              {submission.mark ?? '-'} / {submission.maxMarks}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? 'Hide' : 'View'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleRegrade()}
              disabled={submitting}
            >
              Re-grade
            </Button>
          </div>
        </div>

        {expanded && (
          <div className="mt-3 space-y-2">
            {answers.map((a, i) => (
              <div key={i} className="rounded border p-2 text-sm space-y-1">
                <p className="font-medium break-words">{a.questionSnapshot}</p>
                <p className="text-muted-foreground">
                  Student:{' '}
                  <span className="break-words">
                    {a.studentAnswer || '(blank)'}
                  </span>
                </p>
                <p>
                  Awarded: {a.awarded ?? '-'} / {a.maxMarks}{' '}
                  <span className="text-xs text-muted-foreground capitalize">
                    ({a.gradingMethod})
                  </span>
                </p>
                {a.rationale && (
                  <details className="text-xs text-muted-foreground">
                    <summary className="cursor-pointer hover:text-foreground">
                      AI rationale
                    </summary>
                    <p className="whitespace-pre-wrap mt-1 pl-2 border-l-2 border-muted">
                      {a.rationale}
                    </p>
                  </details>
                )}
              </div>
            ))}
            {submission.lateMarkAdjustment && (
              <p className="text-xs text-muted-foreground">
                Late penalty: {submission.lateMarkAdjustment.rawMark} →{' '}
                {submission.lateMarkAdjustment.finalMark} (
                {submission.lateMarkAdjustment.penaltyPercent}%)
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
