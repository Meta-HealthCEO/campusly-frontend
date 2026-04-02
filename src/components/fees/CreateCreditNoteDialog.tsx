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
import { InvoiceSelector } from '@/components/fees/InvoiceSelector';
import { StudentSelector } from '@/components/fees/StudentSelector';
import { useCreditNoteMutations, extractErrorMessage } from '@/hooks/useFeeMutations';

interface CreateCreditNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: string;
  onSuccess: () => void;
}

export function CreateCreditNoteDialog({
  open,
  onOpenChange,
  schoolId,
  onSuccess,
}: CreateCreditNoteDialogProps) {
  const { createCreditNote } = useCreditNoteMutations();
  const [studentId, setStudentId] = useState('');
  const [invoiceId, setInvoiceId] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setStudentId('');
    setInvoiceId('');
    setAmount('');
    setReason('');
  };

  const handleSubmit = async () => {
    if (!invoiceId || !amount || !reason || !studentId) {
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
      await createCreditNote({
        invoiceId,
        studentId,
        schoolId,
        amount: amountCents,
        reason,
      });
      toast.success('Credit note created successfully!');
      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to create credit note'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Credit Note</DialogTitle>
          <DialogDescription>
            Issue a credit note against an invoice. It will need approval before applying.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <StudentSelector value={studentId} onValueChange={(val) => { setStudentId(val); setInvoiceId(''); }} />
          {studentId && (
            <InvoiceSelector
              schoolId={schoolId}
              studentId={studentId}
              value={invoiceId}
              onValueChange={setInvoiceId}
            />
          )}
          <div className="space-y-2">
            <Label htmlFor="cn-amount">Amount (cents)</Label>
            <Input
              id="cn-amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 25000"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cn-reason">Reason</Label>
            <Textarea
              id="cn-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for credit note..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Creating...' : 'Create Credit Note'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
