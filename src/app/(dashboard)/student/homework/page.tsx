'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { BookOpen, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { mockHomework, mockSubmissions, mockStudents } from '@/lib/mock-data';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';

const currentStudent = mockStudents[0];

function getHomeworkStatus(homeworkId: string): 'submitted' | 'graded' | 'pending' | 'overdue' {
  const submission = mockSubmissions.find(
    (s) => s.homeworkId === homeworkId && s.studentId === currentStudent.id
  );
  if (submission) {
    return submission.status === 'graded' ? 'graded' : 'submitted';
  }
  const homework = mockHomework.find((h) => h.id === homeworkId);
  if (homework && new Date(homework.dueDate) < new Date()) {
    return 'overdue';
  }
  return 'pending';
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof CheckCircle }> = {
  submitted: { label: 'Submitted', variant: 'secondary', icon: CheckCircle },
  graded: { label: 'Graded', variant: 'default', icon: CheckCircle },
  pending: { label: 'Pending', variant: 'outline', icon: Clock },
  overdue: { label: 'Overdue', variant: 'destructive', icon: AlertTriangle },
};

export default function StudentHomeworkPage() {
  const publishedHomework = mockHomework.filter((hw) => hw.status === 'published');

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Homework"
        description="View and submit your homework assignments"
      />

      {publishedHomework.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No Homework"
          description="You have no homework assignments at the moment."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {publishedHomework.map((hw) => {
            const status = getHomeworkStatus(hw.id);
            const config = statusConfig[status];
            const StatusIcon = config.icon;

            return (
              <Link key={hw.id} href={`/student/homework/${hw.id}`}>
                <Card className="h-full transition-colors hover:bg-muted/50">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h3 className="font-semibold text-sm leading-tight">
                          {hw.title}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {hw.subject.name}
                        </p>
                      </div>
                      <Badge variant={config.variant}>
                        <StatusIcon className="mr-1 h-3 w-3" />
                        {config.label}
                      </Badge>
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {hw.description}
                    </p>

                    <div className="flex items-center justify-between border-t pt-3">
                      <span className="text-xs text-muted-foreground">
                        {hw.teacher.user.firstName} {hw.teacher.user.lastName}
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
