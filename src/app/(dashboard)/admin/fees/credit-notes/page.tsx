'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { FeeStatusBadge } from '@/components/fees/FeeStatusBadge';
import { CreateCreditNoteDialog } from '@/components/fees/CreateCreditNoteDialog';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useCreditNotes } from '@/hooks/useAdminFees';
import type { CreditNote } from '@/hooks/useAdminFees';

function getInvoiceNumber(inv: CreditNote['invoiceId']): string {
  if (typeof inv === 'object' && inv !== null) return inv.invoiceNumber ?? inv._id;
  return inv;
}

function getStudentName(stu: CreditNote['studentId']): string {
  if (typeof stu === 'object' && stu !== null) {
    const u = stu.user;
    return u ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() : stu._id;
  }
  return stu;
}

export default function CreditNotesPage() {
  const { creditNotes: data, loading, refetch: fetchData, approveRejectCreditNote, schoolId } = useCreditNotes();
  const [dialogOpen, setDialogOpen] = useState(false);

  const columns: ColumnDef<CreditNote>[] = [
    { accessorKey: 'creditNoteNumber', header: 'CN Number' },
    {
      id: 'invoice',
      header: 'Invoice',
      cell: ({ row }) => getInvoiceNumber(row.original.invoiceId),
    },
    {
      id: 'student',
      header: 'Student',
      cell: ({ row }) => getStudentName(row.original.studentId),
    },
    {
      id: 'amount',
      header: 'Amount',
      cell: ({ row }) => formatCurrency(row.original.amount),
    },
    { accessorKey: 'reason', header: 'Reason' },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => <FeeStatusBadge status={row.original.status} />,
    },
    {
      id: 'date',
      header: 'Date',
      cell: ({ row }) => row.original.createdAt ? formatDate(row.original.createdAt) : '—',
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        if (row.original.status !== 'pending') return null;
        return (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="text-emerald-600"
              onClick={() => approveRejectCreditNote(row.original._id, 'approved')}
            >
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-red-600"
              onClick={() => approveRejectCreditNote(row.original._id, 'rejected')}
            >
              Reject
            </Button>
          </div>
        );
      },
    },
  ];

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Credit Notes" description="Manage credit notes for invoices" />
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Credit Note
        </Button>
      </div>
      <DataTable columns={columns} data={data} searchKey="creditNoteNumber" searchPlaceholder="Search credit notes..." />
      <CreateCreditNoteDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        schoolId={schoolId}
        onSuccess={fetchData}
      />
    </div>
  );
}
