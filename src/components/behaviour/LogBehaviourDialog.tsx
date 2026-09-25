'use client';

import { useRef, useState } from 'react';
import { Radio } from '@base-ui/react/radio';
import { RadioGroup } from '@base-ui/react/radio-group';
import { useModule } from '@/hooks/useModule';
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
  const { isModuleEnabled } = useModule();
  // One key per version of the log: a double tap or a retry of the same log saves once; a changed log gets a new key.
  const sent = useRef<{ log: string; key: string } | null>(null);

  const chooseKind = (next: BehaviourKind): void => {
    setKind(next);
    setCategory('');
    setSeverity(next === 'incident' ? 'medium' : 'low');
    setProblem(null);
  };

  const submit = (): void => {
    const missing = logProblem({ studentId, kind, category, note });
    if (missing) return setProblem(missing);
    const log = JSON.stringify([studentId, kind, category, points, severity, note]);
    if (sent.current?.log !== log) {
      sent.current = { log, key: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}` };
    }
    const requestKey = sent.current.key;
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
            <RadioGroup aria-label="What kind" value={kind} onValueChange={(v) => chooseKind(v as BehaviourKind)} className="flex flex-wrap gap-2">
              {BEHAVIOUR_KINDS.map((k) => (
                <Radio.Root key={k.value} value={k.value} nativeButton render={<button type="button" className={chip(kind === k.value)} />}>
                  {k.label}
                </Radio.Root>
              ))}
            </RadioGroup>
          </fieldset>

          <fieldset className="space-y-1.5">
            <legend className="text-sm font-medium">For</legend>
            <RadioGroup
              aria-label="For"
              value={category}
              onValueChange={(v) => { setCategory(v as string); setProblem(null); }}
              className="flex flex-wrap gap-2"
            >
              {BEHAVIOUR_CATEGORIES[kind].map((c) => (
                <Radio.Root key={c.value} value={c.value} nativeButton render={<button type="button" className={chip(category === c.value)} />}>
                  {c.label}
                </Radio.Root>
              ))}
            </RadioGroup>
          </fieldset>

          {kind !== 'incident' ? (
            <fieldset className="space-y-1.5">
              <legend className="text-sm font-medium">Points</legend>
              <RadioGroup aria-label="Points" value={points} onValueChange={(v) => setPoints(v as number)} className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Radio.Root
                    key={n}
                    value={n}
                    nativeButton
                    render={<button type="button" className={cn(chip(points === n), 'w-11 px-0 font-mono tabular-nums')} />}
                  >
                    {kind === 'merit' ? `+${n}` : `−${n}`}
                  </Radio.Root>
                ))}
              </RadioGroup>
            </fieldset>
          ) : null}

          {kind !== 'merit' ? (
            <fieldset className="space-y-1.5">
              <legend className="text-sm font-medium">How serious</legend>
              <RadioGroup aria-label="How serious" value={severity} onValueChange={(v) => setSeverity(v as Severity)} className="flex gap-2">
                {SEVERITY_OPTIONS.map((s) => (
                  <Radio.Root key={s.value} value={s.value} nativeButton render={<button type="button" className={chip(severity === s.value)} />}>
                    {s.label}
                  </Radio.Root>
                ))}
              </RadioGroup>
            </fieldset>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="behaviour-note">{kind === 'merit' ? 'Note (optional)' : 'What happened'}</Label>
            <Textarea id="behaviour-note" value={note} onChange={(e) => { setNote(e.target.value); setProblem(null); }} rows={3} maxLength={500} />
            <p className="text-xs text-muted-foreground">Parents see this note.</p>
          </div>

          {kind === 'incident' && isModuleEnabled('incident_wellbeing') ? (
            <p className="text-xs text-muted-foreground">
              For something serious, also <Link href={ROUTES.TEACHER_INCIDENTS} className="underline underline-offset-2">report an incident</Link> so the school can follow it up.
            </p>
          ) : null}
          {problem || error ? <p role="alert" className="rounded-md border border-destructive bg-destructive-soft px-3 py-2 text-sm text-destructive">{problem ?? error}</p> : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving} className="min-h-11 sm:min-h-9">Cancel</Button>
          <Button onClick={submit} disabled={saving} className="min-h-11 sm:min-h-9">{saving ? 'Logging…' : 'Log it'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
