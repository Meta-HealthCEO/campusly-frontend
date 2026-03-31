'use client';

import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { TaxCertificate } from '@/hooks/useFundraising';

const columns: ColumnDef<TaxCertificate>[] = [
  {
    accessorKey: 'certificateNumber',
    header: 'Certificate #',
    cell: ({ row }) => (
      <Badge variant="outline" className="font-mono text-xs">
        {row.original.certificateNumber}
      </Badge>
    ),
  },
  { accessorKey: 'donorName', header: 'Donor' },
  {
    id: 'amount',
    header: 'Amount',
    cell: ({ row }) => (
      <span className="font-medium">{formatCurrency(row.original.amount)}</span>
    ),
  },
  {
    id: 'dateIssued',
    header: 'Date Issued',
    cell: ({ row }) => formatDate(row.original.dateIssued),
  },
  { accessorKey: 'schoolTaxNumber', header: 'School Tax #' },
];

interface TaxCertificatesTableProps {
  certificates: TaxCertificate[];
  loading: boolean;
}

export function TaxCertificatesTable({ certificates, loading }: TaxCertificatesTableProps) {
  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <DataTable
      columns={columns}
      data={certificates}
      searchKey="donorName"
      searchPlaceholder="Search certificates..."
    />
  );
}
