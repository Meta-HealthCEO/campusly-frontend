'use client';

import { useState, Fragment } from 'react';
import { ChevronDown, ChevronRight, Inbox, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { useTeacherHomeworkSubmissions } from '@/hooks/useTeacherHomeworkSubmissions';
import type {
  Homework,
  QuizSubmission,
  ExerciseSubmission,
  ReadingSubmission,
  StructuredHomeworkSubmission,
  GradedAnswerBase,
} from '@/types/homework';

interface PopulatedStudent {
  _id: string;
  user?: { firstName: string; lastName: string };
  userId?: { firstName: string; lastName: string };
}

type WithPopulatedStudent<T> = Omit<T, 'studentId'> & {
  studentId: string | PopulatedStudent;
};

type RowSubmission =
  | WithPopulatedStudent<QuizSubmission>
  | WithPopulatedStudent<ExerciseSubmission>
  | WithPopulatedStudent<ReadingSubmission>;

interface Props {
  homework: Homework;
}

function resolveStudentName(submission: RowSubmission): string {
  if (typeof submission.studentId === 'string') return '(student)';
  const u = submission.studentId.user ?? submission.studentId.userId;
  return `${u?.firstName ?? ''} ${u?.lastName ?? ''}`.trim() || '(unnamed)';
}

function statusVariant(
  status: RowSubmission['gradingStatus'],
): 'default' | 'destructive' | 'secondary' {
  if (status === 'graded') return 'default';
  if (status === 'failed') return 'destructive';
  return 'secondary';
}

export function HomeworkSubmissionsTable({ homework }: Props) {
  const { submissions, loading, regradeSubmission } =
    useTeacherHomeworkSubmissions(homework._id);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [regrading, setRegrading] = useState<string | null>(null);

  if (loading) return <LoadingSpinner />;

  if (submissions.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="No submissions yet"
        description="Students haven't submitted this homework yet."
      />
    );
  }

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleRegrade = async (
    e: React.MouseEvent,
    submissionId: string,
  ): Promise<void> => {
    e.stopPropagation();
    setRegrading(submissionId);
    try {
      await regradeSubmission(submissionId);
    } finally {
      setRegrading(null);
    }
  };

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8" />
            <TableHead>Student</TableHead>
            <TableHead>Grading</TableHead>
            <TableHead className="text-right">Mark</TableHead>
            <TableHead className="w-px" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {(submissions as RowSubmission[]).map((s) => {
            const isOpen = expanded.has(s._id);
            const isStale = s.homeworkVersion < homework.version;
            const answers: GradedAnswerBase[] =
              s.type === 'reading' ? s.comprehensionAnswers : s.answers;
            return (
              <Fragment key={s._id}>
                <TableRow
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => toggle(s._id)}
                >
                  <TableCell>
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{resolveStudentName(s)}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant={statusVariant(s.gradingStatus)} className="capitalize">
                        {s.gradingStatus}
                      </Badge>
                      {isStale && (
                        <Badge variant="outline" className="text-[10px]">
                          stale
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <span className="font-medium">{s.mark ?? '—'}</span>
                    <span className="text-muted-foreground"> / {s.maxMarks}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => void handleRegrade(e, s._id)}
                      disabled={regrading === s._id}
                      aria-label="Re-grade submission"
                    >
                      <RefreshCw
                        className={`h-3.5 w-3.5 ${regrading === s._id ? 'animate-spin' : ''}`}
                      />
                    </Button>
                  </TableCell>
                </TableRow>
                {isOpen && (
                  <TableRow className="bg-muted/20">
                    <TableCell colSpan={5} className="p-0">
                      <SubmissionDetails
                        answers={answers}
                        lateMarkAdjustment={s.lateMarkAdjustment}
                      />
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function SubmissionDetails({
  answers,
  lateMarkAdjustment,
}: {
  answers: GradedAnswerBase[];
  lateMarkAdjustment?: StructuredHomeworkSubmission['lateMarkAdjustment'];
}) {
  return (
    <div className="p-4 space-y-2">
      {answers.map((a, i) => (
        <div key={i} className="rounded border bg-card p-3 text-sm space-y-1">
          <p className="font-medium break-words">{a.questionSnapshot}</p>
          <p className="text-muted-foreground">
            Student:{' '}
            <span className="break-words text-foreground">
              {a.studentAnswer || '(blank)'}
            </span>
          </p>
          <p>
            Awarded: {a.awarded ?? '—'} / {a.maxMarks}{' '}
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
      {lateMarkAdjustment && (
        <p className="text-xs text-muted-foreground">
          Late penalty: {lateMarkAdjustment.rawMark} →{' '}
          {lateMarkAdjustment.finalMark} ({lateMarkAdjustment.penaltyPercent}%)
        </p>
      )}
    </div>
  );
}
