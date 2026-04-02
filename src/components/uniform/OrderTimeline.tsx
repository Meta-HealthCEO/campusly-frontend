'use client';

import { CheckCircle2, Circle, Clock } from 'lucide-react';
import { useOrderTimeline } from '@/hooks/useOrderTimeline';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Order Placed',
  processing: 'Processing',
  confirmed: 'Confirmed',
  ready: 'Ready for Collection',
  collected: 'Collected',
  cancelled: 'Cancelled',
};

const STATUS_ORDER = ['pending', 'processing', 'confirmed', 'ready', 'collected'];

interface OrderTimelineProps {
  orderId: string;
  currentStatus: string;
}

export function OrderTimeline({ orderId, currentStatus }: OrderTimelineProps) {
  const { timeline, loading } = useOrderTimeline(orderId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
      </div>
    );
  }

  const completedStatuses = new Set(timeline.map((e) => e.status));
  const timelineMap = new Map(timeline.map((e) => [e.status, e]));

  return (
    <div className="space-y-0">
      {STATUS_ORDER.map((status, idx) => {
        const entry = timelineMap.get(status);
        const isDone = completedStatuses.has(status);
        const isCurrent = status === currentStatus;

        return (
          <div key={status} className="flex gap-3">
            <div className="flex flex-col items-center">
              {isDone ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
              ) : isCurrent ? (
                <Clock className="h-5 w-5 text-primary shrink-0" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground/40 shrink-0" />
              )}
              {idx < STATUS_ORDER.length - 1 && (
                <div className={`w-px flex-1 min-h-6 ${isDone ? 'bg-emerald-300' : 'bg-border'}`} />
              )}
            </div>
            <div className="pb-4">
              <p className={`text-sm font-medium ${isDone ? '' : 'text-muted-foreground'}`}>
                {STATUS_LABELS[status] ?? status}
              </p>
              {entry && (
                <p className="text-xs text-muted-foreground">
                  {new Date(entry.timestamp).toLocaleString()}
                </p>
              )}
              {entry?.notes && (
                <p className="text-xs text-muted-foreground mt-0.5">{entry.notes}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
