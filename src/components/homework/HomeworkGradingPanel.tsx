'use client';

import { Inbox } from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { useTeacherHomeworkSubmissions } from '@/hooks/useTeacherHomeworkSubmissions';
import { HomeworkSubmissionRow } from './HomeworkSubmissionRow';
import type { Homework } from '@/types/homework';
import type {
  QuizSubmission,
  ExerciseSubmission,
  ReadingSubmission,
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
  homework: Homework;
}

export function HomeworkGradingPanel({ homework }: Props) {
  const { submissions, loading, regradeSubmission } =
    useTeacherHomeworkSubmissions(homework._id);

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

  return (
    <div className="space-y-2">
      {submissions.map((s) => (
        <HomeworkSubmissionRow
          key={s._id}
          submission={s as RowSubmission}
          homeworkVersion={homework.version}
          onRegrade={regradeSubmission}
        />
      ))}
    </div>
  );
}
