'use client';

import { AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BudgetAlert } from '@/types';

interface BudgetAlertBannerProps {
  alerts: BudgetAlert[];
}

export function BudgetAlertBanner({ alerts }: BudgetAlertBannerProps) {
  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map((alert) => (
        <div
          key={alert.categoryId}
          className={cn(
            'flex items-start gap-3 rounded-lg border p-3',
            alert.alertLevel === 'critical'
              ? 'border-destructive/30 bg-destructive/10 text-destructive'
              : 'border-yellow-500/30 bg-yellow-50 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200',
          )}
        >
          {alert.alertLevel === 'critical' ? (
            <XCircle className="h-5 w-5 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          )}
          <p className="text-sm">{alert.message}</p>
        </div>
      ))}
    </div>
  );
}
