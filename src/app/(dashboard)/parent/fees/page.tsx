'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import {
  CreditCard, DollarSign, FileText, CheckCircle2, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useParentFees } from '@/hooks/useParentFees';
import type { Invoice, Payment } from '@/types';

const statusStyles: Record<string, string> = {
  paid: 'bg-emerald-100 text-emerald-800',
  sent: 'bg-blue-100 text-blue-800',
  partial: 'bg-amber-100 text-amber-800',
  overdue: 'bg-red-100 text-red-800',
  draft: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-gray-100 text-gray-500',
};

type PaymentMethod = 'cash' | 'eft' | 'card' | 'debit_order';

function PayDialog({ invoice, onPaid }: { invoice: Invoice; onPaid?: () => void }) {
  const [open, setOpen] = useState(false);
  const [payAmount, setPayAmount] = useState(
    String((invoice.balanceDue / 100).toFixed(2))
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('eft');
  const { payInvoice } = useParentFees();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" className="gap-1" />}>
        <CreditCard className="h-3.5 w-3.5" />
        Pay Now
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pay Invoice {invoice.invoiceNumber}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="rounded-lg bg-muted/50 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Invoice Total</span>
              <span className="font-medium">{formatCurrency(invoice.totalAmount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Already Paid</span>
              <span className="font-medium">{formatCurrency(invoice.paidAmount)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-sm font-semibold">
              <span>Balance Due</span>
              <span>{formatCurrency(invoice.balanceDue)}</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pay-amount">Payment Amount (ZAR)</Label>
            <Input
              id="pay-amount"
              type="number"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              min="1"
              max={invoice.balanceDue / 100}
              step="0.01"
            />
          </div>
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select value={paymentMethod} onValueChange={(val: unknown) => setPaymentMethod(val as PaymentMethod)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="eft">EFT</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="debit_order">Debit Order</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            className="w-full"
            disabled={!payAmount || parseFloat(payAmount) <= 0 || parseFloat(payAmount) > invoice.balanceDue / 100}
            onClick={async () => {
              try {
                const amountCents = Math.round(parseFloat(payAmount) * 100);
                await payInvoice(invoice.id, amountCents, paymentMethod);
                toast.success('Payment recorded successfully!');
                setOpen(false);
                onPaid?.();
              } catch (err: unknown) {
                toast.error(err instanceof Error ? err.message : 'Failed to process payment');
              }
            }}
          >
            Pay {payAmount ? formatCurrency(parseFloat(payAmount) * 100) : ''}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function getInvoiceColumns(onRefresh?: () => void): ColumnDef<Invoice, unknown>[] { return [
  {
    accessorKey: 'invoiceNumber',
    header: 'Invoice No.',
    cell: ({ row }) => <span className="font-medium">{row.original.invoiceNumber}</span>,
  },
  {
    accessorKey: 'student',
    header: 'Student',
    cell: ({ row }) => {
      const s = row.original.student;
      return s?.user ? `${s.user.firstName} ${s.user.lastName}` : '-';
    },
  },
  {
    id: 'description',
    header: 'Description',
    cell: ({ row }) => row.original.items?.map((item) => item.description).join(', ') ?? '-',
  },
  {
    accessorKey: 'totalAmount',
    header: 'Amount',
    cell: ({ row }) => formatCurrency(row.original.totalAmount),
  },
  {
    accessorKey: 'paidAmount',
    header: 'Paid',
    cell: ({ row }) => formatCurrency(row.original.paidAmount),
  },
  {
    accessorKey: 'balanceDue',
    header: 'Balance',
    cell: ({ row }) => (
      <span className={row.original.balanceDue > 0 ? 'text-red-600 font-medium' : 'text-emerald-600 font-medium'}>
        {formatCurrency(row.original.balanceDue)}
      </span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <Badge variant="secondary" className={statusStyles[row.original.status] ?? ''}>
        {row.original.status.charAt(0).toUpperCase() + row.original.status.slice(1)}
      </Badge>
    ),
  },
  {
    accessorKey: 'dueDate',
    header: 'Due Date',
    cell: ({ row }) => formatDate(row.original.dueDate),
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      if (row.original.balanceDue > 0 && row.original.status !== 'cancelled') {
        return <PayDialog invoice={row.original} onPaid={onRefresh} />;
      }
      return null;
    },
  },
]; }

const paymentColumns: ColumnDef<Payment, unknown>[] = [
  { accessorKey: 'date', header: 'Date', cell: ({ row }) => formatDate(row.original.date) },
  {
    accessorKey: 'reference', header: 'Reference',
    cell: ({ row }) => <span className="font-mono text-sm">{row.original.reference}</span>,
  },
  {
    accessorKey: 'method', header: 'Method',
    cell: ({ row }) => <Badge variant="outline">{row.original.method.toUpperCase()}</Badge>,
  },
  {
    accessorKey: 'amount', header: 'Amount',
    cell: ({ row }) => <span className="font-medium text-emerald-600">{formatCurrency(row.original.amount)}</span>,
  },
  {
    accessorKey: 'status', header: 'Status',
    cell: ({ row }) => {
      const styles: Record<string, string> = {
        completed: 'bg-emerald-100 text-emerald-800',
        pending: 'bg-amber-100 text-amber-800',
        failed: 'bg-red-100 text-red-800',
        refunded: 'bg-gray-100 text-gray-800',
      };
      return (
        <Badge variant="secondary" className={styles[row.original.status] ?? ''}>
          {row.original.status.charAt(0).toUpperCase() + row.original.status.slice(1)}
        </Badge>
      );
    },
  },
];

export default function FeesPage() {
  const { invoices, payments, loading, refetch } = useParentFees();

  const totalOutstanding = invoices.reduce((sum, inv) => sum + inv.balanceDue, 0);
  const totalPaid = payments.filter((p) => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0);
  const overdueCount = invoices.filter((inv) => inv.status === 'overdue').length;

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader title="Fee Management" description="View invoices, make payments, and track your payment history." />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Outstanding Balance" value={formatCurrency(totalOutstanding)} icon={DollarSign} description={totalOutstanding > 0 ? 'Payment required' : 'All paid up'} />
        <StatCard title="Total Paid" value={formatCurrency(totalPaid)} icon={CheckCircle2} description="This year" />
        <StatCard title="Invoices" value={String(invoices.length)} icon={FileText} description="Total invoices" />
        <StatCard title="Overdue" value={String(overdueCount)} icon={AlertTriangle} description={overdueCount > 0 ? 'Requires immediate attention' : 'No overdue invoices'} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invoices</CardTitle>
          <CardDescription>All invoices for your children. Click &quot;Pay Now&quot; to make a payment.</CardDescription>
        </CardHeader>
        <CardContent>
          {invoices.length > 0 ? (
            <DataTable columns={getInvoiceColumns(refetch)} data={invoices} searchKey="invoiceNumber" searchPlaceholder="Search invoices..." />
          ) : (
            <EmptyState icon={FileText} title="No invoices" description="No invoices have been issued yet." />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment History</CardTitle>
          <CardDescription>Your recent payments and their status.</CardDescription>
        </CardHeader>
        <CardContent>
          {payments.length > 0 ? (
            <DataTable columns={paymentColumns} data={payments} searchKey="reference" searchPlaceholder="Search payments..." />
          ) : (
            <EmptyState icon={CreditCard} title="No payments yet" description="Your payment history will appear here." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
