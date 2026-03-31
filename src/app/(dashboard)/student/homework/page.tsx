'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { BookOpen, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import apiClient from '@/lib/api-client';
import { useAuthStore } from '@/stores/useAuthStore';
import type { Homework, HomeworkSubmission } from '@/types';
import Link from 'next/link';

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof CheckCircle }> = {
  submitted: { label: 'Submitted', variant: 'secondary', icon: CheckCircle },
  graded: { label: 'Graded', variant: 'default', icon: CheckCircle },
  pending: { label: 'Pending', variant: 'outline', icon: Clock },
  overdue: { label: 'Overdue', variant: 'destructive', icon: AlertTriangle },
};

export default function StudentHomeworkPage() {
  const { user } = useAuthStore();
  const [homeworkList, setHomeworkList] = useState<Homework[]>([]);
  const [submissions, setSubmissions] = useState<HomeworkSubmission[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        // Find current student
        const studentsRes = await apiClient.get('/students');
        const studentsData = studentsRes.data.data ?? studentsRes.data;
        const studentsList = Array.isArray(studentsData) ? studentsData : studentsData.data ?? [];
        const me = studentsList.find((s: any) => s.userId === user?.id || s.user?._id === user?.id || s.user?.id === user?.id);

        const [hwRes, subRes] = await Promise.allSettled([
          apiClient.get('/homework'),
          me ? apiClient.get(`/homework/student/${me.id ?? me._id}/submissions`) : Promise.reject('no student'),
        ]);

        if (hwRes.status === 'fulfilled' && hwRes.value.data) {
          const d = hwRes.value.data.data ?? hwRes.value.data;
          const arr = Array.isArray(d) ? d : d.data ?? [];
          setHomeworkList(arr.filter((hw: any) => hw.status === 'published'));
        }
        if (subRes.status === 'fulfilled' && subRes.value.data) {
          const d = subRes.value.data.data ?? subRes.value.data;
          setSubmissions(Array.isArray(d) ? d : d.data ?? []);
        }
      } catch {
        console.error('Failed to load homework');
      }
    }
    if (user?.id) fetchData();
  }, [user?.id]);

  function getHomeworkStatus(homeworkId: string): 'submitted' | 'graded' | 'pending' | 'overdue' {
    const submission = submissions.find((s: any) => s.homeworkId === homeworkId);
    if (submission) {
      return (submission as any).status === 'graded' ? 'graded' : 'submitted';
    }
    const homework = homeworkList.find((h) => h.id === homeworkId);
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
                          {hw.subject?.name ?? (hw as any).subjectName ?? ''}
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
                        {hw.teacher?.user?.firstName ?? (hw as any).teacherName ?? ''} {hw.teacher?.user?.lastName ?? ''}
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
