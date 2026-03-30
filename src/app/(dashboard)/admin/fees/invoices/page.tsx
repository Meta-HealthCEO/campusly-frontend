'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { Badge } from '@/components/ui/badge';
import { mockInvoices } from '@/lib/mock-data';
import { formatCurrency, formatDate } from '@/lib/utils';
import apiClient from '@/lib/api-client';
import type { Invoice } from '@/types';

const statusStyles: Record<string, string> = {
  paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  partial: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  sent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  cancelled: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
};

const columns: ColumnDef<Invoice>[] = [
  {
    accessorKey: 'invoiceNumber',
    header: 'Invoice No',
  },
  {
    id: 'student',
    header: 'Student',
    accessorFn: (row) => `${row.student.user.firstName} ${row.student.user.lastName}`,
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
    cell: ({ row }) => formatCurrency(row.original.balanceDue),
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
];

export default function InvoicesPage() {
  const [data, setData] = useState<Invoice[]>(mockInvoices);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await apiClient.get('/fee/invoices');
        if (response.data) setData(response.data.data ?? response.data);
      } catch (error) {
        console.warn('API unavailable, using mock data');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="Invoices" description="View and manage all student invoices" />
      <DataTable columns={columns} data={data} searchKey="invoiceNumber" searchPlaceholder="Search invoices..." />
    </div>
  );
}
