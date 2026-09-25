'use client';

import { AlertTriangle, CheckCircle2, CircleHelp, Sparkles, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { insightViewState, learnerStatusLine, missedQuestionsState, revisionTargets, stuckLabel, type InsightLearner, type MissedQuestion, type RevisionTarget, type UnitInsight as Insight } from '@/lib/unit-insight';
import { LearnerLink } from '@/components/students/LearnerLink';

function LearnerRow({ learner }: { learner: InsightLearner }) {
  const stuck = stuckLabel(learner.stuck, learner.lastActivityAt);
  const done = learner.status === 'completed';
  return (
    <li className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
      <div className="min-w-0 flex-1">
        <LearnerLink studentId={learner.studentId} name={learner.name} className="block truncate text-sm font-medium" />
        <p className="truncate text-xs text-muted-foreground">{learnerStatusLine(learner)}</p>
        {stuck ? (
          <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-attention-soft px-2 py-0.5 text-xs font-medium text-attention">
            <AlertTriangle className="h-3 w-3" aria-hidden /> {stuck}
          </p>
        ) : null}
      </div>
      <div className="flex w-full items-center gap-2 sm:w-40">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div className={`h-full rounded-full ${done ? 'bg-success' : learner.stuck ? 'bg-attention' : 'bg-accent-foreground'}`} style={{ width: `${learner.progressPercent}%` }} />
        </div>
        <span className="w-10 text-right font-mono text-xs tabular-nums text-muted-foreground">{learner.progressPercent}%</span>
      </div>
    </li>
  );
}

function MissedRow({ question }: { question: MissedQuestion }) {
  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <span className="mt-0.5 w-12 shrink-0 font-mono text-sm font-semibold tabular-nums text-destructive">{question.wrongPercent}%</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm">{question.stem}</p>
        <p className="text-xs text-muted-foreground">{question.itemTitle} · {question.wrong} of {question.answered} answers wrong</p>
      </div>
    </li>
  );
}

interface RevisionProps {
  /** The check a revision item is being written after, if any. */
  busyItemId: string | null;
  error: { itemId: string; message: string } | null;
  onAdd: (target: RevisionTarget) => void;
}

function RevisionActions({ missed, busyItemId, error, onAdd }: RevisionProps & { missed: MissedQuestion[] }) {
  const targets = revisionTargets(missed);
  return (
    <div className="space-y-2">
      {targets.map((t) => (
        <div key={t.itemId} className="space-y-2">
          <Button variant="outline" size="sm" onClick={() => onAdd(t)} disabled={busyItemId !== null} className="min-h-11 gap-1.5 sm:min-h-8">
            <Sparkles className="h-4 w-4" aria-hidden />
            {busyItemId === t.itemId ? 'Writing the revision item…' : `Add a revision item after ${t.itemTitle}`}
          </Button>
          {error?.itemId === t.itemId ? <p role="alert" className="rounded-md border border-destructive bg-destructive-soft px-3 py-2 text-sm text-destructive">{error.message}</p> : null}
        </div>
      ))}
      <p className="text-xs text-muted-foreground">The AI re-teaches these questions with fresh examples. It goes in right after the check as optional practice: it never holds anyone back.</p>
    </div>
  );
}

/** A released unit's class view: who is stuck, who is where, and what the class gets wrong. */
const MISSED_COPY: Record<'none-yet' | 'no-quick-checks', string> = {
  'none-yet': "No wrong answers on the quick checks yet.",
  'no-quick-checks': "This unit doesn't have any quick checks yet.",
};

export function UnitInsight({ insight, error, revision }: { insight: Insight | null; error: string | null; revision: RevisionProps }) {
  const state = insightViewState(insight, error);
  if (state === 'error') return <p role="alert" className="rounded-lg border border-destructive bg-destructive-soft px-3 py-2 text-sm text-destructive">{error}</p>;
  if (state === 'loading') return <LoadingSpinner />;
  if (state === 'empty') {
    return <EmptyState icon={Users} title="No learners yet" description="When learners in the class start the unit, you'll see where each one is here." />;
  }
  // state === 'ready'
  const unitInsight = insight as Insight;
  const { totals } = unitInsight;
  const missedState = missedQuestionsState(unitInsight);
  return (
    <section className="space-y-4" aria-labelledby="unit-insight-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="unit-insight-title" className="text-lg font-semibold">Your class</h2>
        <p className="text-sm text-muted-foreground">
          <span className="font-mono tabular-nums text-foreground">{totals.completed}</span> of {totals.enrolled} finished
          {totals.stuck > 0 ? <> · <span className="font-medium text-attention">{totals.stuck} stuck</span></> : null}
        </p>
      </div>
      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card" aria-label="Learners">
        {unitInsight.learners.map((l) => <LearnerRow key={l.enrolmentId} learner={l} />)}
      </ul>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Where the class is</h3>
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card" aria-label="Unit items">
          {unitInsight.items.map((it) => (
            <li key={it.id} className="flex items-center justify-between gap-2 px-4 py-2 text-sm">
              <span className="min-w-0 truncate">{it.title}</span>
              <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">reached by {it.reached}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold"><CircleHelp className="h-4 w-4 text-muted-foreground" aria-hidden /> Questions the class gets wrong most</h3>
        {missedState !== 'has-missed' ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-success" aria-hidden /> {MISSED_COPY[missedState]}</p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {unitInsight.mostMissed.map((q) => <MissedRow key={q.questionId} question={q} />)}
          </ul>
        )}
        {missedState === 'has-missed' ? <RevisionActions missed={unitInsight.mostMissed} {...revision} /> : null}
      </div>
    </section>
  );
}
