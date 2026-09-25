'use client';

import { useMemo } from 'react';
import { ClipboardList } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { ListSkeleton } from '@/components/shared/skeletons';
import { EmptyState } from '@/components/shared/EmptyState';
import { HomeworkSection } from '@/components/student/HomeworkSection';
import { LearnerWorkList } from '@/components/student/LearnerWorkList';
import { useStudentHomeworkList } from '@/hooks/useStudentHomework';
import { useStudentAssignments } from '@/hooks/useStudentAssignments';
import { useIsStandaloneLearner } from '@/hooks/useIsStandaloneLearner';
import { learnerCopy } from '@/lib/learner-copy';
import { mergeLearnerWork } from '@/lib/learner-work';

export default function StudentHomeworkPage() {
  const isStandaloneLearner = useIsStandaloneLearner();
  const { grouped, loading, items } = useStudentHomeworkList();
  const { items: projects, loading: projectsLoading } = useStudentAssignments(isStandaloneLearner);
  const copy = learnerCopy(isStandaloneLearner);
  const now = useMemo(() => new Date(), []);
  const work = useMemo(() => mergeLearnerWork(items, projects, now), [items, projects, now]);

  if (loading || projectsLoading) return <ListSkeleton rows={5} />;
  const header = <PageHeader title="Homework" description={copy.homeworkDescription} />;
  if (items.length === 0 && projects.length === 0) {
    return (
      <div className="space-y-6">
        {header}
        <EmptyState icon={ClipboardList} title="No homework yet" description="When your teacher sets homework or a project, it appears here." />
      </div>
    );
  }
  if (isStandaloneLearner) {
    return (
      <div className="space-y-6">
        {header}
        <LearnerWorkList todo={work.todo} done={work.done} now={now} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {header}
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
