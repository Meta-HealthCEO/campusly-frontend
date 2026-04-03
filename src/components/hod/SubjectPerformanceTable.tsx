'use client';

import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/DataTable';
import { EmptyState } from '@/components/shared/EmptyState';
import { Badge } from '@/components/ui/badge';
import { BarChart3 } from 'lucide-react';
import type { SubjectPerformance, ClassPerformance } from '@/types';

interface SubjectPerformanceTableProps {
  subjects: SubjectPerformance[];
}

function performanceBadge(rate: number) {
  if (rate >= 80) return <Badge variant="default">{rate}%</Badge>;
  if (rate >= 60) return <Badge variant="secondary">{rate}%</Badge>;
  if (rate >= 40) return <Badge variant="outline">{rate}%</Badge>;
  return <Badge variant="destructive">{rate}%</Badge>;
}

interface FlatRow {
  subjectName: string;
  className: string;
  teacherName: string;
  studentCount: number;
  averageMark: number;
  passRate: number;
  highestMark: number;
  lowestMark: number;
}

export function SubjectPerformanceTable({ subjects }: SubjectPerformanceTableProps) {
  const rows = useMemo<FlatRow[]>(() => {
    const flat: FlatRow[] = [];
    for (const sub of subjects) {
      for (const cls of sub.classes) {
        flat.push({
          subjectName: sub.subjectName,
          className: cls.className,
          teacherName: cls.teacherName,
          studentCount: cls.studentCount,
          averageMark: cls.averageMark,
          passRate: cls.passRate,
          highestMark: cls.highestMark,
          lowestMark: cls.lowestMark,
        });
      }
    }
    return flat;
  }, [subjects]);

  const columns = useMemo<ColumnDef<FlatRow, unknown>[]>(() => [
    { accessorKey: 'subjectName', header: 'Subject' },
    { accessorKey: 'className', header: 'Class' },
    { accessorKey: 'teacherName', header: 'Teacher' },
    { accessorKey: 'studentCount', header: 'Students' },
    {
      accessorKey: 'averageMark',
      header: 'Average',
      cell: ({ row }) => performanceBadge(row.original.averageMark),
    },
    {
      accessorKey: 'passRate',
      header: 'Pass Rate',
      cell: ({ row }) => performanceBadge(row.original.passRate),
    },
    { accessorKey: 'highestMark', header: 'Highest' },
    { accessorKey: 'lowestMark', header: 'Lowest' },
  ], []);

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No performance data"
        description="Performance data will appear once marks have been captured."
      />
    );
  }

  return (
    <DataTable
      columns={columns}
      data={rows}
      searchKey="subjectName"
      searchPlaceholder="Search subjects..."
    />
  );
}
