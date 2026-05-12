'use client';

import { ClipboardList } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { HomeworkSection } from '@/components/student/HomeworkSection';
import { useStudentHomeworkList } from '@/hooks/useStudentHomework';

export default function StudentHomeworkPage() {
  const { grouped, loading, items } = useStudentHomeworkList();

  if (loading) return <LoadingSpinner />;

  if (items.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Homework" description="Track and submit your assignments." />
        <EmptyState
          icon={ClipboardList}
          title="No homework"
          description="You don't have any homework right now."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Homework" description="Track and submit your assignments." />
      <HomeworkSection
        title="Overdue"
        items={grouped.overdue}
        variant="destructive"
        defaultOpen
      />
      <HomeworkSection
        title="Due this week"
        items={grouped.dueThisWeek}
        defaultOpen
      />
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
  );
}
