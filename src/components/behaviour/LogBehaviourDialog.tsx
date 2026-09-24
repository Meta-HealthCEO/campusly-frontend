'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BEHAVIOUR_CATEGORIES, BEHAVIOUR_KINDS, SEVERITY_OPTIONS, logProblem, type BehaviourKind, type Severity } from '@/lib/behaviour';
import { ROUTES } from '@/lib/routes';
import { cn } from '@/lib/utils';
import type { LogBehaviourInput } from '@/hooks/useBehaviour';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Learners to choose from; ignored when a learner is already chosen. */
  learners: Array<{ id: string; name: string }>;
  learner?: { id: string; name: string };
  source: LogBehaviourInput['source'];
  saving: boolean;
  error: string | null;
  onLog: (input: LogBehaviourInput) => void;
}

const chip = (on: boolean) => cn(
  'min-h-11 rounded-full border px-3 text-sm transition-colors sm:min-h-9',
  on ? 'border-accent-foreground/40 bg-accent font-medium text-accent-foreground' : 'border-border hover:bg-muted',
);

/** Log a merit, demerit or incident in a few taps. */
export function LogBehaviourDialog({ open, onOpenChange, learners, learner, source, saving, error, onLog }: Props) {
  const [studentId, setStudentId] = useState(learner?.id ?? '');
  const [kind, setKind] = useState<BehaviourKind>('merit');
  const [category, setCategory] = useState('');
  const [points, setPoints] = useState(1);
  const [severity, setSeverity] = useState<Severity>('low');
  const [note, setNote] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  // One key per log: a double tap, or a retry after a dropped connection, logs once.
  const [requestKey] = useState(() => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`));

  const chooseKind = (next: BehaviourKind): void => {
    setKind(next);
    setCategory('');
    setSeverity(next === 'incident' ? 'medium' : 'low');
    setProblem(null);
  };

  const submit = (): void => {
    const missing = logProblem({ studentId, kind, category, note });
    if (missing) return setProblem(missing);
    onLog({
      studentId, kind, category, source, requestKey,
      ...(kind !== 'incident' ? { points } : {}),
      ...(kind !== 'merit' ? { severity } : {}),
      ...(note.trim() ? { note: note.trim() } : {}),
    });
  };

  return (
    <Dialog open={open} onOpenChange={(next: boolean) => { if (!saving) onOpenChange(next); }}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{learner ? `Log behaviour for ${learner.name}` : 'Log behaviour'}</DialogTitle>
          <DialogDescription>It goes on the learner&apos;s profile. You can undo it for a day.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto py-2">
          {!learner ? (
            <div className="space-y-1.5">
              <Label htmlFor="behaviour-learner">Learner</Label>
              <Select value={studentId} onValueChange={(v: unknown) => { setStudentId(String(v)); setProblem(null); }}>
                <SelectTrigger id="behaviour-learner" className="w-full"><SelectValue placeholder="Pick a learner" /></SelectTrigger>
                <SelectContent>
                  {learners.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <fieldset className="space-y-1.5">
            <legend className="text-sm font-medium">What kind</legend>
            <div className="flex flex-wrap gap-2">
              {BEHAVIOUR_KINDS.map((k) => (
                <button key={k.value} type="button" aria-pressed={kind === k.value} onClick={() => chooseKind(k.value)} className={chip(kind === k.value)}>
                  {k.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="space-y-1.5">
            <legend className="text-sm font-medium">For</legend>
            <div className="flex flex-wrap gap-2">
              {BEHAVIOUR_CATEGORIES[kind].map((c) => (
                <button key={c.value} type="button" aria-pressed={category === c.value} onClick={() => { setCategory(c.value); setProblem(null); }} className={chip(category === c.value)}>
                  {c.label}
                </button>
              ))}
            </div>
          </fieldset>

          {kind !== 'incident' ? (
            <fieldset className="space-y-1.5">
              <legend className="text-sm font-medium">Points</legend>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" aria-pressed={points === n} onClick={() => setPoints(n)} className={cn(chip(points === n), 'w-11 px-0 font-mono tabular-nums')}>
                    {kind === 'merit' ? `+${n}` : `−${n}`}
                  </button>
                ))}
              </div>
            </fieldset>
          ) : null}

          {kind !== 'merit' ? (
            <fieldset className="space-y-1.5">
              <legend className="text-sm font-medium">How serious</legend>
              <div className="flex gap-2">
                {SEVERITY_OPTIONS.map((s) => (
                  <button key={s.value} type="button" aria-pressed={severity === s.value} onClick={() => setSeverity(s.value)} className={chip(severity === s.value)}>{s.label}</button>
                ))}
              </div>
            </fieldset>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="behaviour-note">{kind === 'merit' ? 'Note (optional)' : 'What happened'}</Label>
            <Textarea id="behaviour-note" value={note} onChange={(e) => { setNote(e.target.value); setProblem(null); }} rows={3} maxLength={500} />
          </div>

          {kind === 'incident' ? (
            <p className="text-xs text-muted-foreground">
              For something serious, also <Link href={ROUTES.TEACHER_INCIDENTS} className="underline underline-offset-2">report an incident</Link> so the school can follow it up.
            </p>
          ) : null}
          {problem || error ? <p role="alert" className="rounded-md border border-destructive/30 bg-destructive-soft px-3 py-2 text-sm text-destructive">{problem ?? error}</p> : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving} className="min-h-11 sm:min-h-9">Cancel</Button>
          <Button onClick={submit} disabled={saving} className="min-h-11 sm:min-h-9">{saving ? 'Logging…' : 'Log it'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
