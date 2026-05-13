'use client';

import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

export default function SubscriptionPendingPage() {
  return (
    <div className="container mx-auto py-16 text-center max-w-md">
      <LoadingSpinner />
      <h1 className="mt-4 text-2xl font-bold">Almost there</h1>
      <p className="mt-2 text-muted-foreground">
        Your payment is being processed. We&apos;ll update your account shortly.
      </p>
    </div>
  );
}
