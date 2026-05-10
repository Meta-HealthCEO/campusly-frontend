'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { LessonScaffoldPreview } from '@/components/lessons/LessonScaffoldPreview';
import { NewLessonStep1 } from '@/components/lessons/NewLessonStep1';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCurriculumStructure } from '@/hooks/useCurriculumStructure';
import { useLessonScaffold } from '@/hooks/useLessonScaffold';
import type { ScaffoldedOutline } from '@/types/lesson';
import type { CurriculumNodeItem } from '@/types';

type Step = 1 | 2 | 3;

interface FormState {
  curriculumNodeId: string;
  /** CurriculumNode subject _id, derived from the picked topic. */
  subjectId: string;
  /** CurriculumNode grade _id, derived from the picked topic. */
  gradeId: string;
  termNumber: number;
  durationMinutes: number;
  title: string;
  hints: string;
}

/** South African school terms — Jan-Mar=1, Apr-Jun=2, Jul-Sep=3, Oct-Dec=4. */
function currentSATerm(): number {
  const month = new Date().getMonth(); // 0-11
  if (month <= 2) return 1;
  if (month <= 5) return 2;
  if (month <= 8) return 3;
  return 4;
}

export default function NewLessonPage() {
  const router = useRouter();
  const { frameworks, selectedFramework } = useCurriculumStructure();
  const { scaffold, createLesson, scaffolding, creating } = useLessonScaffold();

  // Auto-pick the school's default framework — the new flow drops the
  // framework Select in favour of "just use the right one".
  const defaultFrameworkId =
    frameworks.find((f) => f.isDefault)?.id ?? frameworks[0]?.id ?? selectedFramework ?? '';

  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormState>({
    curriculumNodeId: '',
    subjectId: '',
    gradeId: '',
    termNumber: currentSATerm(),
    durationMinutes: 45,
    title: '',
    hints: '',
  });
  const [outline, setOutline] = useState<ScaffoldedOutline | null>(null);

  const update = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  const onTopicSelect = (node: CurriculumNodeItem) => {
    setForm((f) => ({
      ...f,
      curriculumNodeId: node.id,
      title: f.title || node.title,
      // Adopt the topic's own subject/grade/term — single source of truth.
      // These are CurriculumNode IDs (the backend now accepts them).
      subjectId: node.subjectId ?? f.subjectId,
      gradeId: node.gradeId ?? f.gradeId,
      termNumber: typeof node.termNumber === 'number' ? node.termNumber : f.termNumber,
    }));
  };

  const onScaffold = async () => {
    try {
      // Scaffold is curriculum-driven; subject/grade are optional context.
      await runScaffold();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate outline';
      toast.error(msg);
    }
  };

  const runScaffold = async () => {
    const result = await scaffold({
      curriculumNodeId: form.curriculumNodeId,
      subjectId: form.subjectId || undefined,
      gradeId: form.gradeId || undefined,
      durationMinutes: form.durationMinutes,
      hints: form.hints || undefined,
    });
    setOutline(result);
    setStep(3);
  };

  const onCreate = async (finalOutline: ScaffoldedOutline | null) => {
    try {
      const lesson = await createLesson({
        // Optional — backend derives them from the topic when omitted.
        subjectId: form.subjectId || undefined,
        gradeId: form.gradeId || undefined,
        curriculumNodeId: form.curriculumNodeId,
        termNumber: form.termNumber,
        title: form.title || 'Untitled lesson',
        durationMinutes: form.durationMinutes,
        scaffoldedOutline: finalOutline ?? undefined,
        // Library lesson by default; teacher assigns to classes from the
        // workspace afterwards.
        assignedClasses: [],
      });
      toast.success('Lesson created');
      router.push(`/teacher/lessons/${lesson._id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create lesson';
      toast.error(msg);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-4">
      <div>
        <h1 className="text-2xl font-semibold">New Lesson</h1>
        <p className="text-sm text-muted-foreground">Step {step} of 3</p>
      </div>

      {step === 1 && (
        <NewLessonStep1
          form={form}
          update={update}
          frameworkId={defaultFrameworkId}
          onTopicSelect={onTopicSelect}
          onNext={() => setStep(2)}
        />
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div>
            <Label>Anything specific to focus on? (optional)</Label>
            <Textarea
              value={form.hints}
              onChange={(e) => update({ hints: e.target.value })}
              placeholder="e.g. focus on factorising trinomials"
              rows={4}
              className="w-full mt-1"
            />
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
            <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" disabled={creating} onClick={() => onCreate(null)}>
                {creating ? 'Creating...' : 'Skip & create empty'}
              </Button>
              <Button disabled={scaffolding} onClick={onScaffold}>
                {scaffolding ? 'Generating...' : 'Scaffold with AI'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          {outline ? (
            <LessonScaffoldPreview
              outline={outline}
              onChange={setOutline}
              onRegenerate={onScaffold}
              regenerating={scaffolding}
            />
          ) : (
            <p className="text-sm text-muted-foreground">No outline yet — go back and scaffold.</p>
          )}
          <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
            <Button variant="ghost" onClick={() => setStep(2)}>Back</Button>
            <Button disabled={creating || !outline} onClick={() => onCreate(outline)}>
              {creating ? 'Creating...' : 'Create Lesson'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
