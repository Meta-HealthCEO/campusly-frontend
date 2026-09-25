'use client';

import Link from 'next/link';
import { Clock } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { cn } from '@/lib/utils';

export function TrialBanner() {
  const { isTrialing, daysLeftInTrial } = useSubscription();
  if (!isTrialing || daysLeftInTrial == null) return null;

  const amber = daysLeftInTrial <= 3;

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2 text-sm md:px-6 lg:px-8">
      <div className="flex items-center gap-2 min-w-0">
        <Clock className={cn('size-4 shrink-0', amber ? 'text-attention' : 'text-primary')} aria-hidden="true" />
        <span className="truncate">
          {daysLeftInTrial} {daysLeftInTrial === 1 ? 'day' : 'days'} left in your Pro trial.
        </span>
      </div>
      <Link href="/my/billing" className="shrink-0 rounded-control font-semibold underline underline-offset-4">
        Manage
      </Link>
    </div>
  );
}
