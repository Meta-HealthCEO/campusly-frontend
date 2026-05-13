'use client';

import { useRouter } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SubscriptionErrorPage() {
  const router = useRouter();
  return (
    <div className="container mx-auto py-16 text-center max-w-md">
      <AlertTriangle className="w-12 h-12 mx-auto text-destructive" />
      <h1 className="mt-4 text-2xl font-bold">Payment setup failed</h1>
      <p className="mt-2 text-muted-foreground">
        Your card couldn&apos;t be added. No charge was made.
      </p>
      <Button onClick={() => router.push('/subscription')} size="lg" className="mt-6">
        Try again
      </Button>
    </div>
  );
}
