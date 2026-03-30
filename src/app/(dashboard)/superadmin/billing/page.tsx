'use client';

import { DollarSign, TrendingUp, AlertCircle, FileText } from 'lucide-react';
import { StatCard } from '@/components/shared/StatCard';
import { PageHeader } from '@/components/shared/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { mockPlatformStats, mockPlatformInvoices } from '@/lib/mock-data';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { PlatformInvoice } from '@/types';
import { toast } from 'sonner';

const STATUS_STYLES: Record<PlatformInvoice['status'], string> = {
  paid: 'bg-emerald-100 text-emerald-700',
  sent: 'bg-blue-100 text-blue-700',
  overdue: 'bg-red-100 text-red-700',
  draft: 'bg-gray-100 text-gray-700',
};

export default function SuperAdminBillingPage() {
  const handleGenerate = () => {
    toast.success('Invoice generation queued for all active tenants');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Billing" description="Platform revenue and invoice management" />
        <Button onClick={handleGenerate}>
          <FileText className="mr-2 h-4 w-4" /> Generate Invoices
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="MRR"
          value={formatCurrency(mockPlatformStats.mrr)}
          icon={TrendingUp}
          description="Monthly recurring revenue"
          trend={{ value: 10, label: 'vs last month' }}
        />
        <StatCard
          title="ARR"
          value={formatCurrency(mockPlatformStats.arr)}
          icon={DollarSign}
          description="Annual recurring revenue"
          trend={{ value: 10, label: 'vs last year' }}
        />
        <StatCard
          title="Outstanding"
          value={formatCurrency(mockPlatformStats.outstanding)}
          icon={AlertCircle}
          description="Unpaid platform invoices"
          trend={{ value: -5, label: 'vs last month' }}
        />
      </div>

      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>School</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Issued</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockPlatformInvoices.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell className="font-mono text-sm">{inv.invoiceNumber}</TableCell>
                <TableCell>{inv.tenantName}</TableCell>
                <TableCell className="capitalize">{inv.tier}</TableCell>
                <TableCell>{formatCurrency(inv.amount)}</TableCell>
                <TableCell>{formatDate(inv.issuedDate)}</TableCell>
                <TableCell>{formatDate(inv.dueDate)}</TableCell>
                <TableCell>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[inv.status]}`}>
                    {inv.status}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
