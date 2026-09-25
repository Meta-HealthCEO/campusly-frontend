'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { dueTone, markingItemHref, markingTypeLabel, type DueTone } from '@/lib/marking-queue';
import type { MarkingItem, MarkingItemType, MarkingPriority } from '@/types';

interface Props {
  item: MarkingItem;
}

const TYPE_CHIP: Record<MarkingItemType, string> = {
  paper: 'bg-accent-soft text-accent-foreground',
  homework: 'bg-info-soft text-info',
  assessment: 'bg-muted text-muted-foreground',
  ai_grading: 'bg-muted text-muted-foreground',
};

const PRIORITY_DOT: Record<MarkingPriority, string> = {
  high: 'bg-destructive',
  medium: 'bg-attention',
  low: 'bg-muted-foreground/50',
};

const DUE_TEXT: Record<DueTone, string> = {
  overdue: 'text-destructive',
  today: 'text-attention',
  later: 'text-muted-foreground',
  none: 'text-muted-foreground',
};

function dueLabel(dueDate: string, tone: DueTone): string {
  if (tone === 'none') return 'No due date';
  const date = new Date(dueDate).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
  if (tone === 'overdue') return `Was due ${date}`;
  if (tone === 'today') return 'Due today';
  return `Due ${date}`;
}

/** One marking task: what it is, whose it is, when it was due, and how much is left. Opens the exact place to mark it. */
export function MarkingItemCard({ item }: Props) {
  const marked = Math.max(0, item.totalCount - item.pendingCount);
  const percent = item.totalCount > 0 ? Math.round((marked / item.totalCount) * 100) : 0;
  const tone = dueTone(item.dueDate, new Date());

  return (
    <Link
      href={markingItemHref(item)}
      className="block rounded-xl border border-border bg-card p-4 transition-[border-color,box-shadow] hover:border-primary hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span aria-hidden className={cn('h-2 w-2 shrink-0 rounded-full', PRIORITY_DOT[item.priority])} />
          <h4 className="truncate text-sm font-medium">{item.title}</h4>
        </div>
        <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-xs font-medium', TYPE_CHIP[item.type])}>
          {markingTypeLabel(item.type)}
        </span>
      </div>

      <p className="mt-1.5 truncate text-xs text-muted-foreground">
        {item.subjectName} · {item.className}
      </p>
      <p className={cn('mt-1 text-xs font-medium', DUE_TEXT[tone])}>{dueLabel(item.dueDate, tone)}</p>

      <div className="mt-3 space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>
            <span className="font-mono tabular-nums text-foreground">{item.pendingCount}</span> to mark
            <span className="font-mono tabular-nums"> · {marked}/{item.totalCount}</span> done
          </span>
          <span className="font-mono tabular-nums">{percent}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${percent}%` }} />
        </div>
      </div>
    </Link>
  );
}
