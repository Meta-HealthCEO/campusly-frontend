'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Plus, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { ListSkeleton } from '@/components/shared/skeletons';
import { EmptyState } from '@/components/shared/EmptyState';
import { useTeacherHomework } from '@/hooks/useTeacherHomework';
import { useTeacherClasses } from '@/hooks/useTeacherClasses';
import {
  HomeworkListFilters,
  type HomeworkListFilterState,
} from '@/components/homework/HomeworkListFilters';
import { HomeworkListRow } from '@/components/homework/HomeworkListRow';

export default function TeacherHomeworkListPage() {
  const { teacherHomework, loading } = useTeacherHomework();

  const { classes } = useTeacherClasses();

  const [filters, setFilters] = useState<HomeworkListFilterState>({
    search: '',
    type: 'all',
    classId: 'all',
    status: 'all',
  });

  const filtered = useMemo(() => {
    return teacherHomework.filter((hw) => {
      if (
        filters.search &&
        !hw.title.toLowerCase().includes(filters.search.toLowerCase())
      )
        return false;

      if (filters.type !== 'all' && hw.type !== filters.type) return false;

      if (filters.classId !== 'all') {
        const classIdStr =
          typeof hw.classId === 'string'
            ? hw.classId
            : (hw.classId as { _id?: string })?._id ?? '';
        if (classIdStr !== filters.classId) return false;
      }

      if (filters.status !== 'all' && hw.status !== filters.status) return false;

      return true;
    });
  }, [teacherHomework, filters]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Homework"
        description="Assign and track structured homework"
      >
        <Link href="/teacher/homework/new">
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            New Homework
          </Button>
        </Link>
      </PageHeader>

      <HomeworkListFilters
        value={filters}
        onChange={setFilters}
        classes={classes}
      />

      {loading && <ListSkeleton rows={5} />}

      {!loading && filtered.length === 0 && (
        <EmptyState
          icon={BookOpen}
          title="No homework yet"
          description="Create your first homework with the New Homework button above."
        />
      )}

      {!loading && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((hw) => (
            <HomeworkListRow key={hw._id} homework={hw} />
          ))}
        </div>
      )}

    </div>
  );
}
