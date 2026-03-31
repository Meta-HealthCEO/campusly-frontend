'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { FeeStatusBadge } from '@/components/fees/FeeStatusBadge';
import { CreateExemptionDialog } from '@/components/fees/CreateExemptionDialog';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useExemptions } from '@/hooks/useAdminFees';
import type { FeeExemption } from '@/hooks/useAdminFees';

function getStudentName(stu: FeeExemption['studentId']): string {
  if (typeof stu === 'object' && stu !== null) {
    const u = stu.user;
    return u ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() : stu._id;
  }
  return stu;
}

function getFeeTypeName(ft: FeeExemption['feeTypeId']): string {
  if (typeof ft === 'object' && ft !== null) return ft.name ?? ft._id;
  return ft;
}

const exemptionTypeLabels: Record<string, string> = {
  full: 'Full',
  partial: 'Partial',
  bursary: 'Bursary',
  sibling_discount: 'Sibling Discount',
  staff_discount: 'Staff Discount',
  early_payment: 'Early Payment',
};

export default function ExemptionsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { exemptions: data, loading, refetch: fetchData, schoolId } = useExemptions(statusFilter);
  const [dialogOpen, setDialogOpen] = useState(false);

  const columns: ColumnDef<FeeExemption>[] = [
    {
      id: 'student',
      header: 'Student',
      cell: ({ row }) => getStudentName(row.original.studentId),
    },
    {
      id: 'feeType',
      header: 'Fee Type',
      cell: ({ row }) => getFeeTypeName(row.original.feeTypeId),
    },
    {
      id: 'exemptionType',
      header: 'Type',
      cell: ({ row }) => exemptionTypeLabels[row.original.exemptionType] ?? row.original.exemptionType,
    },
    {
      id: 'value',
      header: 'Value',
      cell: ({ row }) => {
        const ex = row.original;
        if (ex.discountPercentage) return `${ex.discountPercentage}%`;
        if (ex.fixedAmount) return formatCurrency(ex.fixedAmount);
        return '—';
      },
    },
    {
      id: 'period',
      header: 'Period',
      cell: ({ row }) => {
        const ex = row.original;
        const from = ex.validFrom ? formatDate(ex.validFrom) : '—';
        const to = ex.validTo ? formatDate(ex.validTo) : '—';
        return `${from} - ${to}`;
      },
    },
    { accessorKey: 'reason', header: 'Reason' },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => <FeeStatusBadge status={row.original.status} />,
    },
  ];

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Fee Exemptions" description="Manage bursaries, discounts, and fee exemptions" />
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Exemption
        </Button>
      </div>
      <div className="flex items-center gap-3">
        <Label>Status Filter:</Label>
        <Select value={statusFilter} onValueChange={(val: unknown) => setStatusFilter(val as string)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="revoked">Revoked</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <DataTable columns={columns} data={data} searchKey="reason" searchPlaceholder="Search by reason..." />
      <CreateExemptionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        schoolId={schoolId}
        onSuccess={fetchData}
      />
    </div>
  );
}
