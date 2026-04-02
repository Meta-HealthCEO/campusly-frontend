'use client';

import { useEffect, useState } from 'react';
import { DollarSign, TrendingUp, AlertCircle, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { StatCard } from '@/components/shared/StatCard';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { RevenueChart } from '@/components/superadmin/RevenueChart';
import { GenerateInvoiceDialog } from '@/components/superadmin/GenerateInvoiceDialog';
import { useSuperAdminStore } from '@/stores/useSuperAdminStore';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { PlatformInvoice } from '@/types';

const STATUS_STYLES: Record<PlatformInvoice['status'], string> = {
  paid: 'bg-emerald-100 text-emerald-700',
  sent: 'bg-blue-100 text-blue-700',
  overdue: 'bg-destructive/10 text-destructive',
  draft: 'bg-gray-100 text-gray-700',
};

export default function SuperAdminBillingPage() {
  const { revenue, revenueLoading, tenants, invoices, invoicesLoading } = useSuperAdminStore();
  const { fetchRevenue, fetchTenants, fetchInvoicesByTenant, generateInvoice } = useSuperAdmin();

  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [allInvoices, setAllInvoices] = useState<PlatformInvoice[]>([]);

  useEffect(() => {
    fetchRevenue();
    fetchTenants({ limit: 100 });
  }, [fetchRevenue, fetchTenants]);

  useEffect(() => {
    async function loadInvoices() {
      if (tenants.length > 0) {
        const promises = tenants.map((t) =>
          fetchInvoicesByTenant(t.id, statusFilter !== 'all' ? { status: statusFilter } : undefined)
        );
        await Promise.allSettled(promises);
      }
    }
    loadInvoices();
  }, [tenants, fetchInvoicesByTenant, statusFilter]);

  useEffect(() => {
    setAllInvoices(invoices);
  }, [invoices]);

  const summary = revenue?.summary ?? {
    totalPaid: 0, totalPaidCount: 0,
    totalOverdue: 0, totalOverdueCount: 0,
    totalDraft: 0, totalDraftCount: 0,
  };

  const mrrCents = Math.round(summary.totalPaid * 100);
  const arrCents = mrrCents * 12;
  const outstandingCents = Math.round((summary.totalOverdue + summary.totalDraft) * 100);

  const handleGenerate = async (data: {
    tenantId: string;
    lineItems: Array<{ description: string; quantity: number; unitPrice: number }>;
    tax: number;
    dueDate: string;
    status: string;
  }) => {
    try {
      await generateInvoice(data);
      toast.success('Invoice generated successfully');
      fetchRevenue();
      if (tenants.length > 0) {
        fetchInvoicesByTenant(data.tenantId);
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to generate invoice';
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Billing" description="Platform revenue and invoice management" />
        <Button onClick={() => setInvoiceDialogOpen(true)}>
          <FileText className="mr-2 h-4 w-4" /> Generate Invoice
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Total Paid"
          value={revenueLoading ? '...' : formatCurrency(mrrCents)}
          icon={TrendingUp}
          description={`${summary.totalPaidCount} paid invoices`}
        />
        <StatCard
          title="Projected ARR"
          value={revenueLoading ? '...' : formatCurrency(arrCents)}
          icon={DollarSign}
          description="Based on current paid revenue"
        />
        <StatCard
          title="Outstanding"
          value={revenueLoading ? '...' : formatCurrency(outstandingCents)}
          icon={AlertCircle}
          description={`${summary.totalOverdueCount} overdue, ${summary.totalDraftCount} draft`}
        />
      </div>

      <RevenueChart monthly={revenue?.monthly ?? []} loading={revenueLoading} />

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium">Invoices</h3>
            <Select value={statusFilter} onValueChange={(v: unknown) => setStatusFilter((v as string) || 'all')}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoicesLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      Loading invoices...
                    </TableCell>
                  </TableRow>
                ) : allInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No invoices found.
                    </TableCell>
                  </TableRow>
                ) : (
                  allInvoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-sm">{inv.invoiceNumber}</TableCell>
                      <TableCell>{inv.tenantName || '—'}</TableCell>
                      <TableCell>{formatCurrency(inv.amount)}</TableCell>
                      <TableCell>{inv.issuedDate ? formatDate(inv.issuedDate) : '—'}</TableCell>
                      <TableCell>{inv.dueDate ? formatDate(inv.dueDate) : '—'}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[inv.status]}`}>
                          {inv.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <GenerateInvoiceDialog
        tenants={tenants}
        open={invoiceDialogOpen}
        onOpenChange={setInvoiceDialogOpen}
        onSubmit={handleGenerate}
      />
    </div>
  );
}
