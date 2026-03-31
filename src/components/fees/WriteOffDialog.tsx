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

interface WriteOffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  studentName: string;
  onSuccess: () => void;
}

export function WriteOffDialog({
  open,
  onOpenChange,
  invoiceId,
  studentName,
  onSuccess,
}: WriteOffDialogProps) {
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
      await apiClient.post('/fees/write-off', {
        invoiceId,
        amount: amountCents,
        reason,
      });
      toast.success('Debt written off successfully');
      setAmount('');
      setReason('');
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to write off debt';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Write Off Debt</DialogTitle>
          <DialogDescription>
            Write off outstanding balance for {studentName}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="wo-amount">Amount (cents)</Label>
            <Input
              id="wo-amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 25000"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wo-reason">Reason</Label>
            <Textarea
              id="wo-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for write-off..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Writing Off...' : 'Write Off'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
