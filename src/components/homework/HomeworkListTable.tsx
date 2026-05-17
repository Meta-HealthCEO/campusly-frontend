'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { formatDate } from '@/lib/utils';
import { ExternalLink } from 'lucide-react';
import type { Homework, SchoolClass } from '@/types';
import type { SubmissionCounts } from '@/hooks/useTeacherHomework';

const TYPE_LABEL: Record<Homework['type'], string> = {
  quiz: 'Quiz',
  reading: 'Reading',
  exercise: 'Exercise',
};

interface Props {
  items: Homework[];
  classes: SchoolClass[];
  submissionCounts: Record<string, SubmissionCounts>;
}

export function HomeworkListTable({ items, classes, submissionCounts }: Props) {
  const router = useRouter();

  const classNameById = useMemo(
    () => new Map(classes.map((c) => [c.id, c.name])),
    [classes],
  );

  const columns: ColumnDef<Homework>[] = [
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => (
        <span className="font-medium text-primary line-clamp-2 max-w-sm">
          {row.original.title}
        </span>
      ),
    },
    {
      id: 'type',
      header: 'Type',
      cell: ({ row }) => (
        <Badge variant="outline" className="capitalize">
          {TYPE_LABEL[row.original.type]}
        </Badge>
      ),
    },
    {
      id: 'class',
      header: 'Class',
      cell: ({ row }) => {
        const name = classNameById.get(row.original.classId) ?? '—';
        return <span className="truncate block max-w-40">{name}</span>;
      },
    },
    {
      id: 'dueDate',
      header: 'Due',
      cell: ({ row }) => {
        const hw = row.original;
        const overdue = new Date(hw.dueDate) < new Date() && hw.status === 'assigned';
        return (
          <span
            className={`whitespace-nowrap text-sm ${
              overdue ? 'text-destructive font-medium' : ''
            }`}
          >
            {formatDate(hw.dueDate)}
          </span>
        );
      },
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge
          variant={row.original.status === 'assigned' ? 'default' : 'outline'}
          className="capitalize"
        >
          {row.original.status}
        </Badge>
      ),
    },
    {
      id: 'submissions',
      header: 'Submissions',
      cell: ({ row }) => {
        const counts = submissionCounts[row.original._id];
        if (!counts) return <span className="text-xs text-muted-foreground">—</span>;
        return (
          <span className="text-sm whitespace-nowrap">
            <span className="font-medium">{counts.graded}</span>
            <span className="text-muted-foreground"> / {counts.total} graded</span>
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Link href={`/teacher/homework/${row.original._id}`}>
            <Button variant="ghost" size="sm" aria-label="Open homework">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={items}
      onRowClick={(hw) => router.push(`/teacher/homework/${hw._id}`)}
    />
  );
}
