'use client';

import { useEffect, useState } from 'react';
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

// How long the "Confirm undo" state stays up before reverting to "Undo", so
// a stray second tap minutes later can't undo something by accident.
const CONFIRM_TIMEOUT_MS = 4000;

/** One entry's Undo button: a tap reveals a confirm step before it actually undoes. */
function UndoButton({ entry, onUndo }: { entry: BehaviourFeedEntry; onUndo: (entry: BehaviourFeedEntry) => void }) {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => setConfirming(false), CONFIRM_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [confirming]);

  if (confirming) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => { setConfirming(false); onUndo(entry); }}
        className="min-h-11 gap-1.5 self-start text-destructive sm:min-h-8"
        aria-label={`Confirm undo ${entry.kind} for ${entry.studentName}`}
      >
        <Undo2 className="h-4 w-4" aria-hidden /> Confirm undo
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setConfirming(true)}
      className="min-h-11 gap-1.5 self-start sm:min-h-8"
      aria-label={`Undo ${entry.kind} for ${entry.studentName}`}
    >
      <Undo2 className="h-4 w-4" aria-hidden /> Undo
    </Button>
  );
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
          {e.canUndo ? <UndoButton entry={e} onUndo={onUndo} /> : null}
        </li>
      ))}
    </ul>
  );
}
