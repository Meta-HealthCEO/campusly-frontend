'use client';

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { EmptyState } from '@/components/shared/EmptyState';
import { BookOpen } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import type { ParentHomeworkItem, HomeworkDisplayStatus } from '@/hooks/useParentHomework';
import { getHomeworkDisplayStatus } from '@/hooks/useParentHomework';

const statusStyles: Record<HomeworkDisplayStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  submitted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  graded: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  overdue: 'bg-destructive/10 text-destructive dark:bg-red-900/30 dark:text-destructive',
};

const statusLabels: Record<HomeworkDisplayStatus, string> = {
  pending: 'Pending',
  submitted: 'Submitted',
  graded: 'Graded',
  overdue: 'Overdue',
};

interface ParentHomeworkListProps {
  homework: ParentHomeworkItem[];
}

export function ParentHomeworkList({ homework }: ParentHomeworkListProps) {
  const sorted = useMemo(
    () => [...homework].sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()),
    [homework],
  );

  const columns: ColumnDef<ParentHomeworkItem>[] = useMemo(() => [
    {
      id: 'subject',
      header: 'Subject',
      accessorFn: (row) => row.subjectId?.name ?? '—',
    },
    {
      accessorKey: 'title',
      header: 'Title',
    },
    {
      id: 'dueDate',
      header: 'Due Date',
      cell: ({ row }) => formatDate(row.original.dueDate),
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const s = getHomeworkDisplayStatus(row.original);
        return (
          <Badge className={statusStyles[s]}>{statusLabels[s]}</Badge>
        );
      },
    },
    {
      id: 'mark',
      header: 'Mark',
      cell: ({ row }) => {
        const sub = row.original.submission;
        if (sub?.mark !== undefined && sub.mark !== null) {
          return `${sub.mark} / ${row.original.totalMarks}`;
        }
        return '—';
      },
    },
  ], []);

  if (homework.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        title="No homework assigned"
        description="There is no homework currently assigned for this child."
      />
    );
  }

  return (
    <DataTable
      columns={columns}
      data={sorted}
      searchKey="title"
      searchPlaceholder="Search homework..."
    />
  );
}
