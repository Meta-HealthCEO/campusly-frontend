'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { StructuredHomeworkSubmission } from '@/types/homework';

interface Props {
  submission: StructuredHomeworkSubmission;
}

export function ReadOnlySubmissionView({ submission }: Props) {
  const answers =
    submission.type === 'reading'
      ? submission.comprehensionAnswers
      : submission.answers;

  const variant =
    submission.gradingStatus === 'graded'
      ? 'default'
      : submission.gradingStatus === 'failed'
      ? 'destructive'
      : 'secondary';

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={variant} className="capitalize">{submission.gradingStatus}</Badge>
        <span className="text-sm">
          {submission.mark ?? '-'} / {submission.maxMarks}
        </span>
        {submission.isLate && <Badge variant="outline">Late</Badge>}
      </div>

      {answers.map((a, i) => (
        <Card key={i}>
          <CardContent className="p-3 space-y-1 text-sm">
            <p className="font-medium break-words">Q{i + 1}. {a.questionSnapshot}</p>
            <p className="text-muted-foreground">
              Answer: <span className="break-words">{a.studentAnswer || '(blank)'}</span>
            </p>
            <p>
              Awarded: {a.awarded ?? '-'} / {a.maxMarks}{' '}
              <span className="text-xs text-muted-foreground capitalize">({a.gradingMethod})</span>
            </p>
            {a.rationale && (
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer hover:text-foreground">AI rationale</summary>
                <p className="whitespace-pre-wrap mt-1 pl-2 border-l-2 border-muted">{a.rationale}</p>
              </details>
            )}
          </CardContent>
        </Card>
      ))}

      {submission.feedback && (
        <Card>
          <CardContent className="p-3 text-sm">
            <p className="font-medium">Teacher feedback</p>
            <p className="text-muted-foreground whitespace-pre-wrap">{submission.feedback}</p>
          </CardContent>
        </Card>
      )}

      {submission.lateMarkAdjustment && (
        <p className="text-xs text-muted-foreground">
          Late penalty applied: {submission.lateMarkAdjustment.rawMark} → {submission.lateMarkAdjustment.finalMark}{' '}
          ({submission.lateMarkAdjustment.penaltyPercent}%)
        </p>
      )}
    </div>
  );
}
