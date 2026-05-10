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

type Mode = 'link' | 'create';
type CreateType = 'quiz' | 'reading' | 'exercise';

interface Props {
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
}

const CREATE_TYPE_OPTIONS: { value: CreateType; label: string }[] = [
  { value: 'quiz', label: 'Quiz' },
  { value: 'reading', label: 'Reading' },
  { value: 'exercise', label: 'Exercise' },
];

const MONGO_ID_RE = /^[a-fA-F0-9]{24}$/;

export function HomeworkDrawer({ onSubmit }: Props) {
  const closeDrawer = useLessonWorkspaceStore((s) => s.closeDrawer);
  const { items, loading: itemsLoading } = useHomeworkPicker();
  const { items: quizItems, loading: quizzesLoading } = useQuizzesPicker();
  const { items: contentItems, loading: contentLoading } =
    useContentResourcesPicker();

  const [mode, setMode] = useState<Mode>('link');
  const [title, setTitle] = useState('');
  const [teacherNotes, setTeacherNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Link-mode state
  const [existingHomeworkId, setExistingHomeworkId] = useState('');

  // Create-mode state
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
    () =>
      exerciseQuestionIdsRaw
        .split(/[,\s]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
    [exerciseQuestionIdsRaw],
  );

  const exerciseIdsValid = useMemo(
    () =>
      exerciseQuestionIds.length > 0 &&
      exerciseQuestionIds.every((id) => MONGO_ID_RE.test(id)),
    [exerciseQuestionIds],
  );

  const handleLinkChange = (val: string | null) => {
    const next = val ?? '';
    setExistingHomeworkId(next);
    const hw = items.find((x) => x.id === next);
    if (hw && !title.trim()) setTitle(hw.title);
  };

  const handleQuizChange = (val: string | null) => {
    const next = val ?? '';
    setQuizId(next);
    const q = quizItems.find((x) => x.id === next);
    if (q && !title.trim()) setTitle(q.title);
  };

  const handleContentChange = (val: string | null) => {
    const next = val ?? '';
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
    !!title.trim() &&
    !!dueDate &&
    Number.isFinite(totalMarks) &&
    totalMarks >= 0 &&
    totalMarks <= 1000 &&
    typeSpecificValid;

  const canSubmit = !submitting && (mode === 'link' ? linkValid : createValid);

  const buildCreatePayload = (dueIso: string): Record<string, unknown> => {
    const base = {
      title: title.trim(),
      dueDate: dueIso,
      totalMarks,
      latePolicy: 'block' as const,
      gradebookAutoPublish: true,
    };
    if (createType === 'quiz') {
      return { ...base, type: 'quiz', quizId };
    }
    if (createType === 'reading') {
      return { ...base, type: 'reading', contentResourceId };
    }
    return { ...base, type: 'exercise', exerciseQuestionIds };
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      if (mode === 'link') {
        await onSubmit({
          kind: 'homework',
          title: title.trim(),
          teacherNotes: teacherNotes.trim() || undefined,
          existingHomeworkId,
        });
      } else {
        const due = new Date(dueDate);
        const dueIso = Number.isFinite(due.getTime())
          ? due.toISOString()
          : new Date().toISOString();
        await onSubmit({
          kind: 'homework',
          title: title.trim(),
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
      <Tabs
        defaultValue="link"
        onValueChange={(v: unknown) => setMode((v as Mode) ?? 'link')}
      >
        <TabsList className="w-full">
          <TabsTrigger value="link">Link existing</TabsTrigger>
          <TabsTrigger value="create">Create new</TabsTrigger>
        </TabsList>

        <TabsContent value="link" className="pt-4 space-y-4">
          {itemsLoading ? (
            <LoadingSpinner />
          ) : items.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No homework available"
              description="Create homework in the Homework module first, then link it here."
              action={
                <Link href="/teacher/homework/new">
                  <Button>Create homework</Button>
                </Link>
              }
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
                        <span className="text-xs text-muted-foreground truncate">
                          {h.subtitle}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {linkSelected && (
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {linkSelected.subtitle}
                </p>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="create" className="pt-4 space-y-4">
          <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
            Quick-create captures the essentials. For a full setup
            (attachments, late policy, comprehension generation), use the{' '}
            <Link href="/teacher/homework/new" className="underline">
              homework wizard
            </Link>
            .
          </div>
          <div>
            <Label htmlFor="hw-type">
              Type <span className="text-destructive">*</span>
            </Label>
            <Select
              value={createType}
              onValueChange={(v: unknown) => setCreateType(v as CreateType)}
            >
              <SelectTrigger id="hw-type" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CREATE_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {createType === 'quiz' && (
            <div>
              <Label htmlFor="hw-quiz">
                Quiz <span className="text-destructive">*</span>
              </Label>
              {quizzesLoading ? (
                <LoadingSpinner />
              ) : quizItems.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No quizzes available. Create one in the Learning module first.
                </p>
              ) : (
                <Select value={quizId} onValueChange={handleQuizChange}>
                  <SelectTrigger id="hw-quiz" className="w-full">
                    <SelectValue placeholder="Select a quiz" />
                  </SelectTrigger>
                  <SelectContent>
                    {quizItems.map((q) => (
                      <SelectItem key={q.id} value={q.id}>
                        <div className="flex flex-col">
                          <span className="truncate">{q.title}</span>
                          <span className="text-xs text-muted-foreground truncate">
                            {q.subtitle}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {createType === 'reading' && (
            <div>
              <Label htmlFor="hw-content">
                Content resource <span className="text-destructive">*</span>
              </Label>
              {contentLoading ? (
                <LoadingSpinner />
              ) : contentItems.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No approved content resources available.
                </p>
              ) : (
                <Select value={contentResourceId} onValueChange={handleContentChange}>
                  <SelectTrigger id="hw-content" className="w-full">
                    <SelectValue placeholder="Select a reading resource" />
                  </SelectTrigger>
                  <SelectContent>
                    {contentItems.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <div className="flex flex-col">
                          <span className="truncate">{c.title}</span>
                          <span className="text-xs text-muted-foreground truncate">
                            {c.subtitle}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {createType === 'exercise' && (
            <div>
              <Label htmlFor="hw-questions">
                Question IDs <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="hw-questions"
                className="w-full min-h-20 font-mono text-xs"
                value={exerciseQuestionIdsRaw}
                onChange={(e) => setExerciseQuestionIdsRaw(e.target.value)}
                placeholder="Comma-separated MongoDB IDs (24 hex chars)"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Pick questions from{' '}
                <Link href="/teacher/curriculum/questions" className="underline">
                  Question Bank
                </Link>{' '}
                and paste their IDs here.{' '}
                {exerciseQuestionIds.length > 0 && !exerciseIdsValid && (
                  <span className="text-destructive">
                    One or more IDs are not valid 24-character hex.
                  </span>
                )}
                {exerciseIdsValid && (
                  <span>{exerciseQuestionIds.length} question(s) ready.</span>
                )}
              </p>
            </div>
          )}

          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
            <div>
              <Label htmlFor="hw-due">
                Due date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="hw-due" type="date" className="w-full"
                value={dueDate} onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="hw-marks">
                Total marks <span className="text-destructive">*</span>
              </Label>
              <Input
                id="hw-marks" type="number" min={0} max={1000} className="w-full"
                value={totalMarks} onChange={(e) => setTotalMarks(Number(e.target.value))}
              />
            </div>
          </div>
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
        <Button type="button" variant="outline" onClick={closeDrawer} disabled={submitting}>
          Cancel
        </Button>
        <Button type="button" onClick={handleSubmit} disabled={!canSubmit}>
          {submitting ? 'Saving\u2026' : mode === 'link' ? 'Link homework' : 'Create homework'}
        </Button>
      </div>
    </div>
  );
}
