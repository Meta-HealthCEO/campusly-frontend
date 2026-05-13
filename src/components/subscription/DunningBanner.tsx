'use client';

import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';

export function DunningBanner() {
  const { subscription, isPastDue } = useSubscription();
  if (!isPastDue) return null;

  const isExpiredCard = subscription?.lastFailureReason === 'card_expired';
  const nextRetryAt = subscription?.nextRetryAt
    ? new Date(subscription.nextRetryAt).toLocaleDateString()
    : null;

  return (
    <div className="flex items-center justify-between gap-3 border-b border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive">
      <div className="flex items-center gap-2 min-w-0">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span className="truncate">
          {isExpiredCard
            ? 'Your card on file has expired.'
            : `Your last payment didn't go through.${
                nextRetryAt ? ` We'll retry on ${nextRetryAt}.` : ''
              }`}
        </span>
      </div>
      <Link href="/my/billing" className="font-medium underline shrink-0">
        Update card
      </Link>
    </div>
  );
}
