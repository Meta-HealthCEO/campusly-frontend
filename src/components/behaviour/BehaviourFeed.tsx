'use client';

import { Shield, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { LearnerLink } from '@/components/students/LearnerLink';
import { KIND_TONE, entryLabel } from '@/lib/behaviour';
import { lastSeenLabel } from '@/lib/unit-insight';
import type { BehaviourFeedEntry } from '@/hooks/useBehaviour';

interface Props {
  entries: BehaviourFeedEntry[];
  loading: boolean;
  error: string | null;
  onUndo: (entry: BehaviourFeedEntry) => void;
}

/** A class's recent merits, demerits and incidents, newest first. */
export function BehaviourFeed({ entries, loading, error, onUndo }: Props) {
  if (error) return <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive-soft px-3 py-2 text-sm text-destructive">{error}</p>;
  if (loading && entries.length === 0) return <LoadingSpinner />;
  if (entries.length === 0) {
    return <EmptyState icon={Shield} title="Nothing logged yet" description="Log a merit when a learner does well, or a demerit when a rule is broken. It shows on the learner's profile." />;
  }
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card" aria-label="Recent behaviour">
      {entries.map((e) => (
        <li key={e.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start sm:gap-4">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <LearnerLink studentId={e.studentId} name={e.studentName} className="text-sm font-medium" />
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${KIND_TONE[e.kind]}`}>{entryLabel(e)}</span>
            </div>
            {e.note ? <p className="text-sm text-muted-foreground">{e.note}</p> : null}
            <p className="text-xs text-muted-foreground">{lastSeenLabel(e.occurredAt)}{e.loggedByName ? ` · ${e.loggedByName}` : ''}</p>
          </div>
          {e.canUndo ? (
            <Button variant="ghost" size="sm" onClick={() => onUndo(e)} className="min-h-11 gap-1.5 self-start sm:min-h-8">
              <Undo2 className="h-4 w-4" aria-hidden /> Undo
            </Button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
