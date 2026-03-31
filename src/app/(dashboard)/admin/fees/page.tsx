'use client';

import { useState } from 'react';
import { DollarSign, TrendingUp, AlertCircle, Pencil, Trash2 } from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { formatCurrency } from '@/lib/utils';
import { useFeeOverview } from '@/hooks/useAdminFees';
import { CreateFeeTypeDialog } from '@/components/fees/CreateFeeTypeDialog';
import { EditFeeTypeDialog } from '@/components/fees/EditFeeTypeDialog';
import { DeleteFeeTypeDialog } from '@/components/fees/DeleteFeeTypeDialog';
import { FeeScheduleSection } from '@/components/fees/FeeScheduleSection';
import type { FeeType } from '@/types';

const frequencyLabels: Record<string, string> = {
  once_off: 'Once Off',
  per_term: 'Per Term',
  per_year: 'Per Year',
  monthly: 'Monthly',
};

const categoryLabels: Record<string, string> = {
  tuition: 'Tuition',
  extramural: 'Extramural',
  camp: 'Camp',
  uniform: 'Uniform',
  transport: 'Transport',
  other: 'Other',
};

export default function FeesPage() {
  const { feeTypes, invoices, loading, refetchFeeTypes, schoolId } = useFeeOverview();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editFeeType, setEditFeeType] = useState<FeeType | null>(null);
  const [deleteFeeType, setDeleteFeeType] = useState<FeeType | null>(null);

  const feeTypeColumns: ColumnDef<FeeType>[] = [
    { accessorKey: 'name', header: 'Fee Type' },
    { accessorKey: 'description', header: 'Description' },
    {
      id: 'amount',
      header: 'Amount',
      cell: ({ row }) => formatCurrency(row.original.amount),
    },
    {
      accessorKey: 'frequency',
      header: 'Frequency',
      cell: ({ row }) => frequencyLabels[row.original.frequency] ?? row.original.frequency,
    },
    {
      accessorKey: 'category',
      header: 'Category',
      cell: ({ row }) => (
        <Badge variant="secondary">
          {categoryLabels[row.original.category] ?? row.original.category}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => setEditFeeType(row.original)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleteFeeType(row.original)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const totalCollected = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
  const totalOutstanding = invoices.reduce((sum, inv) => sum + inv.balanceDue, 0);
  const collectionRate = totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0;

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader title="Fee Management" description="Manage school fees and fee types" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Invoiced" value={formatCurrency(totalInvoiced)} icon={DollarSign} />
        <StatCard title="Collected" value={formatCurrency(totalCollected)} icon={DollarSign} />
        <StatCard title="Outstanding" value={formatCurrency(totalOutstanding)} icon={AlertCircle} />
        <StatCard title="Collection Rate" value={`${collectionRate}%`} icon={TrendingUp} />
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Fee Types</h2>
        <CreateFeeTypeDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          schoolId={schoolId ?? ''}
          onSuccess={refetchFeeTypes}
        />
      </div>

      <DataTable columns={feeTypeColumns} data={feeTypes} searchKey="name" searchPlaceholder="Search fee types..." />

      <hr className="my-4" />

      {schoolId && (
        <FeeScheduleSection schoolId={schoolId} feeTypes={feeTypes} />
      )}

      <EditFeeTypeDialog
        open={!!editFeeType}
        onOpenChange={(v) => { if (!v) setEditFeeType(null); }}
        feeType={editFeeType}
        onSuccess={refetchFeeTypes}
      />

      <DeleteFeeTypeDialog
        open={!!deleteFeeType}
        onOpenChange={(v) => { if (!v) setDeleteFeeType(null); }}
        feeType={deleteFeeType}
        onSuccess={refetchFeeTypes}
      />
    </div>
  );
}
