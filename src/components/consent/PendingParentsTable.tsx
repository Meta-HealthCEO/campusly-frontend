'use client';

import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { Bell, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import type { PendingParent } from '@/hooks/useConsentStats';

interface PendingParentsTableProps {
  parents: PendingParent[];
}

const columns: ColumnDef<PendingParent>[] = [
  {
    accessorKey: 'studentName',
    header: 'Student',
  },
  {
    id: 'status',
    header: 'Status',
    cell: () => (
      <span className="text-sm text-amber-600 font-medium">Pending</span>
    ),
  },
  {
    id: 'actions',
    header: '',
    cell: () => (
      <Button
        size="sm"
        variant="outline"
        className="gap-1"
        onClick={() => toast.info('Reminder feature coming soon')}
      >
        <Bell className="h-3.5 w-3.5" />
        Send Reminder
      </Button>
    ),
  },
];

export function PendingParentsTable({ parents }: PendingParentsTableProps) {
  if (parents.length === 0) {
    return (
      <EmptyState
        icon={UserCheck}
        title="All parents responded"
        description="Every targeted parent has submitted their consent response."
      />
    );
  }

  return (
    <DataTable
      columns={columns}
      data={parents}
      searchKey="studentName"
      searchPlaceholder="Search students..."
    />
  );
}
