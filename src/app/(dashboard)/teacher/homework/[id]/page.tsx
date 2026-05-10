'use client';

import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import {
  BookOpen,
  ArrowLeft,
  Calendar,
  Paperclip,
  ExternalLink,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { HomeworkGradingPanel } from '@/components/homework/HomeworkGradingPanel';
import { ExerciseQuestionsList } from '@/components/homework/ExerciseQuestionsList';
import {
  LinkedQuizSummary,
  LinkedReadingSummary,
} from '@/components/homework/LinkedResourceSummary';
import { useTeacherHomeworkDetail } from '@/hooks/useTeacherHomeworkDetail';
import Link from 'next/link';
import type { Homework } from '@/types/homework';

const TYPE_BADGE_LABEL: Record<'quiz' | 'reading' | 'exercise', string> = {
  quiz: 'Quiz',
  reading: 'Reading',
  exercise: 'Exercise',
};

export default function TeacherHomeworkDetailPage() {
  const params = useParams();
  const homeworkId = params.id as string;

  const { homework, loading, changeStatus } =
    useTeacherHomeworkDetail(homeworkId);

  if (loading) return <LoadingSpinner />;

  if (!homework) {
    return (
      <EmptyState
        icon={BookOpen}
        title="Homework Not Found"
        description="The homework assignment you are looking for does not exist."
        action={
          <Link href="/teacher/homework">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Homework
            </Button>
          </Link>
        }
      />
    );
  }

  // Build a minimal Homework union shape for HomeworkGradingPanel.
  // version and type come from the real API response via useTeacherHomeworkDetail.
  const homeworkForPanel = {
    _id: homework.id,
    version: homework.version,
    title: homework.title,
    status: homework.status as 'assigned' | 'closed',
    type: homework.type,
  } as unknown as Homework;

  return (
    <div className="space-y-6">
      <Link
        href="/teacher/homework"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Homework
      </Link>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight">{homework.title}</h1>
            <Badge variant="outline">{TYPE_BADGE_LABEL[homework.type]}</Badge>
          </div>
          {homework.subjectName && (
            <p className="text-muted-foreground">{homework.subjectName}</p>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-xl font-bold truncate">{homework.title}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {homework.subjectName}
                {homework.className ? ` - ${homework.className}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <Badge
                variant={homework.status === 'assigned' ? 'default' : 'secondary'}
              >
                {homework.status}
              </Badge>
              {homework.status === 'assigned' ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void changeStatus('closed')}
                >
                  Close
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void changeStatus('assigned')}
                >
                  Reopen
                </Button>
              )}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Due: {formatDate(homework.dueDate)}
            </span>
            <span>Total marks: {homework.totalMarks}</span>
          </div>

          <p className="mt-3 text-sm">{homework.description}</p>

          {homework.resourceId && (
            <div className="mt-3">
              <Link
                href="/teacher/curriculum/content"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                View Linked Resource
                {homework.resourceType && (
                  <Badge variant="secondary" className="ml-1">
                    {homework.resourceType.replace('_', ' ')}
                  </Badge>
                )}
              </Link>
            </div>
          )}

          {homework.attachments.length > 0 && (
            <div className="mt-3 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Attachments
              </p>
              {homework.attachments.map((att, i) => (
                <a
                  key={i}
                  href={att}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <Paperclip className="h-3 w-3" />
                  {att.split('/').pop() ?? `Attachment ${i + 1}`}
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Content</CardTitle>
        </CardHeader>
        <CardContent>
          {homework.type === 'exercise' && (
            <ExerciseQuestionsList questions={homework.exerciseQuestions} />
          )}
          {homework.type === 'quiz' && <LinkedQuizSummary quiz={homework.quiz} />}
          {homework.type === 'reading' && (
            <LinkedReadingSummary resource={homework.reading} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          <HomeworkGradingPanel homework={homeworkForPanel} />
        </CardContent>
      </Card>
    </div>
  );
}
