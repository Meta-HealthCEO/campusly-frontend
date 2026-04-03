'use client';

import { cn } from '@/lib/utils';
import type { PacingOverview, CurriculumPacingStatus } from '@/types/curriculum';

interface PacingTrafficLightProps {
  bySubject: PacingOverview['bySubject'];
  onCellClick?: (subjectId: string) => void;
}

const cellBg: Record<CurriculumPacingStatus, string> = {
  on_track: 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100',
  slightly_behind: 'bg-amber-50 border-amber-200 hover:bg-amber-100',
  significantly_behind: 'bg-destructive/5 border-destructive/20 hover:bg-destructive/10',
};

const statusText: Record<CurriculumPacingStatus, string> = {
  on_track: 'text-emerald-700',
  slightly_behind: 'text-amber-700',
  significantly_behind: 'text-destructive',
};

const statusLabel: Record<CurriculumPacingStatus, string> = {
  on_track: 'On Track',
  slightly_behind: 'Slightly Behind',
  significantly_behind: 'Significantly Behind',
};

interface SubjectCellProps {
  entry: PacingOverview['bySubject'][number];
  onClick?: (subjectId: string) => void;
}

function SubjectCell({ entry, onClick }: SubjectCellProps) {
  const isClickable = !!onClick;
  return (
    <div
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={isClickable ? () => onClick(entry.subjectId) : undefined}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') onClick(entry.subjectId);
            }
          : undefined
      }
      className={cn(
        'rounded-lg border p-4 transition-colors',
        cellBg[entry.pacingStatus],
        isClickable && 'cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      )}
    >
      <p className="text-sm font-semibold truncate">{entry.subjectName}</p>
      <p className="text-xs text-muted-foreground mt-0.5">
        {entry.plans} {entry.plans === 1 ? 'plan' : 'plans'}
      </p>
      <p className={cn('text-lg font-bold mt-2', statusText[entry.pacingStatus])}>
        {Math.round(entry.avgPacingPercent)}%
      </p>
      <p className={cn('text-xs font-medium mt-0.5', statusText[entry.pacingStatus])}>
        {statusLabel[entry.pacingStatus]}
      </p>
    </div>
  );
}

export function PacingTrafficLight({ bySubject, onCellClick }: PacingTrafficLightProps) {
  if (bySubject.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No subject pacing data available.
      </p>
    );
  }

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {bySubject.map((entry) => (
        <SubjectCell key={entry.subjectId} entry={entry} onClick={onCellClick} />
      ))}
    </div>
  );
}
