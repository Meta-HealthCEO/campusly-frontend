'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ClipboardList, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { useLessonWorkspaceStore } from '@/stores/useLessonWorkspaceStore';
import {
  useHomeworkPicker,
  useQuizzesPicker,
  useContentResourcesPicker,
} from '@/hooks/useLessonResourcePickers';
import { HomeworkCreateModePanel, type CreateType } from './HomeworkCreateModePanel';
import { HomeworkAiModePanel } from './HomeworkAiModePanel';
import type { HomeworkMaterial } from '@/types/lesson';

type Mode = 'ai' | 'link' | 'create';

interface Props {
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
  existing?: HomeworkMaterial;
  /** Lesson must be assigned to at least one class for AI/Create modes
   *  — Homework requires a classId per the schema. */
  lessonHasAssignedClass: boolean;
}

const MONGO_ID_RE = /^[a-fA-F0-9]{24}$/;

const defaultDueDate = (): string => {
  const d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export function HomeworkDrawer({ onSubmit, existing, lessonHasAssignedClass }: Props) {
  const closeDrawer = useLessonWorkspaceStore((s) => s.closeDrawer);
  const { items, loading: itemsLoading } = useHomeworkPicker();
  const { items: quizItems, loading: quizzesLoading } = useQuizzesPicker();
  const { items: contentItems, loading: contentLoading } = useContentResourcesPicker();

  // Default to "ai" (path of least resistance) when adding new; default to
  // "link" when editing an existing homework material so the linked id pre-fills.
  const [mode, setMode] = useState<Mode>(existing ? 'link' : 'ai');
  const [title, setTitle] = useState(existing?.title ?? '');
  const [teacherNotes, setTeacherNotes] = useState(existing?.teacherNotes ?? '');
  const [submitting, setSubmitting] = useState(false);

  const [existingHomeworkId, setExistingHomeworkId] = useState(existing?.homeworkId ?? '');

  const [createType, setCreateType] = useState<CreateType>('quiz');
  const [dueDate, setDueDate] = useState('');
  const [totalMarks, setTotalMarks] = useState<number>(10);
  const [quizId, setQuizId] = useState('');
  const [contentResourceId, setContentResourceId] = useState('');
  const [exerciseQuestionIdsRaw, setExerciseQuestionIdsRaw] = useState('');

  const [aiCount, setAiCount] = useState<number>(5);
  const [aiDueDate, setAiDueDate] = useState<string>(defaultDueDate());
  const [aiTotalMarks, setAiTotalMarks] = useState<number>(10);

  useEffect(() => {
    if (!existing) return;
    setMode('link');
    setTitle(existing.title);
    setTeacherNotes(existing.teacherNotes ?? '');
    setExistingHomeworkId(existing.homeworkId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing?._id]);

  const linkSelected = useMemo(
    () => items.find((h) => h.id === existingHomeworkId) ?? null,
    [items, existingHomeworkId],
  );

  const exerciseQuestionIds = useMemo(
    () => exerciseQuestionIdsRaw.split(/[,\s]+/).map((s) => s.trim()).filter((s) => s.length > 0),
    [exerciseQuestionIdsRaw],
  );

  const exerciseIdsValid = useMemo(
    () => exerciseQuestionIds.length > 0 && exerciseQuestionIds.every((id) => MONGO_ID_RE.test(id)),
    [exerciseQuestionIds],
  );

  const handleLinkChange = (val: string | null) => {
    const next = val ?? '';
    setExistingHomeworkId(next);
    const hw = items.find((x) => x.id === next);
    if (hw && !title.trim()) setTitle(hw.title);
  };

  const handleQuizChange = (next: string) => {
    setQuizId(next);
    const q = quizItems.find((x) => x.id === next);
    if (q && !title.trim()) setTitle(q.title);
  };

  const handleContentChange = (next: string) => {
    setContentResourceId(next);
    const c = contentItems.find((x) => x.id === next);
    if (c && !title.trim()) setTitle(c.title);
  };

  const linkValid = !!existingHomeworkId && !!title.trim();

  const typeSpecificValid =
    createType === 'quiz' ? !!quizId
    : createType === 'reading' ? !!contentResourceId
    : exerciseIdsValid;

  const createValid =
    !!title.trim() && !!dueDate &&
    Number.isFinite(totalMarks) && totalMarks >= 0 && totalMarks <= 1000 &&
    typeSpecificValid && lessonHasAssignedClass;

  const aiValid =
    !!title.trim() && !!aiDueDate &&
    Number.isFinite(aiCount) && aiCount >= 1 && aiCount <= 20 &&
    Number.isFinite(aiTotalMarks) && aiTotalMarks >= 0 && aiTotalMarks <= 1000 &&
    lessonHasAssignedClass;

  const canSubmit = !submitting && (
    mode === 'link' ? linkValid
    : mode === 'create' ? createValid
    : aiValid
  );

  const buildCreatePayload = (dueIso: string): Record<string, unknown> => {
    const base = {
      title: title.trim(), dueDate: dueIso, totalMarks,
      latePolicy: 'block' as const, gradebookAutoPublish: true,
    };
    if (createType === 'quiz') return { ...base, type: 'quiz', quizId };
    if (createType === 'reading') return { ...base, type: 'reading', contentResourceId };
    return { ...base, type: 'exercise', exerciseQuestionIds };
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      if (mode === 'link') {
        await onSubmit({
          kind: 'homework', title: title.trim(),
          teacherNotes: teacherNotes.trim() || undefined,
          existingHomeworkId,
        });
      } else if (mode === 'create') {
        const due = new Date(dueDate);
        const dueIso = Number.isFinite(due.getTime()) ? due.toISOString() : new Date().toISOString();
        await onSubmit({
          kind: 'homework', title: title.trim(),
          teacherNotes: teacherNotes.trim() || undefined,
          createPayload: buildCreatePayload(dueIso),
        });
      } else {
        await onSubmit({
          kind: 'homework', title: title.trim(),
          teacherNotes: teacherNotes.trim() || undefined,
          createPayload: {
            aiGenerate: true,
            aiCount,
            dueDate: new Date(aiDueDate).toISOString(),
            totalMarks: aiTotalMarks,
            topicHint: teacherNotes.trim() || title.trim(),
          },
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const submitLabel = submitting
    ? 'Saving\u2026'
    : existing
      ? mode === 'ai' ? 'Regenerate with AI' : 'Update homework'
      : mode === 'link' ? 'Link homework'
        : mode === 'create' ? 'Create homework'
          : 'Generate with AI';

  const needsClassEmptyState =
    !lessonHasAssignedClass && (mode === 'ai' || mode === 'create');

  return (
    <div className="flex flex-col gap-4">
      <Tabs value={mode} onValueChange={(v: unknown) => setMode((v as Mode) ?? 'ai')}>
        <TabsList className="w-full">
          <TabsTrigger value="ai">AI Generate</TabsTrigger>
          <TabsTrigger value="link">Link existing</TabsTrigger>
          <TabsTrigger value="create">Create new</TabsTrigger>
        </TabsList>

        <TabsContent value="ai" className="pt-4">
          {needsClassEmptyState ? (
            <EmptyState
              icon={Sparkles}
              title="Assign this lesson to a class first"
              description="Homework needs an audience to deliver to. Use the Assigned Classes section in the lesson outline to pick a class, then come back."
              action={<Button onClick={closeDrawer}>Close</Button>}
            />
          ) : (
            <HomeworkAiModePanel
              aiCount={aiCount} setAiCount={setAiCount}
              dueDate={aiDueDate} setDueDate={setAiDueDate}
              totalMarks={aiTotalMarks} setTotalMarks={setAiTotalMarks}
            />
          )}
        </TabsContent>

        <TabsContent value="link" className="pt-4 space-y-4">
          {itemsLoading ? <LoadingSpinner />
            : items.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="No homework available"
                description="Create homework in the Homework module first, then link it here."
                action={<Link href="/teacher/homework/new"><Button>Create homework</Button></Link>}
              />
            ) : (
              <div>
                <Label htmlFor="hw-pick">
                  Homework <span className="text-destructive">*</span>
                </Label>
                <Select value={existingHomeworkId} onValueChange={handleLinkChange}>
                  <SelectTrigger id="hw-pick" className="w-full">
                    <SelectValue placeholder="Select homework to link" />
                  </SelectTrigger>
                  <SelectContent>
                    {items.map((h) => (
                      <SelectItem key={h.id} value={h.id}>
                        <div className="flex flex-col">
                          <span className="truncate">{h.title}</span>
                          {h.subtitle && <span className="text-xs text-muted-foreground truncate">{h.subtitle}</span>}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {linkSelected?.subtitle && (
                  <p className="text-xs text-muted-foreground mt-1 truncate">{linkSelected.subtitle}</p>
                )}
              </div>
            )}
        </TabsContent>

        <TabsContent value="create" className="pt-4">
          {needsClassEmptyState ? (
            <EmptyState
              icon={ClipboardList}
              title="Assign this lesson to a class first"
              description="Homework needs an audience to deliver to. Use the Assigned Classes section in the lesson outline to pick a class, then come back."
              action={<Button onClick={closeDrawer}>Close</Button>}
            />
          ) : (
            <HomeworkCreateModePanel
              createType={createType} setCreateType={setCreateType}
              quizId={quizId} onQuizChange={handleQuizChange}
              quizItems={quizItems} quizzesLoading={quizzesLoading}
              contentResourceId={contentResourceId} onContentChange={handleContentChange}
              contentItems={contentItems} contentLoading={contentLoading}
              exerciseQuestionIdsRaw={exerciseQuestionIdsRaw}
              setExerciseQuestionIdsRaw={setExerciseQuestionIdsRaw}
              exerciseIdsCount={exerciseQuestionIds.length}
              exerciseIdsValid={exerciseIdsValid}
              dueDate={dueDate} setDueDate={setDueDate}
              totalMarks={totalMarks} setTotalMarks={setTotalMarks}
            />
          )}
        </TabsContent>
      </Tabs>

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
          placeholder={
            mode === 'ai'
              ? 'Describe what learners should focus on — used as the AI prompt context'
              : 'What should learners focus on?'
          }
        />
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t">
        <Button type="button" variant="outline" onClick={closeDrawer} disabled={submitting}>Cancel</Button>
        <Button type="button" onClick={handleSubmit} disabled={!canSubmit}>{submitLabel}</Button>
      </div>
    </div>
  );
}
