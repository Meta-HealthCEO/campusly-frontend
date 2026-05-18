'use client';

import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { PageHeader } from '@/components/shared/PageHeader';
import { BookOpen, Calendar, ArrowLeft } from 'lucide-react';
import { useStudentHomeworkDetail } from '@/hooks/useStudentHomework';
import { formatDate } from '@/lib/utils';
import { QuizSubmissionForm } from '@/components/homework/QuizSubmissionForm';
import { ExerciseSubmissionForm } from '@/components/homework/ExerciseSubmissionForm';
import { ReadingSubmissionForm } from '@/components/homework/ReadingSubmissionForm';
import { AskAuraDrawer } from '@/components/ai-tutor/AskAuraDrawer';

export default function StudentHomeworkDetailPage() {
  const params = useParams();
  const homeworkId = params.id as string;
  const searchParams = useSearchParams();
  const fromParam = searchParams.get('from');
  const fromLessonId = fromParam?.startsWith('lesson:') ? fromParam.slice(7) : null;
  const backHref = fromLessonId ? `/student/lessons/${fromLessonId}` : '/student/homework';
  const backLabel = fromLessonId ? 'Back to lesson' : 'Back to Homework';
  const { detail, submission, loading, submitHomework } =
    useStudentHomeworkDetail(homeworkId);

  if (loading) return <LoadingSpinner />;
  if (!detail) {
    return (
      <EmptyState
        icon={BookOpen}
        title="Homework Not Found"
        description="The homework assignment does not exist."
        action={
          <Link href={backHref}>
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {backLabel}
            </Button>
          </Link>
        }
      />
    );
  }

  const { homework } = detail;
  const isOverdue = detail.status === 'overdue';
  const hasSubmission = !!submission;

  return (
    <div className="space-y-6">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
      </Link>

      <PageHeader title={detail.title} description="">
        {detail.subjectId && (
          <AskAuraDrawer
            subjectId={detail.subjectId}
            subjectName={detail.subject}
            context={{
              surface: 'homework',
              surfaceId: detail.id,
              title: detail.title,
              isAssessmentActive: detail.status === 'pending' || detail.status === 'overdue',
            }}
          />
        )}
      </PageHeader>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="truncate text-xl">{detail.title}</CardTitle>
            <Badge
              variant={
                hasSubmission ? 'default' : isOverdue ? 'destructive' : 'outline'
              }
              className="shrink-0"
            >
              {hasSubmission ? 'Submitted' : isOverdue ? 'Overdue' : 'Pending'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Due:</span>
            <span>{formatDate(detail.dueAt)}</span>
          </div>
          {detail.sourceLesson && !fromLessonId && (
            <div className="text-sm text-muted-foreground">
              From lesson:{' '}
              <Link
                href={`/student/lessons/${detail.sourceLesson.id}`}
                className="text-primary hover:underline"
              >
                {detail.sourceLesson.title}
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {homework.type === 'quiz' && (
        <QuizSubmissionForm
          homework={homework}
          submission={submission}
          onSubmit={submitHomework}
        />
      )}
      {homework.type === 'exercise' && (
        <ExerciseSubmissionForm
          homework={homework}
          submission={submission}
          onSubmit={submitHomework}
        />
      )}
      {homework.type === 'reading' && (
        <ReadingSubmissionForm
          homework={homework}
          submission={submission}
          onSubmit={submitHomework}
        />
      )}
    </div>
  );
}
