'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState } from '@/components/shared/EmptyState';
import { useLessonWorkspaceStore } from '@/stores/useLessonWorkspaceStore';
import { HomeworkAiModePanel } from './HomeworkAiModePanel';
import type { HomeworkMaterial } from '@/types/lesson';

interface Props {
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
  existing?: HomeworkMaterial;
  /** Lesson must be assigned to at least one class — Homework requires
   *  a classId per the schema. */
  lessonHasAssignedClass: boolean;
}

const defaultDueDate = (): string => {
  const d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export function HomeworkDrawer({ onSubmit, existing, lessonHasAssignedClass }: Props) {
  const closeDrawer = useLessonWorkspaceStore((s) => s.closeDrawer);

  const [title, setTitle] = useState(existing?.title ?? '');
  const [teacherNotes, setTeacherNotes] = useState(existing?.teacherNotes ?? '');
  const [aiCount, setAiCount] = useState<number>(5);
  const [aiDueDate, setAiDueDate] = useState<string>(defaultDueDate());
  const [aiTotalMarks, setAiTotalMarks] = useState<number>(10);
  const [submitting, setSubmitting] = useState(false);

  const aiValid =
    !!title.trim() && !!aiDueDate &&
    Number.isFinite(aiCount) && aiCount >= 1 && aiCount <= 20 &&
    Number.isFinite(aiTotalMarks) && aiTotalMarks >= 0 && aiTotalMarks <= 1000 &&
    lessonHasAssignedClass;

  const canSubmit = !submitting && aiValid;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await onSubmit({
        kind: 'homework',
        title: title.trim(),
        teacherNotes: teacherNotes.trim() || undefined,
        createPayload: {
          aiGenerate: true,
          aiCount,
          dueDate: new Date(aiDueDate).toISOString(),
          totalMarks: aiTotalMarks,
          topicHint: teacherNotes.trim() || title.trim(),
        },
      });
    } finally {
      setSubmitting(false);
    }
  };

  const submitLabel = submitting
    ? 'Saving\u2026'
    : existing
      ? 'Regenerate with AI'
      : 'Generate with AI';

  if (!lessonHasAssignedClass) {
    return (
      <div className="flex flex-col gap-4">
        <EmptyState
          icon={Sparkles}
          title="Assign this lesson to a class first"
          description="Homework needs an audience to deliver to. Use the Assigned Classes section in the lesson outline to pick a class, then come back."
          action={<Button onClick={closeDrawer}>Close</Button>}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <HomeworkAiModePanel
        aiCount={aiCount} setAiCount={setAiCount}
        dueDate={aiDueDate} setDueDate={setAiDueDate}
        totalMarks={aiTotalMarks} setTotalMarks={setAiTotalMarks}
      />

      <div>
        <Label htmlFor="hw-title">
          Title <span className="text-destructive">*</span>
        </Label>
        <Input
          id="hw-title" className="w-full"
          value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="How this homework appears in the lesson"
        />
      </div>

      <div>
        <Label htmlFor="hw-notes">Teacher notes</Label>
        <Textarea
          id="hw-notes" className="w-full min-h-20"
          value={teacherNotes} onChange={(e) => setTeacherNotes(e.target.value)}
          placeholder="Describe what learners should focus on — used as the AI prompt context"
        />
      </div>

      <div className="pt-2 text-center">
        <Link
          href="/teacher/homework/new"
          className="text-xs text-muted-foreground hover:underline"
        >
          Use the full homework wizard instead &rarr;
        </Link>
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t">
        <Button type="button" variant="outline" onClick={closeDrawer} disabled={submitting}>
          Cancel
        </Button>
        <Button type="button" onClick={handleSubmit} disabled={!canSubmit}>
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}
