'use client';

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import type { TbTimetableEntry, TimetableConfig } from '@/types';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const;
const DAY_LABELS: Record<string, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri',
};

/** Hash a string to a consistent HSL color for subject coding. */
function subjectColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 92%)`;
}

interface TimetableGridProps {
  entries: TbTimetableEntry[];
  config: TimetableConfig | null;
  className?: string;
  onCellClick?: (day: string, period: number) => void;
}

export function TimetableGrid({ entries, config, className, onCellClick }: TimetableGridProps) {
  const maxPeriods = useMemo(() => {
    if (!config) return 7;
    return Math.max(
      config.periodsPerDay.monday,
      config.periodsPerDay.tuesday,
      config.periodsPerDay.wednesday,
      config.periodsPerDay.thursday,
      config.periodsPerDay.friday,
    );
  }, [config]);

  const periods = useMemo(() => Array.from({ length: maxPeriods }, (_, i) => i + 1), [maxPeriods]);

  const breakAfter = useMemo(() => {
    if (!config) return new Set<number>();
    return new Set(config.breakSlots.map((b) => b.afterPeriod));
  }, [config]);

  const breakLabels = useMemo(() => {
    if (!config) return new Map<number, string>();
    return new Map(config.breakSlots.map((b) => [b.afterPeriod, b.label]));
  }, [config]);

  const getEntry = (day: string, period: number): TbTimetableEntry | undefined =>
    entries.find((e) => e.day === day && e.period === period);

  const getPeriodTime = (period: number): string => {
    if (!config) return '';
    const pt = config.periodTimes.find((p) => p.period === period);
    return pt ? `${pt.startTime}-${pt.endTime}` : '';
  };

  return (
    <Card className={className}>
      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-2 text-left font-medium text-muted-foreground w-20">Period</th>
              {DAYS.map((d) => (
                <th key={d} className="p-2 text-left font-medium text-muted-foreground">
                  {DAY_LABELS[d]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {periods.map((period) => {
              const isBreak = breakAfter.has(period);
              return (
                <tr key={period} className="border-b last:border-0">
                  <td className="p-2" colSpan={isBreak ? undefined : undefined}>
                    <span className="font-medium">P{period}</span>
                    <span className="block text-xs text-muted-foreground">
                      {getPeriodTime(period)}
                    </span>
                  </td>
                  {DAYS.map((day) => {
                    const entry = getEntry(day, period);
                    const periodsForDay = config?.periodsPerDay[day] ?? maxPeriods;
                    if (period > periodsForDay) {
                      return <td key={day} className="p-1 bg-muted/30" />;
                    }
                    if (!entry) {
                      return (
                        <td key={day} className="p-1">
                          <button
                            onClick={() => onCellClick?.(day, period)}
                            className="w-full rounded border border-dashed p-2 text-xs text-muted-foreground hover:bg-muted/50 min-h-12"
                          >
                            {onCellClick ? '+' : ''}
                          </button>
                        </td>
                      );
                    }
                    return (
                      <td key={day} className="p-1">
                        <button
                          onClick={() => onCellClick?.(day, period)}
                          className="w-full rounded p-2 text-left min-h-12"
                          style={{ backgroundColor: subjectColor(entry.subjectName ?? '') }}
                        >
                          <p className="text-xs font-semibold truncate">{entry.subjectName}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {entry.teacherName}
                          </p>
                          {entry.room && (
                            <p className="text-xs text-muted-foreground">{entry.room}</p>
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {/* Break rows rendered after relevant period rows via CSS-like approach */}
          </tbody>
        </table>

        {/* Break indicators */}
        {config?.breakSlots.map((bs) => (
          <div
            key={bs.afterPeriod}
            className="bg-muted/40 text-center text-xs text-muted-foreground py-1 font-medium border-y"
            style={{ display: 'none' }}
            data-break-after={bs.afterPeriod}
          >
            {bs.label} ({bs.duration} min)
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
