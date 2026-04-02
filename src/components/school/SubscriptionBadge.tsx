'use client';

import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';

interface SubscriptionBadgeProps {
  tier: 'basic' | 'standard' | 'premium';
  expiresAt?: string;
}

const tierStyles: Record<SubscriptionBadgeProps['tier'], string> = {
  basic: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  standard: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  premium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
};

const tierLabels: Record<SubscriptionBadgeProps['tier'], string> = {
  basic: 'Basic',
  standard: 'Standard',
  premium: 'Premium',
};

function getDaysUntilExpiry(expiresAt: string): number {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffMs = expiry.getTime() - now.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export function SubscriptionBadge({ tier, expiresAt }: SubscriptionBadgeProps) {
  const daysLeft = expiresAt ? getDaysUntilExpiry(expiresAt) : null;
  const isExpired = daysLeft !== null && daysLeft < 0;
  const isExpiringSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 30;

  if (isExpired) {
    return (
      <Badge className="bg-destructive/10 text-destructive dark:bg-red-900/30 dark:text-destructive">
        Expired
      </Badge>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5">
      <Badge className={tierStyles[tier]}>{tierLabels[tier]}</Badge>
      {isExpiringSoon && (
        <span className="inline-flex items-center gap-0.5 text-xs text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-3 w-3" />
          {daysLeft === 0 ? 'Expires today' : `Expires in ${daysLeft}d`}
        </span>
      )}
    </div>
  );
}
