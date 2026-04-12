'use client';

import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/DataTable';
import type { CourseAnalytics } from '@/types';

type ClassRow = CourseAnalytics['perClassBreakdown'][number];

interface ClassBreakdownTableProps {
  data: ClassRow[];
}

export function ClassBreakdownTable({ data }: ClassBreakdownTableProps) {
  const columns = useMemo<ColumnDef<ClassRow, unknown>[]>(
    () => [
      {
        accessorKey: 'className',
        header: 'Class',
        cell: ({ row }) => (
          <span className="font-medium truncate block max-w-40">
            {row.original.className}
          </span>
        ),
      },
      {
        accessorKey: 'enroled',
        header: 'Enroled',
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.enroled}</span>
        ),
      },
      {
        accessorKey: 'completed',
        header: 'Completed',
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.completed}</span>
        ),
      },
      {
        id: 'completionPct',
        header: 'Completion %',
        cell: ({ row }) => {
          const { enroled, completed } = row.original;
          if (enroled === 0) {
            return <span className="text-muted-foreground">—</span>;
          }
          const pct = Math.round((completed / enroled) * 100);
          return (
            <div className="space-y-1 min-w-20">
              <span className="text-sm tabular-nums">{pct}%</span>
              <div className="h-1.5 w-full rounded-full bg-muted">
                <div
                  className="h-1.5 rounded-full bg-primary"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        },
      },
    ],
    [],
  );

  return <DataTable columns={columns} data={data} />;
}
