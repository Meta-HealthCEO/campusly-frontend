'use client';

import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import type { ConsentCompletionStats } from '@/hooks/useConsentStats';

interface ConsentCompletionBarProps {
  stats: ConsentCompletionStats;
}

export function ConsentCompletionBar({ stats }: ConsentCompletionBarProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Completion:{' '}
          <span className="font-medium text-foreground">
            {stats.completionPercentage}%
          </span>
        </span>
        <span className="text-muted-foreground">
          {stats.signed + stats.declined}/{stats.totalTargeted} responded
        </span>
      </div>
      <Progress value={stats.completionPercentage} />
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
          Signed: {stats.signed}
        </Badge>
        <Badge variant="secondary" className="bg-amber-100 text-amber-800">
          Pending: {stats.pending}
        </Badge>
        {stats.declined > 0 && (
          <Badge variant="destructive">
            Declined: {stats.declined}
          </Badge>
        )}
      </div>
    </div>
  );
}
