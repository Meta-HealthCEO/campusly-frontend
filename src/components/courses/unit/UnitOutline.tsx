'use client';

import { UnitItemRow } from '@/components/courses/unit/UnitItemRow';
import { formatMinutes, moduleMinutes } from '@/lib/course-unit';
import type { CourseLesson, CourseTree } from '@/types/courses';

interface Props {
  course: CourseTree;
  outlineStage: boolean;
  busyItemId: string | null;
  onOpen: (item: CourseLesson) => void;
  onRetry: (item: CourseLesson) => void;
  onRemove: (item: CourseLesson) => void;
}

function weeksLabel(weeks: number[] | undefined): string {
  if (!weeks || weeks.length === 0) return '';
  const first = Math.min(...weeks);
  const last = Math.max(...weeks);
  return first === last ? `Week ${first}` : `Weeks ${first}–${last}`;
}

/** The unit's modules in order, each with its items. */
export function UnitOutline({ course, outlineStage, busyItemId, onOpen, onRetry, onRemove }: Props) {
  return (
    <ol className="space-y-4">
      {course.modules.map((m, i) => (
        <li key={m.id} className="rounded-xl border border-border bg-card">
          <header className="flex flex-col gap-1 border-b border-border px-4 py-3 sm:flex-row sm:items-baseline sm:justify-between">
            <div className="min-w-0">
              <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
                Module {i + 1}{weeksLabel(m.weekNumbers) ? ` · ${weeksLabel(m.weekNumbers)}` : ''}
              </p>
              <h3 className="text-base font-semibold text-balance">{m.title}</h3>
            </div>
            <p className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
              {m.lessons.length} item{m.lessons.length === 1 ? '' : 's'} · {formatMinutes(moduleMinutes(m))}
            </p>
          </header>
          {m.objectives && m.objectives.length > 0 ? (
            <ul className="space-y-0.5 border-b border-border px-4 py-2 text-xs text-muted-foreground" aria-label="Learning objectives">
              {m.objectives.map((o) => <li key={o}>{o}</li>)}
            </ul>
          ) : null}
          <ul className="divide-y divide-border px-4">
            {m.lessons.map((item) => (
              <UnitItemRow
                key={item.id}
                item={item}
                outlineStage={outlineStage}
                busy={busyItemId === item.id}
                onOpen={() => onOpen(item)}
                onRetry={() => onRetry(item)}
                onRemove={() => onRemove(item)}
              />
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}
