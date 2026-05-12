'use client';

import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { BookOpen } from 'lucide-react';
import { useStudentHomeworkList } from '@/hooks/useStudentHomework';
import { HomeworkSection } from '@/components/student/HomeworkSection';

export default function StudentHomeworkPage() {
  const { items, grouped, loading } = useStudentHomeworkList();

  if (loading) return <LoadingSpinner />;

  if (items.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="My Homework"
          description="View and submit your homework assignments"
        />
        <EmptyState
          icon={BookOpen}
          title="No Homework"
          description="You have no homework assignments at the moment."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Homework"
        description="View and submit your homework assignments"
      />

      <div className="space-y-4">
        <HomeworkSection
          title="Overdue"
          items={grouped.overdue}
          variant="destructive"
        />
        <HomeworkSection title="Due this week" items={grouped.dueThisWeek} />
        <HomeworkSection
          title="Submitted"
          items={grouped.submitted}
          defaultOpen={false}
        />
        <HomeworkSection
          title="Graded"
          items={grouped.graded}
          defaultOpen={false}
        />
      </div>
    </div>
  );
}
