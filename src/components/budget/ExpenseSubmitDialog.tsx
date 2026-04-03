'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { BudgetCategory, CreateExpensePayload, PaymentMethod } from '@/types';
import { ReceiptUpload } from './ReceiptUpload';

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'eft', label: 'EFT' },
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'debit_order', label: 'Debit Order' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' },
];

interface ExpenseSubmitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: BudgetCategory[];
  budgetId?: string;
  onSubmit: (data: CreateExpensePayload) => Promise<void>;
  uploadReceipt?: (file: File) => Promise<string>;
}

interface FormValues {
  categoryId: string;
  amount: string;
  description: string;
  vendor: string;
  invoiceNumber: string;
  invoiceDate: string;
  paymentMethod: string;
  term: string;
  notes: string;
}

export function ExpenseSubmitDialog({
  open,
  onOpenChange,
  categories,
  budgetId,
  onSubmit,
  uploadReceipt,
}: ExpenseSubmitDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState('');
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      categoryId: '', amount: '', description: '',
      vendor: '', invoiceNumber: '', invoiceDate: '',
      paymentMethod: '', term: '', notes: '',
    },
  });

  const handleFormSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      const payload: CreateExpensePayload = {
        schoolId: '', // hook adds this
        categoryId: values.categoryId,
        amount: Math.round(parseFloat(values.amount) * 100),
        description: values.description,
        ...(budgetId && { budgetId }),
        ...(values.vendor && { vendor: values.vendor }),
        ...(values.invoiceNumber && { invoiceNumber: values.invoiceNumber }),
        ...(values.invoiceDate && { invoiceDate: values.invoiceDate }),
        ...(values.paymentMethod && { paymentMethod: values.paymentMethod as PaymentMethod }),
        ...(values.term && { term: Number(values.term) }),
        ...(values.notes && { notes: values.notes }),
        ...(receiptUrl && { receiptUrl }),
      };
      await onSubmit(payload);
      reset();
      setReceiptUrl('');
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>New Expense</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            <div>
              <Label>Category <span className="text-destructive">*</span></Label>
              <Select onValueChange={(v: unknown) => setValue('categoryId', v as string)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.code} - {c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" {...register('categoryId', { required: 'Category is required' })} />
              {errors.categoryId && <p className="text-xs text-destructive mt-1">{errors.categoryId.message}</p>}
            </div>

            <div>
              <Label>Amount (ZAR) <span className="text-destructive">*</span></Label>
              <Input type="number" step="0.01" min="0.01" placeholder="0.00"
                {...register('amount', { required: 'Amount is required' })} />
              {errors.amount && <p className="text-xs text-destructive mt-1">{errors.amount.message}</p>}
            </div>

            <div>
              <Label>Description <span className="text-destructive">*</span></Label>
              <Input {...register('description', { required: 'Description is required' })} />
              {errors.description && <p className="text-xs text-destructive mt-1">{errors.description.message}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Vendor</Label>
                <Input {...register('vendor')} />
              </div>
              <div>
                <Label>Invoice Number</Label>
                <Input {...register('invoiceNumber')} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Invoice Date</Label>
                <Input type="date" {...register('invoiceDate')} />
              </div>
              <div>
                <Label>Payment Method</Label>
                <Select onValueChange={(v: unknown) => setValue('paymentMethod', v as string)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Term</Label>
                <Select onValueChange={(v: unknown) => setValue('term', v as string)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select term" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Term 1</SelectItem>
                    <SelectItem value="2">Term 2</SelectItem>
                    <SelectItem value="3">Term 3</SelectItem>
                    <SelectItem value="4">Term 4</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Notes</Label>
                <Input {...register('notes')} />
              </div>
            </div>

            {uploadReceipt && (
              <div className="space-y-1">
                <Label>Receipt</Label>
                <ReceiptUpload uploadFn={uploadReceipt} onUploaded={setReceiptUrl} />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Expense'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
