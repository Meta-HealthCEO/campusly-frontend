'use client';

import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/DataTable';
import { EmptyState } from '@/components/shared/EmptyState';
import { Users } from 'lucide-react';
import type { WorkloadEntry } from '@/types';

interface WorkloadTableProps {
  workload: WorkloadEntry[];
}

export function WorkloadTable({ workload }: WorkloadTableProps) {
  const columns = useMemo<ColumnDef<WorkloadEntry, unknown>[]>(() => [
    { accessorKey: 'teacherName', header: 'Teacher' },
    { accessorKey: 'subjectCount', header: 'Subjects' },
    { accessorKey: 'classCount', header: 'Classes' },
    { accessorKey: 'totalStudents', header: 'Students' },
    { accessorKey: 'periodsPerWeek', header: 'Periods/Week' },
    { accessorKey: 'assessmentsThisTerm', header: 'Assessments' },
    { accessorKey: 'pendingMarking', header: 'Pending Marking' },
    { accessorKey: 'observationsThisYear', header: 'Observations' },
  ], []);

  if (workload.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No workload data"
        description="Teacher workload will appear once teachers are assigned."
      />
    );
  }

  return (
    <DataTable
      columns={columns}
      data={workload}
      searchKey="teacherName"
      searchPlaceholder="Search teachers..."
    />
  );
}
