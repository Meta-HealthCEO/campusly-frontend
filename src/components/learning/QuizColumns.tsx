'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import type { ColumnDef } from '@/components/shared/DataTable';
import type { Quiz } from './types';
import { getPopulatedName } from './types';

const statusStyles: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  published: 'bg-emerald-100 text-emerald-800',
  closed: 'bg-slate-100 text-slate-700',
};

export function getQuizColumns(
  onPublish: (id: string) => void,
  onClose: (id: string) => void,
  onDelete: (id: string) => void,
  onViewResults: (id: string) => void
): ColumnDef<Quiz>[] {
  return [
    {
      accessorKey: 'title',
      header: 'Quiz Title',
      cell: ({ row }) => <span className="font-medium">{row.original.title}</span>,
    },
    {
      id: 'subject',
      header: 'Subject',
      cell: ({ row }) => getPopulatedName(row.original.subjectId),
    },
    {
      id: 'class',
      header: 'Class',
      cell: ({ row }) => getPopulatedName(row.original.classId),
    },
    {
      id: 'questions',
      header: 'Questions',
      cell: ({ row }) => row.original.questions?.length ?? 0,
    },
    {
      id: 'time',
      header: 'Time (min)',
      cell: ({ row }) => row.original.timeLimit ?? '—',
    },
    {
      id: 'points',
      header: 'Points',
      cell: ({ row }) => row.original.totalPoints,
    },
    {
      id: 'status',
      header: 'Status',
      accessorKey: 'status',
      cell: ({ row }) => (
        <Badge variant="secondary" className={statusStyles[row.original.status] ?? ''}>
          {row.original.status}
        </Badge>
      ),
    },
    {
      id: 'dueDate',
      header: 'Due',
      cell: ({ row }) => row.original.dueDate ? formatDate(row.original.dueDate) : '—',
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const q = row.original;
        return (
          <div className="flex gap-1">
            {q.status === 'draft' && (
              <Button size="xs" onClick={() => onPublish(q.id)}>Publish</Button>
            )}
            {q.status === 'published' && (
              <>
                <Button size="xs" variant="outline" onClick={() => onViewResults(q.id)}>Results</Button>
                <Button size="xs" variant="outline" onClick={() => onClose(q.id)}>Close</Button>
              </>
            )}
            {q.status === 'closed' && (
              <Button size="xs" variant="outline" onClick={() => onViewResults(q.id)}>Results</Button>
            )}
            <Button size="xs" variant="outline" className="text-destructive" onClick={() => onDelete(q.id)}>
              Delete
            </Button>
          </div>
        );
      },
    },
  ];
}
