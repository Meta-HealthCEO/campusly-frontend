'use client';

import type { VideoProgress } from '@/types';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2 } from 'lucide-react';

interface WatchProgressBarProps {
  progress: VideoProgress | null;
}

export function WatchProgressBar({ progress }: WatchProgressBarProps) {
  if (!progress) {
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>No progress recorded</span>
          <span>0%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div className="h-full w-0 rounded-full bg-primary" />
        </div>
      </div>
    );
  }

  const pct = Math.min(100, Math.max(0, Math.round(progress.progressPercent)));

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{pct}% watched</span>
        {progress.isCompleted && (
          <Badge variant="secondary" className="flex items-center gap-1 text-xs px-1.5 py-0">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            <span className="text-emerald-700">Completed</span>
          </Badge>
        )}
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
