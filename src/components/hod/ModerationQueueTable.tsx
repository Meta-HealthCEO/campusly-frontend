'use client';

import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/DataTable';
import { EmptyState } from '@/components/shared/EmptyState';
import { Badge } from '@/components/ui/badge';
import { ClipboardCheck } from 'lucide-react';
import type { ModerationItem } from '@/types';

interface ModerationQueueTableProps {
  items: ModerationItem[];
  onApprove: (paperId: string) => void;
  onRequestChanges: (paperId: string) => void;
}

function statusBadge(status: string) {
  switch (status) {
    case 'pending':
      return <Badge variant="outline">Pending</Badge>;
    case 'approved':
      return <Badge variant="default">Approved</Badge>;
    case 'changes_requested':
      return <Badge variant="destructive">Changes Requested</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export function ModerationQueueTable({
  items,
  onApprove,
  onRequestChanges,
}: ModerationQueueTableProps) {
  const columns = useMemo<ColumnDef<ModerationItem, unknown>[]>(() => [
    { accessorKey: 'paperTitle', header: 'Paper' },
    { accessorKey: 'subjectName', header: 'Subject' },
    { accessorKey: 'teacherName', header: 'Teacher' },
    {
      accessorKey: 'submittedAt',
      header: 'Submitted',
      cell: ({ row }) => new Date(row.original.submittedAt).toLocaleDateString(),
    },
    {
      accessorKey: 'totalMarks',
      header: 'Total Marks',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => statusBadge(row.original.status),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        if (row.original.status !== 'pending') return null;
        return (
          <div className="flex gap-2">
            <button
              className="text-xs font-medium text-emerald-600 hover:underline"
              onClick={() => onApprove(row.original.paperId)}
            >
              Approve
            </button>
            <button
              className="text-xs font-medium text-destructive hover:underline"
              onClick={() => onRequestChanges(row.original.paperId)}
            >
              Request Changes
            </button>
          </div>
        );
      },
    },
  ], [onApprove, onRequestChanges]);

  if (items.length === 0) {
    return (
      <EmptyState
        icon={ClipboardCheck}
        title="No papers to moderate"
        description="Papers submitted by department teachers will appear here."
      />
    );
  }

  return (
    <DataTable
      columns={columns}
      data={items}
      searchKey="paperTitle"
      searchPlaceholder="Search papers..."
    />
  );
}
