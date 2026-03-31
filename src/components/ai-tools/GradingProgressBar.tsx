'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';

interface GradingProgressBarProps {
  completed: number;
  total: number;
}

export function GradingProgressBar({ completed, total }: GradingProgressBarProps) {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 animate-pulse text-primary" />
              AI is grading submissions... ({completed}/{total})
            </span>
            <span className="text-muted-foreground">{percentage}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
