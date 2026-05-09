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
import { useParentHomeworkChild } from '@/hooks/useParentHomeworkChild';
import { ReadOnlySubmissionView } from '@/components/homework/ReadOnlySubmissionView';
import { formatDate } from '@/lib/utils';

export default function ParentHomeworkDetailPage() {
  const params = useParams();
  const search = useSearchParams();
  const homeworkId = params.id as string;
  const studentId = search.get('studentId');
  const { homework, submission, loading } = useParentHomeworkChild(homeworkId, studentId);

  if (loading) return <LoadingSpinner />;

  if (!homework) {
    return (
      <EmptyState
        icon={BookOpen}
        title="Homework Not Found"
        description="The homework assignment does not exist or you don't have access."
        action={
          <Link href="/parent/homework">
            <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/parent/homework"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />Back to Homework
      </Link>

      <PageHeader title={homework.title} description="" />

      <Card>
        <CardHeader>
          <CardTitle className="text-xl truncate">{homework.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Due:</span>
            <span>{formatDate(homework.dueDate)}</span>
          </div>
          <Badge variant="outline" className="capitalize">{homework.type}</Badge>
        </CardContent>
      </Card>

      {submission ? (
        <ReadOnlySubmissionView submission={submission} />
      ) : (
        <EmptyState
          icon={BookOpen}
          title="Not yet submitted"
          description="Your child has not submitted this homework yet."
        />
      )}
    </div>
  );
}
