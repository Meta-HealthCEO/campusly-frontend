'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { BookOpen, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useStudentHomeworkList } from '@/hooks/useStudentHomework';
import Link from 'next/link';

const statusConfig: Record<
  string,
  {
    label: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
    icon: typeof CheckCircle;
  }
> = {
  submitted: { label: 'Submitted', variant: 'secondary', icon: CheckCircle },
  graded: { label: 'Graded', variant: 'default', icon: CheckCircle },
  pending: { label: 'Pending', variant: 'outline', icon: Clock },
  overdue: { label: 'Overdue', variant: 'destructive', icon: AlertTriangle },
};

export default function StudentHomeworkPage() {
  const { homeworkList, submissions, loading } = useStudentHomeworkList();

  if (loading) return <LoadingSpinner />;

  function getHomeworkStatus(
    homeworkId: string
  ): 'submitted' | 'graded' | 'pending' | 'overdue' {
    const submission = submissions.find((s) => {
      const subHwId =
        typeof s.homeworkId === 'string'
          ? s.homeworkId
          : (s.homeworkId as unknown as { _id?: string })?._id ?? s.homeworkId;
      return subHwId === homeworkId;
    });

    if (submission) {
      return submission.grade !== undefined && submission.grade !== null
        ? 'graded'
        : 'submitted';
    }

    const homework = homeworkList.find((h) => h._id === homeworkId);
    if (homework && new Date(homework.dueDate) < new Date()) {
      return 'overdue';
    }
    return 'pending';
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Homework"
        description="View and submit your homework assignments"
      />

      {homeworkList.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No Homework"
          description="You have no homework assignments at the moment."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {homeworkList.map((hw) => {
            const status = getHomeworkStatus(hw._id);
            const config = statusConfig[status];
            const StatusIcon = config.icon;

            return (
              <Link key={hw._id} href={`/student/homework/${hw._id}`}>
                <Card className="h-full transition-colors hover:bg-muted/50">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h3 className="font-semibold text-sm leading-tight">
                          {hw.title}
                        </h3>
                        {/* TODO: lookup subject name via useSubjects(hw.subjectId) */}
                      </div>
                      <Badge variant={config.variant}>
                        <StatusIcon className="mr-1 h-3 w-3" />
                        {config.label}
                      </Badge>
                    </div>

                    <Badge variant="outline" className="w-fit capitalize">
                      {hw.type}
                    </Badge>

                    <div className="flex items-center justify-between border-t pt-3">
                      <span className="text-xs text-muted-foreground capitalize">
                        {hw.type} assignment
                      </span>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Due {formatDate(hw.dueDate)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
