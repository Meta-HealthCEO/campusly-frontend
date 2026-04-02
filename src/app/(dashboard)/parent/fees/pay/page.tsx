'use client';

import { useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { PaymentReturnPage } from '@/components/payment/PaymentReturnPage';
import { EmptyState } from '@/components/shared/EmptyState';
import { CreditCard } from 'lucide-react';

export default function PaymentReturnPageRoute() {
  const searchParams = useSearchParams();
  const paymentId = searchParams.get('paymentId');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment Status"
        description="View the status of your payment."
      />
      {paymentId ? (
        <PaymentReturnPage paymentId={paymentId} />
      ) : (
        <EmptyState
          icon={CreditCard}
          title="No payment found"
          description="No payment ID was provided. Please return to the fees page."
        />
      )}
    </div>
  );
}
