'use client';

import Link from 'next/link';
import { Clock } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';

export function TrialBanner() {
  const { isTrialing, daysLeftInTrial } = useSubscription();
  if (!isTrialing || daysLeftInTrial == null) return null;

  const amber = daysLeftInTrial <= 3;
  const bg = amber
    ? 'bg-amber-50 border-amber-200 text-amber-900'
    : 'bg-primary/5 border-primary/20 text-foreground';

  return (
    <div className={`flex items-center justify-between gap-3 border-b px-4 py-2 text-sm ${bg}`}>
      <div className="flex items-center gap-2 min-w-0">
        <Clock className="w-4 h-4 shrink-0" />
        <span className="truncate">
          {daysLeftInTrial} {daysLeftInTrial === 1 ? 'day' : 'days'} left in your Pro trial.
        </span>
      </div>
      <Link href="/my/billing" className="font-medium underline shrink-0">
        Manage
      </Link>
    </div>
  );
}
