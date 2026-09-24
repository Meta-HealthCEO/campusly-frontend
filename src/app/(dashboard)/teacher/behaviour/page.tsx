'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, HeartHandshake, Plus } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button, buttonVariants } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BehaviourFeed } from '@/components/behaviour/BehaviourFeed';
import { LogBehaviourDialog } from '@/components/behaviour/LogBehaviourDialog';
import { useTeacherClasses } from '@/hooks/useTeacherClasses';
import { useBehaviourActions, useClassBehaviour, type LogBehaviourInput } from '@/hooks/useBehaviour';
import { resolveId } from '@/lib/api-helpers';
import { getStudentDisplayName } from '@/lib/student-helpers';
import { ROUTES } from '@/lib/routes';
import { cn } from '@/lib/utils';
import type { PopulatedId } from '@/types';

/** One behaviour log for the teacher's classes: log in a few taps, see what's been noted. */
export default function BehaviourPage() {
  const { entries: classEntries } = useTeacherClasses();
  const classes = useMemo(() => {
    const seen = new Map<string, { id: string; name: string; learners: Array<{ id: string; name: string }> }>();
    for (const e of classEntries) {
      const id = resolveId(e.class as unknown as PopulatedId);
      if (!id || seen.has(id)) continue;
      seen.set(id, {
        id,
        name: e.class.name,
        learners: e.students.map((s) => ({ id: resolveId(s as unknown as PopulatedId), name: getStudentDisplayName(s).full })).filter((l) => l.id),
      });
    }
    return [...seen.values()];
  }, [classEntries]);

  const [picked, setPicked] = useState('');
  const classId = classes.some((c) => c.id === picked) ? picked : classes[0]?.id ?? '';
  const current = classes.find((c) => c.id === classId);
  const feed = useClassBehaviour(classId);
  const actions = useBehaviourActions();
  const [logging, setLogging] = useState(false);

  const logIt = async (input: LogBehaviourInput): Promise<void> => {
    if (await actions.log(input)) {
      setLogging(false);
      await feed.refresh();
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Behaviour" description="Merits, demerits and incidents for your classes, in one place. Each one shows on the learner's profile.">
        <Button onClick={() => { actions.clearLogError(); setLogging(true); }} disabled={!current} className="min-h-11 w-full gap-1.5 sm:min-h-9 sm:w-auto">
          <Plus className="h-4 w-4" aria-hidden /> Log behaviour
        </Button>
      </PageHeader>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Select value={classId} onValueChange={(v: unknown) => setPicked(String(v))}>
          <SelectTrigger className="w-full sm:w-56" aria-label="Class"><SelectValue placeholder="Pick a class" /></SelectTrigger>
          <SelectContent>
            {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground" aria-live="polite">
          <span className="font-mono tabular-nums text-success">{feed.summary.merits}</span> merits ·{' '}
          <span className="font-mono tabular-nums text-attention">{feed.summary.demerits}</span> demerits ·{' '}
          <span className="font-mono tabular-nums text-destructive">{feed.summary.incidents}</span> incidents lately
        </p>
      </div>

      <BehaviourFeed
        entries={feed.entries}
        loading={feed.loading}
        error={feed.error}
        onUndo={(e) => void actions.undo(e.id).then((ok) => { if (ok) void feed.refresh(); })}
      />

      <div className="flex flex-col gap-2 sm:flex-row">
        <Link href={ROUTES.TEACHER_INCIDENTS} className={cn(buttonVariants({ variant: 'outline' }), 'min-h-11 gap-1.5 sm:min-h-9')}>
          <AlertTriangle className="h-4 w-4" aria-hidden /> Report a serious incident
        </Link>
        <Link href={ROUTES.TEACHER_REFERRAL} className={cn(buttonVariants({ variant: 'outline' }), 'min-h-11 gap-1.5 sm:min-h-9')}>
          <HeartHandshake className="h-4 w-4" aria-hidden /> Refer to counsellor
        </Link>
      </div>

      {logging && current ? (
        <LogBehaviourDialog
          open
          onOpenChange={setLogging}
          learners={current.learners}
          source="log"
          saving={actions.logging}
          error={actions.logError}
          onLog={(input) => void logIt(input)}
        />
      ) : null}
    </div>
  );
}
