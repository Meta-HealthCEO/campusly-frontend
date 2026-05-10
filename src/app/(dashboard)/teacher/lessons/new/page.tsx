'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { LessonScaffoldPreview } from '@/components/lessons/LessonScaffoldPreview';
import { NewLessonStep1 } from '@/components/lessons/NewLessonStep1';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAcademicLookups } from '@/hooks/useAcademicLookups';
import { useGrades } from '@/hooks/useAcademics';
import { useCurriculumStructure } from '@/hooks/useCurriculumStructure';
import { useLessonScaffold } from '@/hooks/useLessonScaffold';
import type { ScaffoldedOutline } from '@/types/lesson';
import type { CurriculumNodeItem } from '@/types';

type Step = 1 | 2 | 3;

interface FormState {
  curriculumNodeId: string;
  classId: string;
  subjectId: string;
  gradeId: string;
  date: string;
  durationMinutes: number;
  title: string;
  hints: string;
}

function todayISODate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function NewLessonPage() {
  const router = useRouter();
  const { classes, subjects } = useAcademicLookups();
  const { grades } = useGrades();
  const { frameworks, selectedFramework, setSelectedFramework } = useCurriculumStructure();
  const { scaffold, createLesson, scaffolding, creating } = useLessonScaffold();

  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormState>({
    curriculumNodeId: '',
    classId: '',
    subjectId: '',
    gradeId: '',
    date: todayISODate(),
    durationMinutes: 45,
    title: '',
    hints: '',
  });
  const [outline, setOutline] = useState<ScaffoldedOutline | null>(null);

  const update = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  const onTopicSelect = (node: CurriculumNodeItem, ancestors?: CurriculumNodeItem[]) => {
    setForm((f) => {
      const next: FormState = {
        ...f,
        curriculumNodeId: node.id,
        title: f.title || node.title,
      };
      if (ancestors && ancestors.length > 0) {
        const norm = (s: string) => s.trim().toLowerCase();
        // CAPS curriculum nodes are sometimes titled with the grade suffix
        // (e.g. "Business Studies Grade 12"). Try exact match first, then
        // fall back to substring containment, preferring the longest hit.
        const fuzzyMatch = <T,>(items: T[], getName: (x: T) => string, target: string): T | undefined => {
          const t = norm(target);
          const exact = items.find((it) => norm(getName(it)) === t);
          if (exact) return exact;
          const contained = items
            .filter((it) => {
              const n = norm(getName(it));
              return n.length > 0 && (t.includes(n) || n.includes(t));
            })
            .sort((a, b) => norm(getName(b)).length - norm(getName(a)).length);
          return contained[0];
        };
        const subjectNode = ancestors.find((a) => a.type === 'subject');
        const gradeNode = ancestors.find((a) => a.type === 'grade');
        if (subjectNode) {
          const match = fuzzyMatch(subjects, (s) => s.name, subjectNode.title);
          if (match) next.subjectId = match._id;
        }
        if (gradeNode) {
          const match = fuzzyMatch(grades, (g) => g.name, gradeNode.title);
          if (match) next.gradeId = match.id;
        }
      }
      return next;
    });
  };

  const onScaffold = async () => {
    try {
      const result = await scaffold({
        curriculumNodeId: form.curriculumNodeId,
        classId: form.classId,
        subjectId: form.subjectId,
        gradeId: form.gradeId,
        durationMinutes: form.durationMinutes,
        hints: form.hints || undefined,
      });
      setOutline(result);
      setStep(3);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate outline';
      toast.error(msg);
    }
  };

  const onCreate = async (finalOutline: ScaffoldedOutline | null) => {
    try {
      const lesson = await createLesson({
        classId: form.classId,
        subjectId: form.subjectId,
        gradeId: form.gradeId,
        curriculumNodeId: form.curriculumNodeId,
        title: form.title || 'Untitled lesson',
        date: new Date(form.date).toISOString(),
        durationMinutes: form.durationMinutes,
        scaffoldedOutline: finalOutline ?? undefined,
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
          classes={classes}
          subjects={subjects}
          grades={grades}
          frameworks={frameworks}
          selectedFramework={selectedFramework}
          setSelectedFramework={setSelectedFramework}
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
