'use client';

import { useMemo } from 'react';

interface CognitiveBreakdown {
  knowledge: number;
  routine: number;
  complex: number;
  problemSolving: number;
}

interface MasteryProgressBarProps {
  masteryLevel: number;
  label?: string;
  showBreakdown?: boolean;
  cognitiveBreakdown?: CognitiveBreakdown;
}

function getBarColor(pct: number): string {
  if (pct >= 70) return 'bg-emerald-500';
  if (pct >= 40) return 'bg-yellow-500';
  return 'bg-amber-500';
}

function getTextColor(pct: number): string {
  if (pct >= 70) return 'text-emerald-600 dark:text-emerald-400';
  if (pct >= 40) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-amber-600 dark:text-amber-400';
}

const COGNITIVE_LABELS: { key: keyof CognitiveBreakdown; label: string }[] = [
  { key: 'knowledge', label: 'Knowledge' },
  { key: 'routine', label: 'Routine' },
  { key: 'complex', label: 'Complex' },
  { key: 'problemSolving', label: 'Problem Solving' },
];

export function MasteryProgressBar({
  masteryLevel,
  label = 'Mastery',
  showBreakdown = false,
  cognitiveBreakdown,
}: MasteryProgressBarProps) {
  const pct = useMemo(() => Math.round(Math.max(0, Math.min(100, masteryLevel))), [masteryLevel]);
  const barColor = getBarColor(pct);
  const textColor = getTextColor(pct);

  return (
    <div className="space-y-2">
      {/* Main bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium truncate">{label}</span>
          <span className={`font-semibold tabular-nums ${textColor}`}>{pct}%</span>
        </div>
        <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Cognitive breakdown mini bars */}
      {showBreakdown && cognitiveBreakdown && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-1">
          {COGNITIVE_LABELS.map(({ key, label: cogLabel }) => {
            const value = Math.round(Math.max(0, Math.min(100, cognitiveBreakdown[key])));
            const color = getBarColor(value);
            return (
              <div key={key} className="space-y-0.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground truncate">{cogLabel}</span>
                  <span className="tabular-nums font-medium">{value}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ease-out ${color}`}
                    style={{ width: `${value}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
