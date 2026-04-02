'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { Plus, Trash2, Calendar } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { SubstituteForm } from '@/components/attendance/SubstituteForm';
import {
  useSubstitutes,
  type SubstituteRecord,
} from '@/hooks/useSubstitutes';

function getTeacherName(teacher: SubstituteRecord['originalTeacherId']): string {
  if (typeof teacher === 'object' && teacher !== null) {
    return `${teacher.firstName ?? ''} ${teacher.lastName ?? ''}`.trim() || 'Unknown';
  }
  return 'Unknown';
}

function getClassNames(classIds: SubstituteRecord['classIds']): string {
  return classIds
    .map((c) => (typeof c === 'object' && c !== null ? c.name ?? '' : ''))
    .filter(Boolean)
    .join(', ') || '-';
}

const columns: ColumnDef<SubstituteRecord, unknown>[] = [
  {
    accessorKey: 'date',
    header: 'Date',
    cell: ({ row }) => formatDate(row.original.date),
  },
  {
    accessorKey: 'originalTeacherId',
    header: 'Original Teacher',
    cell: ({ row }) => getTeacherName(row.original.originalTeacherId),
  },
  {
    accessorKey: 'substituteTeacherId',
    header: 'Substitute',
    cell: ({ row }) => getTeacherName(row.original.substituteTeacherId),
  },
  {
    accessorKey: 'periods',
    header: 'Periods',
    cell: ({ row }) => row.original.periods.map((p) => `P${p}`).join(', '),
  },
  {
    accessorKey: 'classIds',
    header: 'Classes',
    cell: ({ row }) => getClassNames(row.original.classIds),
  },
  {
    accessorKey: 'reason',
    header: 'Reason',
    cell: ({ row }) => (
      <span className="text-sm line-clamp-1">{row.original.reason}</span>
    ),
  },
];

export default function AdminSubstitutesPage() {
  const [open, setOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState('');

  const {
    records, staff, classes, loading,
    fetchSubstitutes, initialize,
    createSubstitute, deleteSubstitute,
  } = useSubstitutes();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!loading) {
      fetchSubstitutes(dateFilter || undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter]);

  const handleSubmit = async (data: {
    originalTeacherId: string;
    substituteTeacherId: string;
    date: string;
    reason: string;
    periods: number[];
    classIds: string[];
  }) => {
    await createSubstitute(data);
    setOpen(false);
  };

  const actionColumns: ColumnDef<SubstituteRecord, unknown>[] = [
    ...columns,
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button
          size="icon"
          variant="ghost"
          className="text-destructive hover:text-destructive"
          onClick={() => deleteSubstitute(row.original._id)}
          aria-label="Delete substitute"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Substitute Teachers"
        description="Manage substitute teacher assignments"
      >
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Assign Substitute
        </Button>
      </PageHeader>

      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <Input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="w-40"
          placeholder="Filter by date"
        />
        {dateFilter && (
          <Button variant="ghost" size="sm" onClick={() => setDateFilter('')}>
            Clear
          </Button>
        )}
      </div>

      <DataTable
        columns={actionColumns}
        data={records}
        searchKey="reason"
        searchPlaceholder="Search by reason..."
      />

      <SubstituteForm
        open={open}
        onOpenChange={setOpen}
        staff={staff}
        classes={classes}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
