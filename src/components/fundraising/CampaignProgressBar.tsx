'use client';

import { Progress } from '@/components/ui/progress';
import { Users } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface CampaignProgressBarProps {
  targetAmount: number;
  raisedAmount: number;
  donorCount?: number;
}

export function CampaignProgressBar({
  targetAmount,
  raisedAmount,
  donorCount,
}: CampaignProgressBarProps) {
  const percentage =
    targetAmount > 0
      ? Math.min(Math.round((raisedAmount / targetAmount) * 100), 100)
      : 0;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">
          Raised:{' '}
          <span className="font-medium text-foreground">
            {formatCurrency(raisedAmount)}
          </span>
        </span>
        <span className="text-muted-foreground">
          Target:{' '}
          <span className="font-medium text-foreground">
            {formatCurrency(targetAmount)}
          </span>
        </span>
      </div>
      <Progress value={percentage} />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{percentage}% funded</span>
        {donorCount !== undefined && (
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {donorCount} donor{donorCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  );
}
