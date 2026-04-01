'use client';

import { Clock, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Deadline } from '@/types';

interface DeadlineTimelineProps {
  deadlines: Deadline[];
}

function formatDeadlineDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function typeBadgeVariant(type: Deadline['type']): 'secondary' | 'outline' {
  return type === 'bursary' ? 'secondary' : 'outline';
}

export default function DeadlineTimeline({ deadlines }: DeadlineTimelineProps) {
  const sorted = [...deadlines].sort(
    (a: Deadline, b: Deadline) => a.daysRemaining - b.daysRemaining
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-5 w-5" />
          Upcoming Deadlines
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No upcoming deadlines.
          </p>
        ) : (
          <div className="space-y-3">
            {sorted.map((d: Deadline) => (
              <div
                key={`${d.type}-${d.name}-${d.deadline}`}
                className="flex items-center gap-2 sm:gap-3"
              >
                {d.urgent && (
                  <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
                )}

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{d.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDeadlineDate(d.deadline)}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <Badge variant={typeBadgeVariant(d.type)} className="capitalize">
                    {d.type}
                  </Badge>
                  <Badge variant={d.urgent ? 'destructive' : 'secondary'}>
                    {d.daysRemaining}d
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
