'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { PaymentAnalyticsCards } from '@/components/payment/PaymentAnalyticsCards';
import { OnlinePaymentsTable } from '@/components/payment/OnlinePaymentsTable';
import { RefundDialog } from '@/components/payment/RefundDialog';
import { toast } from 'sonner';
import { usePaymentGatewayAdmin } from '@/hooks/usePaymentGatewayAdmin';
import type { OnlinePayment } from '@/types';

export default function OnlinePaymentsPage() {
  const { payments, analytics, loading, refundPayment, loadPayments, loadAnalytics } =
    usePaymentGatewayAdmin();
  const [refundTarget, setRefundTarget] = useState<OnlinePayment | null>(null);

  const handleRefund = async (amount: number, reason: string) => {
    if (!refundTarget) return;
    try {
      await refundPayment(refundTarget.id, amount, reason);
      toast.success('Refund processed successfully');
      setRefundTarget(null);
      await Promise.all([loadPayments(), loadAnalytics()]);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to process refund');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Online Payments"
        description="Monitor online payment transactions and process refunds."
      />

      {analytics && <PaymentAnalyticsCards analytics={analytics} />}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <OnlinePaymentsTable
            payments={payments}
            onRefund={(payment) => setRefundTarget(payment)}
          />
        </CardContent>
      </Card>

      <RefundDialog
        open={!!refundTarget}
        onOpenChange={(open) => { if (!open) setRefundTarget(null); }}
        payment={refundTarget}
        onConfirm={handleRefund}
      />
    </div>
  );
}
