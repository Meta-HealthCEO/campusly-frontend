'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { LessonTypeBadge } from './LessonTypeBadge';
import { BookOpen, FileText, HelpCircle, ClipboardList, Edit3 } from 'lucide-react';
import type { CourseLesson } from '@/types';
import type { UpdateLessonInput } from '@/hooks/useCourseBuilder';

interface CourseBuilderLessonEditorProps {
  lesson: CourseLesson | null;
  onUpdate: (lessonId: string, data: UpdateLessonInput) => Promise<boolean>;
  readOnly: boolean;
}

/**
 * The three-panel course builder's CENTER panel. Shows the selected
 * lesson's metadata form + source reference + gating settings. For
 * lessons of type 'content', 'chapter', 'homework' the source is a
 * read-only reference — teachers change the underlying content via
 * the Content Library / Textbook / Homework flows, not here.
 */
export function CourseBuilderLessonEditor({
  lesson,
  onUpdate,
  readOnly,
}: CourseBuilderLessonEditorProps) {
  if (!lesson) {
    return (
      <Card className="h-full">
        <CardContent className="flex h-full min-h-[400px] flex-col items-center justify-center gap-3 py-12 text-center">
          <Edit3 className="h-12 w-12 text-muted-foreground/40" />
          <h3 className="text-lg font-semibold">Select a lesson to edit</h3>
          <p className="max-w-xs text-sm text-muted-foreground">
            Pick a lesson from the outline on the left, or add a new one with the &ldquo;+ Add Lesson&rdquo; button.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <LessonTypeBadge type={lesson.type} size="md" />
          </div>
        </div>

        <LessonTitleField lesson={lesson} onUpdate={onUpdate} readOnly={readOnly} />
        <LessonSourceDisplay lesson={lesson} />
        {lesson.type === 'quiz' && (
          <QuizGatingFields lesson={lesson} onUpdate={onUpdate} readOnly={readOnly} />
        )}
        <RequiredToAdvanceField lesson={lesson} onUpdate={onUpdate} readOnly={readOnly} />
      </CardContent>
    </Card>
  );
}

// ─── Subcomponents ────────────────────────────────────────────────────

function LessonTitleField({
  lesson,
  onUpdate,
  readOnly,
}: {
  lesson: CourseLesson;
  onUpdate: (lessonId: string, data: UpdateLessonInput) => Promise<boolean>;
  readOnly: boolean;
}) {
  const [localTitle, setLocalTitle] = useState(lesson.title);

  useEffect(() => {
    setLocalTitle(lesson.title);
  }, [lesson.id, lesson.title]);

  const handleBlur = async () => {
    const trimmed = localTitle.trim();
    if (!trimmed || trimmed === lesson.title) {
      setLocalTitle(lesson.title);
      return;
    }
    const ok = await onUpdate(lesson.id, { title: trimmed });
    if (!ok) setLocalTitle(lesson.title);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="lesson-title">Lesson title</Label>
      <Input
        id="lesson-title"
        value={localTitle}
        onChange={(e) => setLocalTitle(e.target.value)}
        onBlur={handleBlur}
        disabled={readOnly}
      />
    </div>
  );
}

function LessonSourceDisplay({ lesson }: { lesson: CourseLesson }) {
  const icons = { content: FileText, chapter: BookOpen, homework: ClipboardList, quiz: HelpCircle };
  const Icon = icons[lesson.type];
  const labels: Record<CourseLesson['type'], string> = {
    content: 'Content Library resource',
    chapter: 'Textbook chapter',
    homework: 'Homework assignment',
    quiz: 'Quiz from Question Bank',
  };

  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">{labels[lesson.type]}</p>
          <p className="text-sm font-medium mt-0.5">
            {lesson.type === 'quiz'
              ? `${lesson.quizQuestionIds.length} questions`
              : 'Referenced externally'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            To change the source, delete this lesson and add a new one.
          </p>
        </div>
      </div>
    </div>
  );
}

function QuizGatingFields({
  lesson,
  onUpdate,
  readOnly,
}: {
  lesson: CourseLesson;
  onUpdate: (lessonId: string, data: UpdateLessonInput) => Promise<boolean>;
  readOnly: boolean;
}) {
  const [passMark, setPassMark] = useState(String(lesson.passMarkPercent));
  const [maxAttempts, setMaxAttempts] = useState(
    lesson.maxAttempts === null ? '' : String(lesson.maxAttempts),
  );

  useEffect(() => {
    setPassMark(String(lesson.passMarkPercent));
    setMaxAttempts(lesson.maxAttempts === null ? '' : String(lesson.maxAttempts));
  }, [lesson.id, lesson.passMarkPercent, lesson.maxAttempts]);

  const savePassMark = async () => {
    const n = Number(passMark);
    if (isNaN(n) || n < 0 || n > 100 || n === lesson.passMarkPercent) return;
    const ok = await onUpdate(lesson.id, { passMarkPercent: n });
    if (!ok) setPassMark(String(lesson.passMarkPercent));
  };

  const saveMaxAttempts = async () => {
    if (maxAttempts === '') {
      if (lesson.maxAttempts !== null) {
        await onUpdate(lesson.id, { maxAttempts: null });
      }
      return;
    }
    const n = Number(maxAttempts);
    if (isNaN(n) || n < 1 || n === lesson.maxAttempts) return;
    const ok = await onUpdate(lesson.id, { maxAttempts: n });
    if (!ok) setMaxAttempts(String(lesson.maxAttempts));
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="pass-mark">Pass mark (%)</Label>
        <Input
          id="pass-mark"
          type="number"
          min={0}
          max={100}
          value={passMark}
          onChange={(e) => setPassMark(e.target.value)}
          onBlur={savePassMark}
          disabled={readOnly}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="max-attempts">Max attempts</Label>
        <Input
          id="max-attempts"
          type="number"
          min={1}
          placeholder="Unlimited"
          value={maxAttempts}
          onChange={(e) => setMaxAttempts(e.target.value)}
          onBlur={saveMaxAttempts}
          disabled={readOnly}
        />
        <p className="text-xs text-muted-foreground">
          Leave blank for unlimited attempts.
        </p>
      </div>
    </div>
  );
}

function RequiredToAdvanceField({
  lesson,
  onUpdate,
  readOnly,
}: {
  lesson: CourseLesson;
  onUpdate: (lessonId: string, data: UpdateLessonInput) => Promise<boolean>;
  readOnly: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-md border p-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">Required to advance</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Students must complete this lesson before the next one unlocks.
        </p>
      </div>
      <Switch
        checked={lesson.isRequiredToAdvance}
        onCheckedChange={(checked: boolean) => {
          void onUpdate(lesson.id, { isRequiredToAdvance: checked });
        }}
        disabled={readOnly}
      />
    </div>
  );
}
