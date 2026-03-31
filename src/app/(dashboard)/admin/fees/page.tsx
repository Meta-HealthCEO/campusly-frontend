'use client';

import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, AlertCircle, Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { StatCard } from '@/components/shared/StatCard';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable, type ColumnDef } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/utils';
import apiClient from '@/lib/api-client';
import { useAuthStore } from '@/stores/useAuthStore';
import { feeTypeSchema, type FeeTypeFormData } from '@/lib/validations';
import type { FeeType, Invoice } from '@/types';

const feeTypeColumns: ColumnDef<FeeType>[] = [
  { accessorKey: 'name', header: 'Fee Type' },
  { accessorKey: 'description', header: 'Description' },
  {
    id: 'amount',
    header: 'Amount',
    cell: ({ row }) => formatCurrency(row.original.amount),
  },
  {
    accessorKey: 'frequency',
    header: 'Frequency',
    cell: ({ row }) => row.original.frequency.charAt(0).toUpperCase() + row.original.frequency.slice(1),
  },
  {
    id: 'optional',
    header: 'Optional',
    cell: ({ row }) => (
      <Badge variant={row.original.isOptional ? 'secondary' : 'default'}>
        {row.original.isOptional ? 'Yes' : 'No'}
      </Badge>
    ),
  },
];

export default function FeesPage() {
  const { user } = useAuthStore();
  const [feeTypes, setFeeTypes] = useState<FeeType[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FeeTypeFormData>({
    resolver: zodResolver(feeTypeSchema),
    defaultValues: { isOptional: false },
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const [feeTypesRes, invoicesRes] = await Promise.all([
          apiClient.get(`/fees/types/school/${user?.schoolId}`),
          apiClient.get(`/fees/invoices/school/${user?.schoolId}`),
        ]);
        if (feeTypesRes.data) {
          const d = feeTypesRes.data.data ?? feeTypesRes.data;
          setFeeTypes(Array.isArray(d) ? d : d.data ?? []);
        }
        if (invoicesRes.data) {
          const d = invoicesRes.data.data ?? invoicesRes.data;
          setInvoices(Array.isArray(d) ? d : d.data ?? []);
        }
      } catch {
        console.error('Failed to load fee data');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user?.schoolId]);

  const onSubmit = async (data: FeeTypeFormData) => {
    try {
      await apiClient.post('/fees/types', data);
      toast.success('Fee type added successfully!');
      reset();
      setDialogOpen(false);
      // Refresh fee types list
      try {
        const response = await apiClient.get(`/fees/types/school/${user?.schoolId}`);
        if (response.data) {
          const d = response.data.data ?? response.data;
          setFeeTypes(Array.isArray(d) ? d : d.data ?? []);
        }
      } catch {
        // Keep existing list if refresh fails
      }
    } catch {
      toast.error('Failed to create fee type');
    }
  };

  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const totalCollected = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
  const totalOutstanding = invoices.reduce((sum, inv) => sum + inv.balanceDue, 0);
  const collectionRate = totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Fee Management" description="Manage school fees and fee types" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Invoiced" value={formatCurrency(totalInvoiced)} icon={DollarSign} />
        <StatCard title="Collected" value={formatCurrency(totalCollected)} icon={DollarSign} />
        <StatCard title="Outstanding" value={formatCurrency(totalOutstanding)} icon={AlertCircle} />
        <StatCard title="Collection Rate" value={`${collectionRate}%`} icon={TrendingUp} />
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Fee Types</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="mr-2 h-4 w-4" />
            Add Fee Type
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Fee Type</DialogTitle>
              <DialogDescription>Create a new fee type for invoicing.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" {...register('name')} placeholder="Fee type name" />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input id="description" {...register('description')} placeholder="Description" />
                {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (cents)</Label>
                <Input id="amount" type="number" {...register('amount', { valueAsNumber: true })} placeholder="e.g. 450000" />
                {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select onValueChange={(val: unknown) => setValue('frequency', val as FeeTypeFormData['frequency'])}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="once">Once</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="annually">Annually</SelectItem>
                  </SelectContent>
                </Select>
                {errors.frequency && <p className="text-xs text-destructive">{errors.frequency.message}</p>}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Adding...' : 'Add Fee Type'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <DataTable columns={feeTypeColumns} data={feeTypes} searchKey="name" searchPlaceholder="Search fee types..." />
    </div>
  );
}
