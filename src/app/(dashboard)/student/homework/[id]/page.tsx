'use client';

import { useParams } from 'next/navigation';
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

export default function StudentHomeworkDetailPage() {
  const params = useParams();
  const homeworkId = params.id as string;
  const { homework, submission, loading, submitHomework } = useStudentHomeworkDetail(homeworkId);

  if (loading) return <LoadingSpinner />;
  if (!homework) {
    return (
      <EmptyState
        icon={BookOpen}
        title="Homework Not Found"
        description="The homework assignment does not exist."
        action={
          <Link href="/student/homework">
            <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
          </Link>
        }
      />
    );
  }

  const isOverdue = new Date(homework.dueDate) < new Date();
  const hasSubmission = !!submission;

  return (
    <div className="space-y-6">
      <Link
        href="/student/homework"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />Back to Homework
      </Link>

      <PageHeader title={homework.title} description="" />

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-xl truncate">{homework.title}</CardTitle>
            <Badge
              variant={hasSubmission ? 'default' : isOverdue ? 'destructive' : 'outline'}
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
            <span>{formatDate(homework.dueDate)}</span>
          </div>
        </CardContent>
      </Card>

      {homework.type === 'quiz' && (
        <QuizSubmissionForm homework={homework} submission={submission} onSubmit={submitHomework} />
      )}
      {homework.type === 'exercise' && (
        <p className="text-sm text-muted-foreground">Exercise form — Task 18</p>
      )}
      {homework.type === 'reading' && (
        <p className="text-sm text-muted-foreground">Reading form — Task 19</p>
      )}
    </div>
  );
}
