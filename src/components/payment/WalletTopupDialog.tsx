'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { usePaymentGateway } from '@/hooks/usePaymentGateway';
import type { PaymentFormData } from '@/types';

function submitPayFastForm(data: PaymentFormData) {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = data.paymentUrl;
  Object.entries(data.formData).forEach(([key, value]) => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = key;
    input.value = value;
    form.appendChild(input);
  });
  document.body.appendChild(form);
  form.submit();
}

interface WalletTopupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  walletId: string;
}

const PRESETS = [50, 100, 200, 500];
const MIN_AMOUNT_RANDS = 5;

export function WalletTopupDialog({ open, onOpenChange, walletId }: WalletTopupDialogProps) {
  const { initiateWalletTopup, loading } = usePaymentGateway();
  const [amount, setAmount] = useState('');
  const [redirecting, setRedirecting] = useState(false);

  const parsedAmount = parseFloat(amount) || 0;
  const isValid = parsedAmount >= MIN_AMOUNT_RANDS;
  const isProcessing = loading || redirecting;

  const handleTopup = async () => {
    if (!isValid) return;
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const data = await initiateWalletTopup({
        walletId,
        amount: Math.round(parsedAmount * 100),
        returnUrl: `${origin}/parent/fees/pay`,
        cancelUrl: `${origin}/parent/fees/pay`,
      });
      setRedirecting(true);
      submitPayFastForm(data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to initiate top-up');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Top Up Wallet Online
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="topup-amount">Amount (ZAR) <span className="text-destructive">*</span></Label>
            <Input
              id="topup-amount"
              type="number"
              placeholder="e.g. 100.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min={MIN_AMOUNT_RANDS}
              step="0.01"
            />
            <p className="text-xs text-muted-foreground">Minimum top-up: R{MIN_AMOUNT_RANDS}.00</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <Button
                key={preset}
                variant="outline"
                size="sm"
                onClick={() => setAmount(String(preset))}
              >
                R{preset}
              </Button>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button
            className="w-full"
            disabled={!isValid || isProcessing}
            onClick={handleTopup}
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            {isProcessing
              ? 'Processing...'
              : `Top Up R${parsedAmount.toFixed(2)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
