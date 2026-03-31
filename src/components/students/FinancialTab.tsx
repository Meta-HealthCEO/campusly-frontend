'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/EmptyState';
import { CreditCard } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Invoice } from '@/types';

const statusStyles: Record<string, string> = {
  paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  partial: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  sent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  cancelled: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
};

interface FinancialTabProps {
  invoices: Invoice[];
}

export function FinancialTab({ invoices }: FinancialTabProps) {
  if (invoices.length === 0) {
    return <EmptyState icon={CreditCard} title="No invoices" description="Financial records will appear here." />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoices</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {invoices.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium">{inv.invoiceNumber}</p>
                <p className="text-sm text-muted-foreground">Due: {formatDate(inv.dueDate)}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(inv.totalAmount)}</p>
                  {inv.balanceDue > 0 && (
                    <p className="text-sm text-muted-foreground">Balance: {formatCurrency(inv.balanceDue)}</p>
                  )}
                </div>
                <Badge className={statusStyles[inv.status] || ''}>
                  {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
