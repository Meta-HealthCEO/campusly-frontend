'use client';

import { Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { summaryLine, timelineTone, type TimelineItem } from '@/lib/behaviour';
import { lastSeenLabel } from '@/lib/unit-insight';
import type { BehaviourSummary } from '@/hooks/useBehaviour';

interface Props {
  items: TimelineItem[];
  summary: BehaviourSummary;
  loading: boolean;
  error: string | null;
}

/** A learner's merits, demerits, incidents and referrals, newest first. */
export function BehaviourTimelineCard({ items, summary, loading, error }: Props) {
  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center gap-2 text-base"><Shield className="h-4 w-4 text-muted-foreground" aria-hidden /> Behaviour</CardTitle>
        <p className="text-sm text-muted-foreground">{summaryLine(summary)}</p>
      </CardHeader>
      <CardContent>
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        {loading && items.length === 0 ? <LoadingSpinner /> : null}
        {!loading && !error && items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Log a merit when they do well, or a demerit when a rule is broken. It shows here.</p>
        ) : null}
        {items.length > 0 ? (
          <ol className="space-y-3" aria-label="Behaviour timeline">
            {items.slice(0, 12).map((item) => (
              <li key={`${item.kind}-${item.id}`} className="space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${timelineTone(item.kind)}`}>{item.label}</span>
                  <span className="text-xs text-muted-foreground">{lastSeenLabel(item.at)}{item.by ? ` · ${item.by}` : ''}</span>
                </div>
                {item.detail ? <p className="text-sm text-muted-foreground">{item.detail}</p> : null}
              </li>
            ))}
          </ol>
        ) : null}
      </CardContent>
    </Card>
  );
}
