'use client';

import { Flame } from 'lucide-react';

interface StreakIndicatorProps {
  currentStreak: number;
  longestStreak: number;
}

export function StreakIndicator({ currentStreak, longestStreak }: StreakIndicatorProps) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-1.5">
        <Flame className={`h-5 w-5 ${currentStreak > 0 ? 'text-orange-500' : 'text-muted-foreground'}`} />
        <span className="text-sm font-semibold">{currentStreak}-day streak</span>
      </div>
      <span className="text-xs text-muted-foreground">Best: {longestStreak} days</span>
    </div>
  );
}
