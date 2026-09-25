'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { CapsScopePicker } from '@/components/onboarding/CapsScopePicker';
import { FirstClassStep } from '@/components/onboarding/FirstClassStep';
import { FirstLessonStep } from '@/components/onboarding/FirstLessonStep';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';
import { useTeachingScope } from '@/hooks/useTeachingScope';
import { useTeacherOnboarding, type CreatedClass, type LinkedSchoolRow } from '@/hooks/useTeacherOnboarding';
import { extractErrorMessage } from '@/lib/api-helpers';
import {
  classOptions, onboardingStep, schoolPairFor, scopeFromPicks, stepAfterScopeSaved, type ClassOption, type GradePick,
} from '@/lib/onboarding';
import { cn } from '@/lib/utils';

type Step = 1 | 2 | 3;
type SchoolPair = { gradeId: string; subjectId: string };

const STEP_LABELS = ['What you teach', 'Your first class', 'Your first lesson'];
const ACTION = 'min-h-11 w-full sm:w-auto';

/** Class options for step 2, each tied to the school grade and subject saving the scope made. */
function optionsWithPairs(
  scope: Parameters<typeof classOptions>[0],
  rows: { grades: LinkedSchoolRow[]; subjects: LinkedSchoolRow[] },
): { options: ClassOption[]; pairs: Record<string, SchoolPair> } {
  const titles: Record<string, string> = {};
  for (const row of [...rows.grades, ...rows.subjects]) if (row.curriculumNodeId) titles[row.curriculumNodeId] = row.name;
  const pairs: Record<string, SchoolPair> = {};
  const options = classOptions(scope, titles).filter((o: ClassOption) => {
    const pair = schoolPairFor(o.capsGradeId, o.capsSubjectId, rows.grades, rows.subjects);
    if (pair) pairs[o.key] = pair;
    return Boolean(pair);
  });
  return { options, pairs };
}

export default function TeacherOnboardingPage() {
  const router = useRouter();
  const { status, loading: statusLoading, dismiss } = useOnboardingStatus();
  const { scope, loading: scopeLoading, save } = useTeachingScope();
  const { loadCapsFrameworkId, loadSchoolRows, createClass } = useTeacherOnboarding();

  const [override, setOverride] = useState<Step | null>(null);
  const [frameworkId, setFrameworkId] = useState<string | null>(null);
  const [picks, setPicks] = useState<GradePick[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [classChoices, setClassChoices] = useState<{ options: ClassOption[]; pairs: Record<string, SchoolPair> } | null>(null);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<CreatedClass | null>(null);
  const [skipping, setSkipping] = useState(false);

  const step = override ?? (statusLoading ? null : onboardingStep(status));
  const shownPicks = picks ?? scope.subjectsByGrade;
  const canSaveScope = useMemo(() => scopeFromPicks(shownPicks).grades.length > 0, [shownPicks]);

  useEffect(() => {
    if (step === 'done') router.replace('/teacher');
  }, [step, router]);

  useEffect(() => {
    if (step !== 1 || frameworkId) return;
    loadCapsFrameworkId()
      .then((id: string | null) => setFrameworkId(id ?? ''))
      .catch((err: unknown) => {
        console.error('Failed to load the CAPS framework', err);
        setFrameworkId('');
      });
  }, [step, frameworkId, loadCapsFrameworkId]);

  useEffect(() => {
    if (step !== 2 || classChoices || scopeLoading) return;
    loadSchoolRows()
      .then((rows) => setClassChoices(optionsWithPairs(scope, rows)))
      .catch((err: unknown) => {
        console.error('Failed to load grades and subjects', err);
        setClassChoices({ options: [], pairs: {} });
      });
  }, [step, classChoices, scopeLoading, scope, loadSchoolRows]);

  const saveScope = async (): Promise<void> => {
    setSaving(true);
    const saved = await save(scopeFromPicks(shownPicks));
    setSaving(false);
    if (!saved) {
      toast.error("Couldn't save what you teach. Try again.");
      return;
    }
    setClassChoices(null);
    const next = stepAfterScopeSaved(status);
    if (next === 'done') router.push('/teacher');
    else setOverride(next);
  };

  const makeClass = async (name: string, option: ClassOption): Promise<void> => {
    const pair = classChoices?.pairs[option.key];
    if (!pair) return;
    setCreating(true);
    try {
      setCreated(await createClass(name, pair.gradeId, pair.subjectId));
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, "Couldn't create the class. Try again."));
    } finally {
      setCreating(false);
    }
  };

  const skipLesson = async (): Promise<void> => {
    setSkipping(true);
    await dismiss();
    router.push('/teacher');
  };

  if (step === null || step === 'done' || scopeLoading) return <LoadingSpinner />;

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-0 py-2 sm:py-8">
      <ol className="grid grid-cols-3 gap-2" aria-label="Setup steps">
        {STEP_LABELS.map((label: string, i: number) => (
          <li key={label} className="space-y-1.5" aria-current={i + 1 === step ? 'step' : undefined}>
            <div className={cn('h-1 rounded-full', i + 1 <= step ? 'bg-primary' : 'bg-muted')} />
            <p className={cn('text-xs', i + 1 === step ? 'font-medium text-foreground' : 'text-muted-foreground')}>
              <span className="font-mono">{i + 1}</span> {label}
            </p>
          </li>
        ))}
      </ol>

      <section className="rounded-xl border bg-card p-4 sm:p-6">
        {step === 1 ? (
          <div className="space-y-4">
            <div>
              <h1 className="text-lg font-semibold">What do you teach?</h1>
              <p className="text-sm text-muted-foreground">Pick your grades, then the subjects in each. Lessons, papers and AI use these.</p>
            </div>
            {frameworkId === null ? <LoadingSpinner /> : <CapsScopePicker frameworkId={frameworkId} picks={shownPicks} onChange={setPicks} />}
          </div>
        ) : step === 2 ? (
          <FirstClassStep
            options={classChoices?.options ?? []}
            loading={classChoices === null}
            creating={creating}
            created={created}
            onCreate={(name: string, option: ClassOption) => void makeClass(name, option)}
          />
        ) : (
          <FirstLessonStep preferredClassId={created?.id ?? null} onMakeClass={() => { setCreated(null); setOverride(2); }} />
        )}
      </section>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
        {step === 2 && !created ? (
          <Button variant="ghost" className={ACTION} onClick={() => setOverride(1)} disabled={creating}>
            <ChevronLeft className="h-4 w-4" aria-hidden /> Back
          </Button>
        ) : <span className="hidden sm:block" />}
        {step === 1 ? (
          <Button className={ACTION} onClick={() => void saveScope()} disabled={!canSaveScope || saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null} Save and continue
          </Button>
        ) : step === 2 && !created ? (
          <Button type="submit" form="first-class-form" className={ACTION} disabled={creating || !classChoices?.options.length}>
            {creating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null} Create class
          </Button>
        ) : step === 2 ? (
          <Button className={ACTION} onClick={() => setOverride(3)}>Continue</Button>
        ) : (
          <Button variant="outline" className={ACTION} onClick={() => void skipLesson()} disabled={skipping}>
            Skip for now
          </Button>
        )}
      </div>
    </div>
  );
}
