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
import { useModule } from '@/hooks/useModule';
import { useBehaviourActions, useClassBehaviour, type LogBehaviourInput } from '@/hooks/useBehaviour';
import { resolveId } from '@/lib/api-helpers';
import { getStudentDisplayName } from '@/lib/student-helpers';
import { plural } from '@/lib/behaviour';
import { ROUTES } from '@/lib/routes';
import { cn } from '@/lib/utils';
import type { PopulatedId } from '@/types';

/** One behaviour log for the teacher's classes: log in a few taps, see what's been noted. */
export default function BehaviourPage() {
  const { entries: classEntries, loading: classesLoading } = useTeacherClasses();
  const { isModuleEnabled } = useModule();
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
  // Until the class list and that class's feed are in, show loading — not an
  // empty log with zero counts.
  const feedLoading = classesLoading || feed.loading;
  const firstLoad = feedLoading && feed.entries.length === 0;
  const { summary } = feed;

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
        {firstLoad ? null : (
          <p className="text-sm text-muted-foreground" aria-live="polite">
            <span className="font-mono tabular-nums text-success">{summary.merits}</span> {plural(summary.merits, 'merit')} ·{' '}
            <span className="font-mono tabular-nums text-attention">{summary.demerits}</span> {plural(summary.demerits, 'demerit')} ·{' '}
            <span className="font-mono tabular-nums text-destructive">{summary.incidents}</span> {plural(summary.incidents, 'incident')} lately
          </p>
        )}
      </div>

      <BehaviourFeed
        entries={feed.entries}
        loading={feedLoading}
        error={feed.error}
        onUndo={(e) => void actions.undo(e.id).then((ok) => { if (ok) void feed.refresh(); })}
      />

      <div className="flex flex-col gap-2 sm:flex-row">
        {isModuleEnabled('incident_wellbeing') ? (
          <Link href={ROUTES.TEACHER_INCIDENTS} className={cn(buttonVariants({ variant: 'outline' }), 'min-h-11 gap-1.5 sm:min-h-9')}>
            <AlertTriangle className="h-4 w-4" aria-hidden /> Report a serious incident
          </Link>
        ) : null}
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
