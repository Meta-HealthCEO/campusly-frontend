'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import apiClient from '@/lib/api-client';

interface ApplyDiscountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  invoiceNumber: string;
  onSuccess: () => void;
}

export function ApplyDiscountDialog({
  open,
  onOpenChange,
  invoiceId,
  invoiceNumber,
  onSuccess,
}: ApplyDiscountDialogProps) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!amount || !reason) {
      toast.error('Please fill in all required fields');
      return;
    }
    const amountCents = parseInt(amount, 10);
    if (isNaN(amountCents) || amountCents <= 0) {
      toast.error('Amount must be a positive number (in cents)');
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post('/fees/discount', {
        invoiceId,
        amount: amountCents,
        reason,
      });
      toast.success('Discount applied successfully');
      setAmount('');
      setReason('');
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to apply discount';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Apply Discount</DialogTitle>
          <DialogDescription>
            Apply a discount to invoice {invoiceNumber}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="disc-amount">Discount Amount (cents)</Label>
            <Input
              id="disc-amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 25000"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="disc-reason">Reason</Label>
            <Textarea
              id="disc-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for discount..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Applying...' : 'Apply Discount'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
