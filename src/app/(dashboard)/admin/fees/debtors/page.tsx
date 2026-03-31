'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { formatCurrency } from '@/lib/utils';
import apiClient from '@/lib/api-client';
import { useAuthStore } from '@/stores/useAuthStore';
import type { DebtorEntry } from '@/types';

const columns: ColumnDef<DebtorEntry>[] = [
  {
    accessorKey: 'parentName',
    header: 'Parent Name',
  },
  {
    accessorKey: 'studentName',
    header: 'Student',
  },
  {
    accessorKey: 'grade',
    header: 'Grade',
  },
  {
    id: 'current',
    header: 'Current',
    cell: ({ row }) => formatCurrency(row.original.current),
  },
  {
    id: 'days30',
    header: '30 Days',
    cell: ({ row }) => formatCurrency(row.original.days30),
  },
  {
    id: 'days60',
    header: '60 Days',
    cell: ({ row }) => formatCurrency(row.original.days60),
  },
  {
    id: 'days90',
    header: '90 Days',
    cell: ({ row }) => formatCurrency(row.original.days90),
  },
  {
    id: 'days120Plus',
    header: '120+ Days',
    cell: ({ row }) => formatCurrency(row.original.days120Plus),
  },
  {
    id: 'totalOwed',
    header: 'Total Owed',
    cell: ({ row }) => (
      <span className="font-semibold text-red-600 dark:text-red-400">
        {formatCurrency(row.original.totalOwed)}
      </span>
    ),
  },
];

export default function DebtorsPage() {
  const { user } = useAuthStore();
  const [data, setData] = useState<DebtorEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await apiClient.get(`/fees/debtors/school/${user?.schoolId}`);
        if (response.data) {
          const d = response.data.data ?? response.data;
          setData(Array.isArray(d) ? d : d.data ?? []);
        }
      } catch {
        console.error('Failed to load debtors report');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user?.schoolId]);

  return (
    <div className="space-y-6">
      <PageHeader title="Debtors Ageing Report" description="Outstanding fees broken down by ageing period" />
      <DataTable columns={columns} data={data} searchKey="parentName" searchPlaceholder="Search by parent name..." />
    </div>
  );
}
