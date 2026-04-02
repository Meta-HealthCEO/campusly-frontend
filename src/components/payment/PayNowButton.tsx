'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CreditCard, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
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

interface PayNowButtonProps {
  invoiceIds: string[];
  totalAmount: number;
  disabled?: boolean;
}

export function PayNowButton({ invoiceIds, totalAmount, disabled }: PayNowButtonProps) {
  const { initiatePayment, loading } = usePaymentGateway();
  const [redirecting, setRedirecting] = useState(false);

  const handleClick = async () => {
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const data = await initiatePayment({
        invoiceIds,
        returnUrl: `${origin}/parent/fees/pay`,
        cancelUrl: `${origin}/parent/fees/pay`,
      });
      setRedirecting(true);
      submitPayFastForm(data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to initiate payment');
    }
  };

  const isProcessing = loading || redirecting;

  return (
    <Button
      size="default"
      onClick={handleClick}
      disabled={disabled || isProcessing || invoiceIds.length === 0}
      className="gap-2"
    >
      {isProcessing ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <CreditCard className="h-4 w-4" />
      )}
      {isProcessing ? 'Processing...' : `Pay Online — ${formatCurrency(totalAmount)}`}
    </Button>
  );
}
