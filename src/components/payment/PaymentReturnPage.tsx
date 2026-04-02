'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { PaymentStatusBadge } from './PaymentStatusBadge';
import { CheckCircle2, XCircle, Clock, ArrowLeft } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { usePaymentGateway } from '@/hooks/usePaymentGateway';
import type { OnlinePayment, OnlinePaymentStatus } from '@/types';
import Link from 'next/link';

const statusIcons: Record<string, React.ReactNode> = {
  completed: <CheckCircle2 className="h-12 w-12 text-emerald-500" />,
  failed: <XCircle className="h-12 w-12 text-destructive" />,
  cancelled: <XCircle className="h-12 w-12 text-muted-foreground" />,
};

const statusMessages: Record<string, { title: string; description: string }> = {
  completed: {
    title: 'Payment Successful!',
    description: 'Your payment has been processed successfully. A receipt has been sent to your email.',
  },
  pending: {
    title: 'Payment Processing',
    description: 'Your payment is being processed. This may take a few moments.',
  },
  initiated: {
    title: 'Payment Processing',
    description: 'Your payment is being verified. Please wait...',
  },
  failed: {
    title: 'Payment Failed',
    description: 'Unfortunately your payment could not be processed. Please try again.',
  },
  cancelled: {
    title: 'Payment Cancelled',
    description: 'Your payment was cancelled. No charges have been made.',
  },
  refunded: {
    title: 'Payment Refunded',
    description: 'This payment has been refunded to your account.',
  },
};

interface PaymentReturnPageProps {
  paymentId: string;
}

export function PaymentReturnPage({ paymentId }: PaymentReturnPageProps) {
  const { checkPaymentStatus } = usePaymentGateway();
  const [payment, setPayment] = useState<OnlinePayment | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const result = await checkPaymentStatus(paymentId);
      setPayment(result);
      return result.status;
    } catch {
      console.error('Failed to check payment status');
      return null;
    } finally {
      setLoading(false);
    }
  }, [paymentId, checkPaymentStatus]);

  useEffect(() => {
    let pollCount = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function poll() {
      const status = await fetchStatus();
      pollCount++;
      const isPending = status === 'initiated' || status === 'pending';
      if (isPending && pollCount < 6) {
        timer = setTimeout(poll, 5000);
      }
    }

    poll();
    return () => { if (timer) clearTimeout(timer); };
  }, [fetchStatus]);

  if (loading) return <LoadingSpinner />;

  const status: OnlinePaymentStatus = payment?.status ?? 'pending';
  const info = statusMessages[status] ?? statusMessages.pending;
  const icon = statusIcons[status] ?? <Clock className="h-12 w-12 text-amber-500" />;

  return (
    <Card className="max-w-md mx-auto">
      <CardContent className="p-8 text-center space-y-4">
        <div className="flex justify-center">{icon}</div>
        <h2 className="text-xl font-semibold">{info.title}</h2>
        <p className="text-sm text-muted-foreground">{info.description}</p>

        {payment && (
          <div className="rounded-lg bg-muted/50 p-4 space-y-2 text-sm text-left">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-medium">{formatCurrency(payment.amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <PaymentStatusBadge status={payment.status} />
            </div>
            {payment.receiptNumber && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Receipt</span>
                <span className="font-mono">{payment.receiptNumber}</span>
              </div>
            )}
            {payment.failureReason && (
              <p className="text-xs text-destructive mt-2">{payment.failureReason}</p>
            )}
          </div>
        )}

        <Link href="/parent/fees">
          <Button variant="outline" className="gap-2 mt-4">
            <ArrowLeft className="h-4 w-4" />
            Back to Fees
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
