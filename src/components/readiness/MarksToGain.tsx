'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { TILE_LABEL, layoutExamMap, topicsByGain, type ExamMapTile, type ExamTopic } from '@/lib/readiness/exam-map';

/** Solid bars on the neutral track (ruling O1 revised). */
const BAR: Record<ExamMapTile['level'], string> = {
  secure: 'bg-mark-secure', building: 'bg-mark-building', weak: 'bg-mark-weak', untested: 'bg-transparent',
};

/** Spec §1: marks to gain per topic, written plainly, where the exam map is too small. */
export function MarksToGain({ topics }: { topics: readonly ExamTopic[] }) {
  const rows = useMemo(() => topicsByGain(layoutExamMap(topics)), [topics]);
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">No topics to show yet.</p>;
  return (
    <ul className="divide-y divide-border">
      {rows.map((t: ExamMapTile) => (
        <li key={t.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 py-3">
          <span className="truncate font-semibold">{t.name}</span>
          <span className="font-heading text-sm font-bold tabular-nums">
            {t.marksToGain === null ? '—' : `+${t.marksToGain}`}
            <span className="sr-only"> marks to gain</span>
          </span>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-full max-w-40 rounded-full bg-muted">
              <div className={cn('h-full rounded-full', BAR[t.level])} style={{ width: `${t.mastery ?? 0}%` }} />
            </div>
            <span className="text-caption text-muted-foreground tabular-nums">{t.marks} marks in the exam</span>
          </div>
          {t.level === 'untested' ? (
            <Badge variant="secondary">{TILE_LABEL.untested}</Badge>
          ) : (
            <Badge variant={t.level}>{TILE_LABEL[t.level]}</Badge>
          )}
        </li>
      ))}
    </ul>
  );
}
