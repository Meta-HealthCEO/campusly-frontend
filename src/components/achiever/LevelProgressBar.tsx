'use client';

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Zap } from 'lucide-react';
import { LEVEL_THRESHOLDS, getXPForNextLevel } from '@/types/achiever';

interface LevelProgressBarProps {
  xp: number;
  level: number;
}

export function LevelProgressBar({ xp, level }: LevelProgressBarProps) {
  const { currentThreshold, nextThreshold, progress } = useMemo(() => {
    const current = LEVEL_THRESHOLDS[level - 1] ?? 0;
    const next = getXPForNextLevel(xp);
    const pct = next !== null ? ((xp - current) / (next - current)) * 100 : 100;
    return { currentThreshold: current, nextThreshold: next, progress: Math.min(pct, 100) };
  }, [xp, level]);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <span className="text-lg font-bold text-primary">{level}</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold">Level {level}</span>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Zap className="h-3 w-3 text-amber-500" />
                <span>{xp} XP</span>
              </div>
            </div>
            <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between mt-1 text-xs text-muted-foreground">
              <span>{currentThreshold} XP</span>
              <span>{nextThreshold !== null ? `${nextThreshold} XP` : 'Max Level'}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
