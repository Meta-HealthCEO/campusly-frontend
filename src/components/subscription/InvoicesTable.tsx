'use client';

import { Receipt } from 'lucide-react';
import type { SubscriptionInvoice } from '@/types/subscription';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Props {
  invoices: SubscriptionInvoice[];
}

function formatAmount(cents: number, currency: string): string {
  const value = (cents / 100).toLocaleString('en-ZA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${currency === 'ZAR' ? 'R' : currency + ' '}${value}`;
}

function StatusPill({ status }: { status: SubscriptionInvoice['status'] }) {
  const classes =
    status === 'paid'
      ? 'bg-primary/10 text-primary'
      : status === 'failed'
        ? 'bg-destructive/10 text-destructive'
        : status === 'refunded' || status === 'partially_refunded'
          ? 'bg-muted text-foreground'
          : 'bg-muted text-muted-foreground';
  const label =
    status === 'partially_refunded' ? 'Partial refund' : status.replace('_', ' ');
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${classes}`}
    >
      {label}
    </span>
  );
}

export function InvoicesTable({ invoices }: Props) {
  if (invoices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
        <Receipt className="h-8 w-8 text-muted-foreground/60" />
        <p className="text-sm text-muted-foreground">No invoices yet.</p>
        <p className="text-xs text-muted-foreground/80">
          Once your trial ends and we charge your card, every invoice will show up here.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice</TableHead>
            <TableHead>Period</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((inv) => (
            <TableRow key={inv.id}>
              <TableCell className="font-mono text-xs text-muted-foreground">
                <div className="flex flex-col gap-0.5">
                  <span>{inv.merchantReference}</span>
                  <span className="text-[10px]">
                    {new Date(inv.createdAt).toLocaleDateString('en-ZA', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </TableCell>
              <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                {new Date(inv.periodStart).toLocaleDateString('en-ZA', {
                  day: 'numeric',
                  month: 'short',
                })}{' '}
                –{' '}
                {new Date(inv.periodEnd).toLocaleDateString('en-ZA', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </TableCell>
              <TableCell className="whitespace-nowrap text-right font-medium">
                {formatAmount(inv.total, inv.currency)}
              </TableCell>
              <TableCell className="text-right">
                <StatusPill status={inv.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
