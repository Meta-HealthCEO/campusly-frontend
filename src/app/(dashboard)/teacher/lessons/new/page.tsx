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
import type { CurriculumTreeBrowserSelectContext } from '@/components/curriculum/CurriculumTreeBrowser';

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

  const onTopicSelect = (
    node: CurriculumNodeItem,
    ctx?: CurriculumTreeBrowserSelectContext,
  ) => {
    setForm((f) => {
      const next: FormState = {
        ...f,
        curriculumNodeId: node.id,
        title: f.title || node.title,
      };

      const norm = (s: string) => s.trim().toLowerCase();

      // Prefer denormalized refs when present — O(1), no parentId walk needed.
      // The self-ref convention means a subject node has subjectId === id, so
      // these refs work even when the picked node IS a subject/grade.
      let subjectTitle: string | null = null;
      let gradeTitle: string | null = null;

      if (node.subjectId && ctx?.getNodeById) {
        const subjectNode = ctx.getNodeById(node.subjectId);
        if (subjectNode) subjectTitle = subjectNode.title;
      }
      if (node.gradeId && ctx?.getNodeById) {
        const gradeNode = ctx.getNodeById(node.gradeId);
        if (gradeNode) gradeTitle = gradeNode.title;
      }

      // Defensive fallback to ancestor walk for older docs / cache misses.
      if ((!subjectTitle || !gradeTitle) && ctx?.ancestors && ctx.ancestors.length > 0) {
        if (!subjectTitle) {
          const a = ctx.ancestors.find((x) => x.type === 'subject');
          if (a) subjectTitle = a.title;
        }
        if (!gradeTitle) {
          const a = ctx.ancestors.find((x) => x.type === 'grade');
          if (a) gradeTitle = a.title;
        }
      }

      if (subjectTitle) {
        const match = subjects.find((s) => norm(s.name) === norm(subjectTitle as string));
        if (match) next.subjectId = match._id;
      }
      if (gradeTitle) {
        const match = grades.find((g) => norm(g.name) === norm(gradeTitle as string));
        if (match) next.gradeId = match.id;
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
