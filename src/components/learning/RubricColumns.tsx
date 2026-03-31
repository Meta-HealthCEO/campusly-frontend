'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import type { ColumnDef } from '@/components/shared/DataTable';
import type { Rubric } from './types';
import { getPopulatedName, getTeacherName } from './types';

export function getRubricColumns(
  onEdit: (rubric: Rubric) => void,
  onDelete: (id: string) => void
): ColumnDef<Rubric>[] {
  return [
    {
      accessorKey: 'name',
      header: 'Rubric Name',
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      id: 'subject',
      header: 'Subject',
      cell: ({ row }) => getPopulatedName(row.original.subjectId) || 'Cross-subject',
    },
    {
      id: 'criteria',
      header: 'Criteria',
      cell: ({ row }) => row.original.criteria?.length ?? 0,
    },
    {
      id: 'levels',
      header: 'Max Levels',
      cell: ({ row }) => {
        const maxLevels = Math.max(
          ...(row.original.criteria?.map((c) => c.levels?.length ?? 0) ?? [0])
        );
        return maxLevels;
      },
    },
    {
      id: 'totalPoints',
      header: 'Total Points',
      cell: ({ row }) => row.original.totalPoints,
    },
    {
      id: 'reusable',
      header: 'Reusable',
      cell: ({ row }) => (
        <Badge variant="secondary" className={row.original.reusable ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}>
          {row.original.reusable ? 'Yes' : 'No'}
        </Badge>
      ),
    },
    {
      id: 'createdBy',
      header: 'Created By',
      cell: ({ row }) => getTeacherName(row.original.teacherId),
    },
    {
      id: 'createdDate',
      header: 'Created',
      cell: ({ row }) => formatDate(row.original.createdAt),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button size="xs" variant="outline" onClick={() => onEdit(row.original)}>Edit</Button>
          <Button size="xs" variant="outline" className="text-destructive" onClick={() => onDelete(row.original.id)}>Delete</Button>
        </div>
      ),
    },
  ];
}
