'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/utils';
import type { OnlinePayment } from '@/types';

interface RefundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: OnlinePayment | null;
  onConfirm: (amount: number, reason: string) => void;
}

export function RefundDialog({ open, onOpenChange, payment, onConfirm }: RefundDialogProps) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open && payment) {
      setAmount(String((payment.amount / 100).toFixed(2)));
      setReason('');
    }
  }, [open, payment]);

  const parsedAmount = parseFloat(amount) || 0;
  const maxAmount = payment ? payment.amount / 100 : 0;
  const isValid = parsedAmount > 0 && parsedAmount <= maxAmount && reason.trim().length > 0;

  const handleConfirm = () => {
    if (!isValid) return;
    onConfirm(Math.round(parsedAmount * 100), reason.trim());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Process Refund</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {payment && (
            <div className="rounded-lg bg-muted/50 p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Receipt</span>
                <span className="font-mono">{payment.receiptNumber ?? payment.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Original Amount</span>
                <span className="font-medium">{formatCurrency(payment.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gateway Fee</span>
                <span>{formatCurrency(payment.gatewayFee)}</span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="refund-amount">
              Refund Amount (ZAR) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="refund-amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0.01"
              max={maxAmount}
              step="0.01"
            />
            <p className="text-xs text-muted-foreground">
              Maximum refund: {formatCurrency(payment?.amount ?? 0)}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="refund-reason">
              Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="refund-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for the refund..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isValid}
          >
            Confirm Refund
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
