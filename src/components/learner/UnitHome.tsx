'use client';

import { BookOpen, CheckCircle2, ClipboardList, HelpCircle, ListChecks, Lock, PlayCircle, Sigma } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { learnerItemLabel, moduleProgress, resumeTarget, unitDone, type LearnerItem, type LearnerUnit } from '@/lib/learner-unit';
import type { ItemKind } from '@/types/courses';

const KIND_ICON: Record<ItemKind, typeof BookOpen> = { notes: BookOpen, worked_example: Sigma, quick_check: ListChecks };
const TYPE_ICON: Record<string, typeof BookOpen> = { content: BookOpen, chapter: BookOpen, homework: ClipboardList, quiz: HelpCircle };

interface Props {
  unit: LearnerUnit & { description?: string };
  progressPercent: number;
  onOpen: (lessonId: string) => void;
}

function ItemRow({ item, onOpen }: { item: LearnerItem; onOpen: () => void }) {
  // AI-generated items carry `itemKind`; hand-built ones only carry `type`.
  const Icon = item.itemKind ? KIND_ICON[item.itemKind] : TYPE_ICON[item.type ?? ''] ?? BookOpen;
  const locked = item.unlockStatus === 'locked' || !item.unlockStatus;
  const done = item.unlockStatus === 'completed';
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        disabled={locked}
        className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:bg-muted/50 focus-visible:outline-none"
      >
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${done ? 'bg-success-soft text-success' : 'bg-muted text-muted-foreground'}`} aria-hidden>
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{item.title}</span>
          <span className="block text-xs text-muted-foreground">
            {learnerItemLabel(item)}{item.minutes ? ` · ${item.minutes} min` : ''}{item.optional ? ' · Optional' : ''}
          </span>
        </span>
        {done ? <CheckCircle2 className="h-5 w-5 shrink-0 text-success" aria-label="Done" />
          : locked ? <Lock className="h-4 w-4 shrink-0 text-muted-foreground" aria-label="Finish the item before this one first" />
            : <PlayCircle className="h-5 w-5 shrink-0 text-accent-foreground" aria-label="Ready" />}
      </button>
    </li>
  );
}

/** A learner's view of a unit: where they are, each module's progress, each item's minutes and tick. */
export function UnitHome({ unit, progressPercent, onOpen }: Props) {
  const target = resumeTarget(unit);
  return (
    <div className="space-y-5">
      <header className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">{unit.title}</h1>
        {unit.description ? <p className="text-sm text-muted-foreground">{unit.description}</p> : null}
        <div className="space-y-1">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
            <div className="h-full rounded-full bg-accent-foreground transition-all" style={{ width: `${progressPercent}%` }} />
          </div>
          <p className="font-mono text-xs text-muted-foreground tabular-nums">{progressPercent}% done</p>
        </div>
        {target ? (
          <Button onClick={() => onOpen(target.lessonId)} className="h-auto min-h-12 w-full justify-start gap-2 whitespace-normal py-2 text-left sm:w-auto">
            <PlayCircle className="h-5 w-5 shrink-0" aria-hidden />
            <span className="min-w-0">{target.started ? 'Continue' : 'Start'}: {target.title}</span>
          </Button>
        ) : unitDone(unit) ? (
          <p className="flex items-center gap-2 rounded-lg border border-success/30 bg-success-soft px-3 py-2 text-sm text-success">
            <CheckCircle2 className="h-4 w-4" aria-hidden /> You&apos;ve finished this unit. Well done!
          </p>
        ) : null}
      </header>

      <ol className="space-y-4">
        {[...unit.modules].sort((a, b) => a.orderIndex - b.orderIndex).map((m, i) => {
          const p = moduleProgress(m);
          return (
            <li key={m.id} className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="space-y-1.5 border-b border-border px-4 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="text-base font-semibold"><span className="font-mono text-xs text-muted-foreground">{i + 1}.</span> {m.title}</h2>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">{p.total === 0 ? 'No items yet' : `${p.done} of ${p.total}`}</span>
                </div>
                <div className="h-1 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
                  <div className="h-full rounded-full bg-success" style={{ width: `${p.percent}%` }} />
                </div>
              </div>
              <ul className="divide-y divide-border">
                {[...m.lessons].sort((a, b) => a.orderIndex - b.orderIndex).map((item) => (
                  <ItemRow key={item.id} item={item} onOpen={() => onOpen(item.id)} />
                ))}
              </ul>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
