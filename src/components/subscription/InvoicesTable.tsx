'use client';

import type { SubscriptionInvoice } from '@/types/subscription';
import { Badge } from '@/components/ui/badge';

interface Props {
  invoices: SubscriptionInvoice[];
}

function formatAmount(cents: number, currency: string): string {
  return `${currency === 'ZAR' ? 'R' : currency} ${(cents / 100).toFixed(2)}`;
}

function statusVariant(
  status: SubscriptionInvoice['status'],
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'paid':
      return 'default';
    case 'failed':
      return 'destructive';
    case 'refunded':
    case 'partially_refunded':
      return 'secondary';
    default:
      return 'outline';
  }
}

export function InvoicesTable({ invoices }: Props) {
  if (invoices.length === 0) {
    return <p className="text-sm text-muted-foreground">No invoices yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b text-left text-muted-foreground">
          <tr>
            <th className="py-2 pr-4">Date</th>
            <th className="py-2 pr-4">Period</th>
            <th className="py-2 pr-4">Amount</th>
            <th className="py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => (
            <tr key={inv.id} className="border-b last:border-0">
              <td className="py-2 pr-4 whitespace-nowrap">
                {new Date(inv.createdAt).toLocaleDateString()}
              </td>
              <td className="py-2 pr-4 text-muted-foreground whitespace-nowrap">
                {new Date(inv.periodStart).toLocaleDateString()} – {new Date(inv.periodEnd).toLocaleDateString()}
              </td>
              <td className="py-2 pr-4 whitespace-nowrap">{formatAmount(inv.total, inv.currency)}</td>
              <td className="py-2">
                <Badge variant={statusVariant(inv.status)}>{inv.status}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
