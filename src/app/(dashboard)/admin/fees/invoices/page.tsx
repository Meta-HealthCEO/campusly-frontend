'use client';

import { useState } from 'react';
import { Plus, Users, CreditCard, Percent } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useInvoices } from '@/hooks/useAdminFees';
import { CreateInvoiceDialog } from '@/components/fees/CreateInvoiceDialog';
import { BulkInvoiceDialog } from '@/components/fees/BulkInvoiceDialog';
import { RecordPaymentDialog } from '@/components/fees/RecordPaymentDialog';
import { ApplyDiscountDialog } from '@/components/fees/ApplyDiscountDialog';
import type { Invoice } from '@/types';

const statusStyles: Record<string, string> = {
  paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  partial: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  sent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  pending: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  cancelled: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
};

const statusOptions = ['all', 'pending', 'sent', 'paid', 'partial', 'overdue', 'draft', 'cancelled'];

export default function InvoicesPage() {
  const [statusFilter, setStatusFilter] = useState('all');
  const { invoices: data, loading, refetch: fetchData, schoolId } = useInvoices(statusFilter);
  const [createOpen, setCreateOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  const [discountInvoice, setDiscountInvoice] = useState<Invoice | null>(null);

  const columns: ColumnDef<Invoice>[] = [
    { accessorKey: 'invoiceNumber', header: 'Invoice No' },
    {
      id: 'student',
      header: 'Student',
      accessorFn: (row) => {
        const u = row.student?.user;
        return u ? `${u.firstName} ${u.lastName}` : '—';
      },
    },
    {
      id: 'amount',
      header: 'Amount',
      cell: ({ row }) => formatCurrency(row.original.totalAmount),
    },
    {
      id: 'paid',
      header: 'Paid',
      cell: ({ row }) => formatCurrency(row.original.paidAmount),
    },
    {
      id: 'balance',
      header: 'Balance',
      cell: ({ row }) => (
        <span className={row.original.balanceDue > 0 ? 'text-red-600 font-medium' : ''}>
          {formatCurrency(row.original.balanceDue)}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge className={statusStyles[row.original.status] || ''}>
          {row.original.status.charAt(0).toUpperCase() + row.original.status.slice(1)}
        </Badge>
      ),
    },
    {
      id: 'dueDate',
      header: 'Due Date',
      cell: ({ row }) => formatDate(row.original.dueDate),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const inv = row.original;
        if (inv.status === 'paid' || inv.status === 'cancelled') return null;
        return (
          <div className="flex gap-1">
            {inv.balanceDue > 0 && (
              <Button variant="outline" size="sm" onClick={() => setPaymentInvoice(inv)}>
                <CreditCard className="mr-1 h-3 w-3" />
                Pay
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setDiscountInvoice(inv)} title="Apply Discount">
              <Percent className="mr-1 h-3.5 w-3.5" />
              Discount
            </Button>
          </div>
        );
      },
    },
  ];

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader title="Invoices" description="View and manage all student invoices" />

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Invoice
        </Button>
        <Button variant="outline" onClick={() => setBulkOpen(true)}>
          <Users className="mr-2 h-4 w-4" />
          Bulk Generate
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Status:</span>
          <Select value={statusFilter} onValueChange={(val: unknown) => setStatusFilter(val as string)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((s) => (
                <SelectItem key={s} value={s}>
                  {s === 'all' ? 'All Statuses' : s.charAt(0).toUpperCase() + s.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <DataTable columns={columns} data={data} searchKey="invoiceNumber" searchPlaceholder="Search invoices..." />

      {schoolId && (
        <>
          <CreateInvoiceDialog
            open={createOpen}
            onOpenChange={setCreateOpen}
            schoolId={schoolId}
            onSuccess={fetchData}
          />
          <BulkInvoiceDialog
            open={bulkOpen}
            onOpenChange={setBulkOpen}
            schoolId={schoolId}
            onSuccess={fetchData}
          />
        </>
      )}

      <RecordPaymentDialog
        open={!!paymentInvoice}
        onOpenChange={(v) => { if (!v) setPaymentInvoice(null); }}
        invoice={paymentInvoice}
        onSuccess={fetchData}
      />

      {discountInvoice && (
        <ApplyDiscountDialog
          open
          onOpenChange={(open) => { if (!open) setDiscountInvoice(null); }}
          invoiceId={discountInvoice.id ?? (discountInvoice as unknown as Record<string, string>)._id ?? ''}
          invoiceNumber={discountInvoice.invoiceNumber}
          onSuccess={() => {
            setDiscountInvoice(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
