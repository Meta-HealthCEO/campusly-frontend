'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/utils';
import { useInvoiceMutations, extractErrorMessage } from '@/hooks/useFeeMutations';
import type { Invoice } from '@/types';

interface RecordPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice | null;
  onSuccess: () => void;
}

type PaymentMethod = 'cash' | 'eft' | 'debit_order' | 'card';

const methodLabels: Record<PaymentMethod, string> = {
  cash: 'Cash',
  eft: 'EFT',
  debit_order: 'Debit Order',
  card: 'Card',
};

export function RecordPaymentDialog({ open, onOpenChange, invoice, onSuccess }: RecordPaymentDialogProps) {
  const { recordPayment } = useInvoiceMutations();
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen && invoice) {
      setAmount(String(invoice.balanceDue));
    }
    if (!isOpen) {
      resetForm();
    }
    onOpenChange(isOpen);
  };

  const resetForm = () => {
    setAmount('');
    setPaymentMethod('');
    setReference('');
    setNotes('');
  };

  const amountCents = Number(amount) || 0;
  const balanceDue = invoice?.balanceDue ?? 0;

  const handleSubmit = async () => {
    if (!invoice || !paymentMethod) {
      toast.error('Please select a payment method');
      return;
    }
    if (amountCents <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }
    if (amountCents > balanceDue) {
      toast.error('Amount cannot exceed the balance due');
      return;
    }
    setSubmitting(true);
    const invoiceId = (invoice as unknown as Record<string, string>)._id ?? invoice.id;
    try {
      await recordPayment(invoiceId, {
        amount: amountCents,
        paymentMethod,
        reference: reference || undefined,
        notes: notes || undefined,
      });
      toast.success('Payment recorded successfully!');
      onOpenChange(false);
      resetForm();
      onSuccess();
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to record payment'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            Record a payment for invoice {invoice?.invoiceNumber ?? ''}.
          </DialogDescription>
        </DialogHeader>
        {invoice && (
          <div className="space-y-4">
            <div className="rounded-lg border p-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Invoice Total</span>
                <span>{formatCurrency(invoice.totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Already Paid</span>
                <span className="text-emerald-600">{formatCurrency(invoice.paidAmount)}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Balance Due</span>
                <span className="text-destructive">{formatCurrency(balanceDue)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pay-amount">Amount (cents)</Label>
              <Input
                id="pay-amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 450000"
              />
              <p className="text-xs text-muted-foreground">
                = {formatCurrency(amountCents)}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select onValueChange={(val: unknown) => setPaymentMethod(val as PaymentMethod)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(methodLabels) as PaymentMethod[]).map((m) => (
                    <SelectItem key={m} value={m}>
                      {methodLabels[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pay-reference">Reference (optional)</Label>
              <Input
                id="pay-reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. EFT-20260331-00123"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pay-notes">Notes (optional)</Label>
              <Input
                id="pay-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes"
              />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Recording...' : 'Record Payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
