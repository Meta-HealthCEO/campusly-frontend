'use client';

import { useState } from 'react';
import { Plus, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';
import type { AfterCareInvoice } from '@/hooks/useAftercare';
import { getStudentName } from '@/hooks/useAftercare';

const STATUS_STYLES: Record<string, string> = {
  paid: 'bg-emerald-100 text-emerald-800',
  pending: 'bg-amber-100 text-amber-800',
  invoiced: 'bg-blue-100 text-blue-800',
};

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface BillingTabProps {
  invoices: AfterCareInvoice[];
  onGenerateInvoices: (month: number, year: number) => Promise<void>;
  onMarkPaid: (id: string) => Promise<void>;
  onFetchInvoices: (filters?: {
    month?: number;
    year?: number;
    status?: string;
  }) => Promise<void>;
}

export function BillingTab({
  invoices, onGenerateInvoices, onMarkPaid, onFetchInvoices,
}: BillingTabProps) {
  const [generateOpen, setGenerateOpen] = useState(false);
  const [genMonth, setGenMonth] = useState(String(new Date().getMonth() + 1));
  const [genYear, setGenYear] = useState(String(new Date().getFullYear()));
  const [submitting, setSubmitting] = useState(false);

  // filter state
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onGenerateInvoices(Number(genMonth), Number(genYear));
      setGenerateOpen(false);
    } catch {
      toast.error('Failed to generate invoices');
    } finally {
      setSubmitting(false);
    }
  };

  const applyFilters = async () => {
    const filters: { month?: number; year?: number; status?: string } = {};
    if (filterMonth) filters.month = Number(filterMonth);
    if (filterYear) filters.year = Number(filterYear);
    if (filterStatus) filters.status = filterStatus;
    await onFetchInvoices(filters);
  };

  const clearFilters = async () => {
    setFilterMonth('');
    setFilterYear('');
    setFilterStatus('');
    await onFetchInvoices();
  };

  const columns: ColumnDef<AfterCareInvoice>[] = [
    {
      accessorKey: 'studentName',
      header: 'Student',
      accessorFn: (row) => getStudentName(row.studentId),
      cell: ({ row }) => <span className="font-medium">{getStudentName(row.original.studentId)}</span>,
    },
    {
      id: 'period',
      header: 'Period',
      cell: ({ row }) => `${MONTH_NAMES[row.original.month] ?? row.original.month} ${row.original.year}`,
    },
    {
      id: 'amount',
      header: 'Amount',
      cell: ({ row }) => <span className="font-medium">{formatCurrency(row.original.amount)}</span>,
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant="secondary" className={STATUS_STYLES[row.original.status] ?? ''}>
          {row.original.status}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        if (row.original.status !== 'paid') {
          return (
            <Button
              size="xs"
              variant="outline"
              onClick={async () => {
                try {
                  await onMarkPaid(row.original.id);
                } catch (err: unknown) {
                  const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
                    ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
                    ?? 'Operation failed';
                  toast.error(msg);
                }
              }}
            >
              <DollarSign className="mr-1 h-3 w-3" /> Mark Paid
            </Button>
          );
        }
        return null;
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 justify-between">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <Label className="text-xs">Month</Label>
            <Select value={filterMonth} onValueChange={(v: unknown) => setFilterMonth(v as string)}>
              <SelectTrigger className="w-[130px]"><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                {MONTH_NAMES.slice(1).map((m, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Year</Label>
            <Input
              className="w-[100px]"
              type="number"
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              placeholder="Year"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <Select value={filterStatus} onValueChange={(v: unknown) => setFilterStatus(v as string)}>
              <SelectTrigger className="w-[120px]"><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="invoiced">Invoiced</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="sm" onClick={applyFilters}>Filter</Button>
          <Button variant="ghost" size="sm" onClick={clearFilters}>Clear</Button>
        </div>
        <Button onClick={() => setGenerateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Generate Invoices
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={invoices}
        searchKey="studentName"
        searchPlaceholder="Search invoices..."
      />

      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Generate Monthly Invoices</DialogTitle>
            <DialogDescription>
              Generate invoices for all active after-care registrations. Existing invoices for the same period will be skipped.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleGenerate} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Month</Label>
                <Select value={genMonth} onValueChange={(v: unknown) => setGenMonth(v as string)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTH_NAMES.slice(1).map((m, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Year</Label>
                <Input
                  type="number"
                  value={genYear}
                  onChange={(e) => setGenYear(e.target.value)}
                  min={2020}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setGenerateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Generating...' : 'Generate'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
