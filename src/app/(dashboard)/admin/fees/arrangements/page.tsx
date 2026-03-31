'use client';

import { useState } from 'react';
import { Plus, Eye } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { FeeStatusBadge } from '@/components/fees/FeeStatusBadge';
import { CreateArrangementDialog } from '@/components/fees/CreateArrangementDialog';
import { InstalmentSchedule } from '@/components/fees/InstalmentSchedule';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useArrangements } from '@/hooks/useAdminFees';
import type { PaymentArrangementRow } from '@/hooks/useAdminFees';

function getStudentName(stu: PaymentArrangementRow['studentId']): string {
  if (typeof stu === 'object' && stu !== null) {
    const u = stu.user;
    return u ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() : stu._id;
  }
  return stu;
}

export default function ArrangementsPage() {
  const { arrangements: data, loading, refetch: fetchData, schoolId } = useArrangements();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewScheduleId, setViewScheduleId] = useState<string | null>(null);

  const selectedArrangement = data.find((a) => a._id === viewScheduleId);

  const columns: ColumnDef<PaymentArrangementRow>[] = [
    {
      id: 'student',
      header: 'Student',
      cell: ({ row }) => getStudentName(row.original.studentId),
    },
    {
      id: 'total',
      header: 'Total',
      cell: ({ row }) => formatCurrency(row.original.totalOutstanding),
    },
    {
      id: 'instalment',
      header: 'Per Instalment',
      cell: ({ row }) => formatCurrency(row.original.instalmentAmount),
    },
    {
      id: 'instalments',
      header: 'Instalments',
      cell: ({ row }) => {
        const a = row.original;
        return `${a.numberOfInstalments - a.remainingInstalments}/${a.numberOfInstalments}`;
      },
    },
    {
      id: 'frequency',
      header: 'Frequency',
      cell: ({ row }) => row.original.frequency.charAt(0).toUpperCase() + row.original.frequency.slice(1),
    },
    {
      id: 'startDate',
      header: 'Start Date',
      cell: ({ row }) => row.original.startDate ? formatDate(row.original.startDate) : '—',
    },
    {
      id: 'nextPayment',
      header: 'Next Payment',
      cell: ({ row }) => row.original.nextPaymentDate ? formatDate(row.original.nextPaymentDate) : '—',
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => <FeeStatusBadge status={row.original.status} />,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setViewScheduleId(
            viewScheduleId === row.original._id ? null : row.original._id
          )}
        >
          <Eye className="mr-1 h-3.5 w-3.5" />
          Schedule
        </Button>
      ),
    },
  ];

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Payment Arrangements" description="Manage instalment plans for outstanding fees" />
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Arrangement
        </Button>
      </div>
      <DataTable columns={columns} data={data} searchKey="status" searchPlaceholder="Search arrangements..." />
      {selectedArrangement && (
        <InstalmentSchedule
          instalments={selectedArrangement.instalments ?? []}
          onClose={() => setViewScheduleId(null)}
        />
      )}
      <CreateArrangementDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        schoolId={schoolId}
        onSuccess={fetchData}
      />
    </div>
  );
}
