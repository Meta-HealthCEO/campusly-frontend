'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { MeritForm } from '@/components/attendance/MeritForm';
import { useTeacherMerits } from '@/hooks/useTeacherMerits';
import type { MeritRecord } from '@/hooks/useTeacherMerits';

function getStudentName(record: MeritRecord): string {
  if (typeof record.studentId === 'object' && record.studentId !== null) {
    const u = record.studentId.userId;
    if (u && typeof u === 'object') {
      return `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim();
    }
    return record.studentId.admissionNumber || 'Unknown';
  }
  return 'Unknown';
}

const meritColumns: ColumnDef<MeritRecord, unknown>[] = [
  {
    accessorKey: 'createdAt',
    header: 'Date',
    cell: ({ row }) => formatDate(row.original.createdAt),
  },
  {
    accessorKey: 'studentId',
    header: 'Student',
    cell: ({ row }) => getStudentName(row.original),
  },
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ row }) => (
      <Badge
        variant={row.original.type === 'merit' ? 'default' : 'destructive'}
        className={
          row.original.type === 'merit'
            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
            : ''
        }
      >
        {row.original.type}
      </Badge>
    ),
  },
  {
    accessorKey: 'category',
    header: 'Category',
    cell: ({ row }) => (
      <span className="capitalize">{row.original.category}</span>
    ),
  },
  {
    accessorKey: 'points',
    header: 'Points',
    cell: ({ row }) => (
      <span className={`font-semibold ${row.original.type === 'merit' ? 'text-emerald-600' : 'text-destructive'}`}>
        {row.original.type === 'merit' ? '+' : '-'}{row.original.points}
      </span>
    ),
  },
  {
    accessorKey: 'reason',
    header: 'Reason',
    cell: ({ row }) => (
      <span className="text-sm line-clamp-1">{row.original.reason}</span>
    ),
  },
];

export default function TeacherMeritsPage() {
  const [open, setOpen] = useState(false);
  const {
    records,
    students,
    loading,
    typeFilter,
    categoryFilter,
    setTypeFilter,
    setCategoryFilter,
    createMerit,
  } = useTeacherMerits();

  const handleSubmit = async (data: {
    studentId: string;
    type: 'merit' | 'demerit';
    points: number;
    category: string;
    reason: string;
  }) => {
    const success = await createMerit(data);
    if (success) setOpen(false);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Merits & Demerits"
        description="Award merits and demerits to students"
      >
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Award Points
        </Button>
      </PageHeader>

      <div className="flex flex-wrap gap-3">
        <Select value={typeFilter} onValueChange={(val) => setTypeFilter(val === 'all' ? '' : val as string)}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Filter type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="merit">Merits</SelectItem>
            <SelectItem value="demerit">Demerits</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={(val) => setCategoryFilter(val === 'all' ? '' : val as string)}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Filter category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="academic">Academic</SelectItem>
            <SelectItem value="behaviour">Behaviour</SelectItem>
            <SelectItem value="sport">Sport</SelectItem>
            <SelectItem value="service">Service</SelectItem>
            <SelectItem value="leadership">Leadership</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={meritColumns}
        data={records}
        searchKey="category"
        searchPlaceholder="Search by category..."
      />

      <MeritForm
        open={open}
        onOpenChange={setOpen}
        students={students}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
