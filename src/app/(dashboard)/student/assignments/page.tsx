'use client';

import Link from 'next/link';
import { ScrollText, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useStudentAssignments } from '@/hooks/useStudentAssignments';
import type { StudentAssignmentItem } from '@/types/assignments';

function formatDue(iso: string | null): string {
  if (!iso) return 'No due date';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'No due date';
  return `Due ${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

function statusOf(item: StudentAssignmentItem): {
  label: string;
  variant: 'default' | 'secondary' | 'outline' | 'destructive';
  icon: typeof CheckCircle2;
} {
  if (item.submission?.status === 'published') {
    return { label: 'Published', variant: 'default', icon: CheckCircle2 };
  }
  if (item.submission?.status === 'marked') {
    return { label: 'Marked', variant: 'default', icon: CheckCircle2 };
  }
  if (item.submission) {
    return { label: 'Submitted', variant: 'secondary', icon: CheckCircle2 };
  }
  const dueAt = item.classAssignment?.dueAt;
  if (dueAt && new Date(dueAt) < new Date()) {
    return { label: 'Overdue', variant: 'destructive', icon: AlertTriangle };
  }
  return { label: 'Pending', variant: 'outline', icon: Clock };
}

export default function StudentAssignmentsPage() {
  const { items, loading } = useStudentAssignments();

  if (loading) return <LoadingSpinner />;

  if (items.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Assignments" description="Long-form tasks and projects from your teachers." />
        <EmptyState
          icon={ScrollText}
          title="No assignments"
          description="Nothing to work on right now. Check back later."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assignments"
        description="Long-form tasks and projects from your teachers. Click into one to read the brief and submit your work."
      />

      <div className="grid gap-3">
        {items.map((item) => {
          const s = statusOf(item);
          const Icon = s.icon;
          const subjectName = typeof item.subjectId === 'object' ? item.subjectId.name : '';
          return (
            <Link key={item._id} href={`/student/assignments/${item._id}`}>
              <Card className="transition-colors hover:border-primary/50 cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="font-medium truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {subjectName} · {item.totalMarks} marks · {formatDue(item.classAssignment?.dueAt ?? null)}
                      </p>
                    </div>
                    <Badge variant={s.variant} className="shrink-0">
                      <Icon className="mr-1 h-3 w-3" /> {s.label}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
