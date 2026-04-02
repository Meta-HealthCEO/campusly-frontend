'use client';

import { AlertTriangle, Receipt } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import type { OverdueFineEntry } from '@/hooks/useLibraryFines';
import { formatDate } from '@/lib/utils';

interface OverdueFinesTableProps {
  fines: OverdueFineEntry[];
  loading: boolean;
  uninvoicedCount: number;
  totalAmountCents: number;
  generating: boolean;
  onGenerateInvoices: () => Promise<void>;
  onRefresh: () => Promise<void>;
}

function formatRands(cents: number): string {
  return `R${(cents / 100).toFixed(2)}`;
}

export function OverdueFinesTable({
  fines, loading, uninvoicedCount, totalAmountCents,
  generating, onGenerateInvoices, onRefresh,
}: OverdueFinesTableProps) {
  if (loading) return <LoadingSpinner />;

  if (fines.length === 0) {
    return <EmptyState icon={AlertTriangle} title="No Overdue Fines" description="There are no overdue library books with fines." />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          <strong>{fines.length}</strong> overdue book{fines.length !== 1 ? 's' : ''} |{' '}
          Total fines: <strong>{formatRands(totalAmountCents)}</strong> |{' '}
          <strong>{uninvoicedCount}</strong> uninvoiced
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onRefresh}>Refresh</Button>
          {uninvoicedCount > 0 && (
            <Button size="sm" onClick={onGenerateInvoices} disabled={generating}>
              <Receipt className="h-4 w-4 mr-1" />
              {generating ? 'Generating...' : `Generate ${uninvoicedCount} Invoice(s)`}
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2 pr-3 font-medium">Student</th>
              <th className="py-2 pr-3 font-medium">Book</th>
              <th className="py-2 pr-3 font-medium">Due Date</th>
              <th className="py-2 pr-3 font-medium text-right">Days Overdue</th>
              <th className="py-2 pr-3 font-medium text-right">Fine</th>
              <th className="py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {fines.map((fine) => (
              <tr key={fine.loanId} className="border-b last:border-0">
                <td className="py-2 pr-3 truncate max-w-[150px]">{fine.studentName}</td>
                <td className="py-2 pr-3 truncate max-w-[200px]">{fine.bookTitle}</td>
                <td className="py-2 pr-3">{formatDate(fine.dueDate)}</td>
                <td className="py-2 pr-3 text-right text-destructive font-medium">{fine.daysOverdue}</td>
                <td className="py-2 pr-3 text-right font-medium">{formatRands(fine.fineAmountCents)}</td>
                <td className="py-2">
                  {fine.fineInvoiceId ? (
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 text-xs">Invoiced</Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-destructive/10 text-destructive text-xs">Pending</Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
