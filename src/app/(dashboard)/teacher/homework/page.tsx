'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Plus, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { sectionEyebrow } from '@/lib/eyebrow';
import { ListSkeleton } from '@/components/shared/skeletons';
import { EmptyState } from '@/components/shared/EmptyState';
import { useTeacherHomework } from '@/hooks/useTeacherHomework';
import { useTeacherClasses } from '@/hooks/useTeacherClasses';
import { useTeacherAssignments } from '@/hooks/useTeacherAssignments';
import { useIsStandalone } from '@/hooks/useIsStandalone';
import {
  HomeworkListFilters,
  type HomeworkListFilterState,
} from '@/components/homework/HomeworkListFilters';
import { HomeworkListTable } from '@/components/homework/HomeworkListTable';
import { filterWorkRows, homeworkRows, mergeWorkList } from '@/lib/work-list';

export default function TeacherHomeworkListPage() {
  const { teacherHomework, submissionCounts, loading, error } = useTeacherHomework();
  const { classes } = useTeacherClasses();
  // Standalone teachers have no Assignments page: their projects list here.
  const isStandalone = useIsStandalone();
  const { assignments, loading: projectsLoading, fetchAssignments } = useTeacherAssignments();
  useEffect(() => {
    if (isStandalone) void fetchAssignments({ limit: 100 });
  }, [isStandalone, fetchAssignments]);

  const [filters, setFilters] = useState<HomeworkListFilterState>({
    search: '',
    type: 'all',
    classId: 'all',
    status: 'all',
  });

  const rows = useMemo(() => {
    const classNames = new Map(classes.map((c) => [c.id, c.name]));
    return isStandalone
      ? mergeWorkList(teacherHomework, assignments, classNames)
      : homeworkRows(teacherHomework, classNames);
  }, [isStandalone, teacherHomework, assignments, classes]);
  const filtered = useMemo(() => filterWorkRows(rows, filters), [rows, filters]);
  const busy = loading || (isStandalone && projectsLoading);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={sectionEyebrow('Assess')}
        title="Homework"
        description={isStandalone ? 'Exercises, readings and projects for your classes' : 'Assign and track structured homework'}
      >
        <Link href="/teacher/homework/new">
          <Button size="sm" className="min-h-11 sm:min-h-9">
            <Plus className="mr-2 h-4 w-4" />
            New Homework
          </Button>
        </Link>
      </PageHeader>

      <HomeworkListFilters
        value={filters}
        onChange={setFilters}
        classes={classes}
        showProjects={isStandalone}
      />

      {busy && <ListSkeleton rows={5} />}

      {!busy && error && (
        <EmptyState
          icon={AlertTriangle}
          title="Failed to load homework"
          description={error}
        />
      )}

      {!busy && !error && filtered.length === 0 && (
        <EmptyState
          icon={BookOpen}
          title="No homework yet"
          description={
            isStandalone
              ? 'Set an exercise, a reading or a project with the New Homework button above.'
              : 'Create your first homework with the New Homework button above.'
          }
        />
      )}

      {!busy && !error && filtered.length > 0 && (
        <HomeworkListTable items={filtered} submissionCounts={submissionCounts} />
      )}

    </div>
  );
}
