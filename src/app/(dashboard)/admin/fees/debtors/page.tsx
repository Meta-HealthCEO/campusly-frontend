'use client';

import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { formatCurrency, formatDate } from '@/lib/utils';
import { CollectionStageBadge } from '@/components/fees/FeeStatusBadge';
import { DebtorActions } from '@/components/fees/DebtorActions';
import { useDebtors } from '@/hooks/useDebtors';
import type { DebtorEntry } from '@/types';

export default function DebtorsPage() {
  const { data, actions, loading, refetch: fetchData, schoolId } = useDebtors();

  const columns: ColumnDef<DebtorEntry & { studentId: string }>[] = [
    { accessorKey: 'parentName', header: 'Parent Name' },
    { accessorKey: 'studentName', header: 'Student' },
    { accessorKey: 'grade', header: 'Grade' },
    { id: 'current', header: 'Current', cell: ({ row }) => formatCurrency(row.original.current) },
    { id: 'days30', header: '30 Days', cell: ({ row }) => formatCurrency(row.original.days30) },
    { id: 'days60', header: '60 Days', cell: ({ row }) => formatCurrency(row.original.days60) },
    { id: 'days90', header: '90 Days', cell: ({ row }) => formatCurrency(row.original.days90) },
    { id: 'days120Plus', header: '120+ Days', cell: ({ row }) => formatCurrency(row.original.days120Plus) },
    {
      id: 'totalOwed',
      header: 'Total Owed',
      cell: ({ row }) => (
        <span className="font-semibold text-destructive dark:text-destructive">
          {formatCurrency(row.original.totalOwed)}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <DebtorActions
          studentName={row.original.studentName}
          studentId={row.original.studentId}
          schoolId={schoolId}
          onSuccess={fetchData}
        />
      ),
    },
  ];

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader title="Debtors Ageing Report" description="Outstanding fees broken down by ageing period" />
      <DataTable columns={columns} data={data} searchKey="parentName" searchPlaceholder="Search by parent name..." />

      {actions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Collection Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {actions.slice(0, 10).map((action) => {
                const invNum = typeof action.invoiceId === 'object'
                  ? action.invoiceId?.invoiceNumber ?? action.invoiceId?._id
                  : action.invoiceId ?? '—';
                const stuName = typeof action.studentId === 'object' && action.studentId?.user
                  ? `${action.studentId.user.firstName ?? ''} ${action.studentId.user.lastName ?? ''}`.trim()
                  : '—';
                return (
                  <div key={action._id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <CollectionStageBadge stage={action.stage} />
                      <div>
                        <p className="text-sm font-medium">{stuName} - {invNum}</p>
                        {action.notes && (
                          <p className="text-xs text-muted-foreground">{action.notes}</p>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {action.createdAt ? formatDate(action.createdAt) : '—'}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
