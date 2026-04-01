'use client';

import type { CoverageReport } from '@/types';

interface CoverageBarProps {
  report: CoverageReport;
}

interface Segment {
  key: string;
  value: number;
  label: string;
  colorClass: string;
}

export function CoverageBar({ report }: CoverageBarProps) {
  const { term, totalTopics, completed, inProgress, skipped, notStarted, percentage } = report;

  if (totalTopics === 0) return null;

  const segments: Segment[] = [
    { key: 'completed', value: completed, label: 'Completed', colorClass: 'bg-emerald-500' },
    { key: 'in_progress', value: inProgress, label: 'In Progress', colorClass: 'bg-blue-500' },
    { key: 'skipped', value: skipped, label: 'Skipped', colorClass: 'bg-amber-500' },
    { key: 'not_started', value: notStarted, label: 'Not Started', colorClass: 'bg-muted' },
  ].filter((s) => s.value > 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Term {term}</span>
        <span className="text-sm text-muted-foreground">{percentage}% covered</span>
      </div>

      {/* Bar */}
      <div className="flex h-4 w-full overflow-hidden rounded-full bg-muted">
        {segments.map((seg) => (
          <div
            key={seg.key}
            className={seg.colorClass}
            style={{ width: `${(seg.value / totalTopics) * 100}%` }}
            title={`${seg.label}: ${seg.value}`}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {segments.map((seg) => (
          <div key={seg.key} className="flex items-center gap-1.5">
            <span className={`inline-block h-2.5 w-2.5 rounded-sm ${seg.colorClass}`} />
            <span className="text-xs text-muted-foreground">
              {seg.label} ({seg.value})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
