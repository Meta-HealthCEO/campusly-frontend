'use client';

import { AlertTriangle, BookOpen, CheckCircle2, ListChecks, Loader2, RotateCcw, Sigma, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ITEM_KIND_LABEL, isStuckWriting } from '@/lib/course-unit';
import type { CourseLesson, ItemKind } from '@/types/courses';

const KIND_ICON: Record<ItemKind, typeof BookOpen> = {
  notes: BookOpen,
  worked_example: Sigma,
  quick_check: ListChecks,
};

interface Props {
  item: CourseLesson;
  /** The outline is still being checked: items can be removed, nothing is written yet. */
  outlineStage: boolean;
  onOpen: () => void;
  onRetry: () => void;
  onRemove: () => void;
  busy: boolean;
}

function StatusLine({ item }: { item: CourseLesson }) {
  switch (item.genStatus) {
    case 'pending':
      return <span className="text-muted-foreground">Waiting to be written</span>;
    case 'generating':
      return <span className="inline-flex items-center gap-1 text-accent-foreground"><Loader2 className="h-3 w-3 animate-spin" aria-hidden /> Writing…</span>;
    case 'failed':
      return <span className="inline-flex items-center gap-1 text-destructive"><AlertTriangle className="h-3 w-3" aria-hidden /> Couldn&apos;t be written</span>;
    case 'ready':
      return <span className="inline-flex items-center gap-1 text-success"><CheckCircle2 className="h-3 w-3" aria-hidden /> Ready</span>;
    default:
      return null;
  }
}

/** One item in a unit: what it is, how long it takes, its CAPS reference, and where its writing is. */
export function UnitItemRow({ item, outlineStage, onOpen, onRetry, onRemove, busy }: Props) {
  const kind = item.itemKind ?? 'notes';
  const Icon = KIND_ICON[kind];
  const openable = item.genStatus === 'ready';
  // Failed, or left half-written by a restart: either way the teacher can try again.
  const retryable = item.genStatus === 'failed' || isStuckWriting(item);
  return (
    <li className="group flex items-start gap-3 py-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground" aria-hidden>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        {openable ? (
          <button type="button" onClick={onOpen} className="text-left text-sm font-medium underline-offset-2 hover:underline focus-visible:underline focus-visible:outline-none">
            {item.title}
          </button>
        ) : (
          <p className="text-sm font-medium">{item.title}</p>
        )}
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          <span>{ITEM_KIND_LABEL[kind]}</span>
          <span aria-hidden>·</span>
          <span className="font-mono tabular-nums">{item.minutes ?? '–'} min</span>
          {item.capsRef ? <><span aria-hidden>·</span><span className="truncate">CAPS: {item.capsRef}</span></> : null}
          {item.genStatus ? <><span aria-hidden>·</span><StatusLine item={item} /></> : null}
          {item.teacherEdited ? <><span aria-hidden>·</span><span className="rounded-full bg-accent px-1.5 py-0.5 font-medium text-accent-foreground">Edited by you</span></> : null}
        </p>
        {outlineStage && item.brief ? <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.brief}</p> : null}
        {item.genStatus === 'failed' && item.genError ? <p className="mt-1 text-xs text-destructive">{item.genError}</p> : null}
      </div>
      {retryable ? (
        <Button size="sm" variant="outline" onClick={onRetry} disabled={busy} className="min-h-11 shrink-0 gap-1 sm:min-h-8">
          <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Try again
        </Button>
      ) : null}
      {outlineStage || retryable ? (
        <Button size="icon-sm" variant="ghost" onClick={onRemove} disabled={busy} aria-label={`Remove ${item.title}`} className="shrink-0">
          <X className="h-4 w-4" />
        </Button>
      ) : null}
    </li>
  );
}
