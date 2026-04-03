'use client';

import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/shared/DataTable';
import { formatCurrency } from '@/lib/utils';
import type { AssetInsurance, PremiumFrequency } from '@/types';

interface InsuranceListProps {
  policies: AssetInsurance[];
  onEdit?: (policy: AssetInsurance) => void;
}

const frequencyLabels: Record<PremiumFrequency, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annual: 'Annual',
};

function getCategoryName(categoryId: AssetInsurance['categoryId']): string {
  if (typeof categoryId === 'object' && categoryId != null) return categoryId.name;
  return categoryId ?? '—';
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString();
}

function isExpiringSoon(expiryDate: string): boolean {
  const expiry = new Date(expiryDate).getTime();
  const now = Date.now();
  const sixtyDaysMs = 60 * 24 * 60 * 60 * 1000;
  return expiry - now <= sixtyDaysMs && expiry >= now;
}

function isExpired(expiryDate: string): boolean {
  return new Date(expiryDate).getTime() < Date.now();
}

export function InsuranceList({ policies, onEdit }: InsuranceListProps) {
  const columns: ColumnDef<AssetInsurance>[] = useMemo(
    () => [
      {
        accessorKey: 'policyNumber',
        header: 'Policy #',
        cell: ({ getValue }) => (
          <span className="font-mono text-sm truncate block max-w-[120px]">
            {getValue() as string}
          </span>
        ),
      },
      {
        accessorKey: 'insurer',
        header: 'Insurer',
        cell: ({ getValue }) => (
          <span className="truncate block max-w-[130px]">{getValue() as string}</span>
        ),
      },
      {
        id: 'category',
        header: 'Category',
        cell: ({ row }) => getCategoryName(row.original.categoryId),
      },
      {
        accessorKey: 'coverageAmount',
        header: 'Coverage',
        cell: ({ getValue }) => formatCurrency(getValue() as number),
      },
      {
        accessorKey: 'premium',
        header: 'Premium',
        cell: ({ getValue }) => formatCurrency(getValue() as number),
      },
      {
        accessorKey: 'premiumFrequency',
        header: 'Frequency',
        cell: ({ getValue }) =>
          frequencyLabels[getValue() as PremiumFrequency] ?? (getValue() as string),
      },
      {
        accessorKey: 'expiryDate',
        header: 'Expiry Date',
        cell: ({ getValue }) => {
          const dateStr = getValue() as string;
          const expiring = isExpiringSoon(dateStr);
          const expired = isExpired(dateStr);
          return (
            <span
              className={
                expired
                  ? 'text-destructive font-medium'
                  : expiring
                  ? 'text-amber-600 font-medium'
                  : undefined
              }
            >
              {formatDate(dateStr)}
              {expiring && !expired && (
                <span className="ml-1 text-xs">(expiring soon)</span>
              )}
              {expired && (
                <span className="ml-1 text-xs">(expired)</span>
              )}
            </span>
          );
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) =>
          onEdit ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEdit(row.original)}
            >
              Edit
            </Button>
          ) : null,
      },
    ],
    [onEdit],
  );

  return (
    <div>
      <DataTable
        columns={columns}
        data={policies}
        searchKey="policyNumber"
        searchPlaceholder="Search policies..."
      />
    </div>
  );
}
