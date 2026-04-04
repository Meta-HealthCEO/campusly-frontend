'use client';

import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { PageHeader } from '@/components/shared/PageHeader';
import {
  BookOpen,
  ArrowLeft,
  Calendar,
  Users,
  CheckCircle,
  Paperclip,
  ExternalLink,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { GradingInterface } from '@/components/homework/GradingInterface';
import { useTeacherHomeworkDetail } from '@/hooks/useTeacherHomeworkDetail';
import Link from 'next/link';

export default function TeacherHomeworkDetailPage() {
  const params = useParams();
  const homeworkId = params.id as string;

  const { homework, submissions, loading, changeStatus, gradeSubmission, handleGraded } =
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

  const gradedCount = submissions.filter(
    (s) => s.mark !== null && s.mark !== undefined
  ).length;

  return (
    <div className="space-y-6">
      <Link
        href="/teacher/homework"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Homework
      </Link>

      <PageHeader
        title={homework.title}
        description={homework.subjectName}
      />

      <Card>
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold">{homework.title}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {homework.subjectName}
                {homework.className ? ` - ${homework.className}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={homework.status === 'assigned' ? 'default' : 'secondary'}
              >
                {homework.status}
              </Badge>
              {homework.status === 'assigned' ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => changeStatus('closed')}
                >
                  Close
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => changeStatus('assigned')}
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
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {submissions.length} submissions
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle className="h-4 w-4" />
              {gradedCount} graded
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
              <p className="text-xs font-medium text-muted-foreground">Attachments</p>
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
          <CardTitle className="text-lg">
            Submissions ({submissions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {submissions.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No submissions yet.
            </p>
          ) : (
            <div className="space-y-4">
              {submissions.map((submission) => (
                <GradingInterface
                  key={submission.id}
                  submission={submission}
                  totalMarks={homework.totalMarks}
                  onGraded={handleGraded}
                  onGradeSubmission={gradeSubmission}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
