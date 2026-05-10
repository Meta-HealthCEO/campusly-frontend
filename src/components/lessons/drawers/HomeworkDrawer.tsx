'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ClipboardList } from 'lucide-react';
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

type Mode = 'link' | 'create';

interface Props {
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
}

const MONGO_ID_RE = /^[a-fA-F0-9]{24}$/;

export function HomeworkDrawer({ onSubmit }: Props) {
  const closeDrawer = useLessonWorkspaceStore((s) => s.closeDrawer);
  const { items, loading: itemsLoading } = useHomeworkPicker();
  const { items: quizItems, loading: quizzesLoading } = useQuizzesPicker();
  const { items: contentItems, loading: contentLoading } = useContentResourcesPicker();

  const [mode, setMode] = useState<Mode>('link');
  const [title, setTitle] = useState('');
  const [teacherNotes, setTeacherNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [existingHomeworkId, setExistingHomeworkId] = useState('');

  const [createType, setCreateType] = useState<CreateType>('quiz');
  const [dueDate, setDueDate] = useState('');
  const [totalMarks, setTotalMarks] = useState<number>(10);
  const [quizId, setQuizId] = useState('');
  const [contentResourceId, setContentResourceId] = useState('');
  const [exerciseQuestionIdsRaw, setExerciseQuestionIdsRaw] = useState('');

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
    typeSpecificValid;

  const canSubmit = !submitting && (mode === 'link' ? linkValid : createValid);

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
      } else {
        const due = new Date(dueDate);
        const dueIso = Number.isFinite(due.getTime()) ? due.toISOString() : new Date().toISOString();
        await onSubmit({
          kind: 'homework', title: title.trim(),
          teacherNotes: teacherNotes.trim() || undefined,
          createPayload: buildCreatePayload(dueIso),
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Tabs defaultValue="link" onValueChange={(v: unknown) => setMode((v as Mode) ?? 'link')}>
        <TabsList className="w-full">
          <TabsTrigger value="link">Link existing</TabsTrigger>
          <TabsTrigger value="create">Create new</TabsTrigger>
        </TabsList>

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
          placeholder="What should learners focus on?"
        />
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t">
        <Button type="button" variant="outline" onClick={closeDrawer} disabled={submitting}>Cancel</Button>
        <Button type="button" onClick={handleSubmit} disabled={!canSubmit}>
          {submitting ? 'Saving\u2026' : mode === 'link' ? 'Link homework' : 'Create homework'}
        </Button>
      </div>
    </div>
  );
}
