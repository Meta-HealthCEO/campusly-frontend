'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { FileText } from 'lucide-react';
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
import { usePapersPicker } from '@/hooks/useLessonResourcePickers';
import {
  PaperSectionsEditor,
  type SectionInput,
  type SectionQuestionType,
} from './PaperSectionsEditor';

type Mode = 'link' | 'create';
type PaperType = 'test' | 'exam' | 'assessment';

interface Props {
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
}

const PAPER_TYPE_OPTIONS: { value: PaperType; label: string }[] = [
  { value: 'test', label: 'Class test' },
  { value: 'exam', label: 'Exam' },
  { value: 'assessment', label: 'Assessment' },
];

const DEFAULT_SECTIONS: SectionInput[] = [
  { title: 'Section A', questionCount: 5, questionType: 'mcq' },
  { title: 'Section B', questionCount: 3, questionType: 'short_answer' },
];

export function PaperDrawer({ onSubmit }: Props) {
  const closeDrawer = useLessonWorkspaceStore((s) => s.closeDrawer);
  const { items, loading: itemsLoading } = usePapersPicker();

  const [mode, setMode] = useState<Mode>('link');
  const [title, setTitle] = useState('');
  const [teacherNotes, setTeacherNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Link-mode
  const [existingPaperId, setExistingPaperId] = useState('');

  // Create-mode
  const [paperType, setPaperType] = useState<PaperType>('test');
  const [totalMarks, setTotalMarks] = useState<number>(0);
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [topicHint, setTopicHint] = useState('');
  const [sections, setSections] = useState<SectionInput[]>(DEFAULT_SECTIONS);

  const linkSelected = useMemo(
    () => items.find((p) => p.id === existingPaperId) ?? null,
    [items, existingPaperId],
  );

  const totalQuestions = useMemo(
    () =>
      sections.reduce(
        (acc, s) => acc + (s.questionCount > 0 ? s.questionCount : 0),
        0,
      ),
    [sections],
  );

  const handleLinkChange = (val: string | null) => {
    const next = val ?? '';
    setExistingPaperId(next);
    const p = items.find((x) => x.id === next);
    if (p && !title.trim()) setTitle(p.title);
  };

  const updateSection = (idx: number, patch: Partial<SectionInput>) => {
    setSections((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    );
  };

  const addSection = () => {
    setSections((prev) => [
      ...prev,
      {
        title: `Section ${String.fromCharCode(65 + prev.length)}`,
        questionCount: 3,
        questionType: 'short_answer' as SectionQuestionType,
      },
    ]);
  };

  const removeSection = (idx: number) => {
    setSections((prev) => prev.filter((_, i) => i !== idx));
  };

  const linkValid = !!existingPaperId && !!title.trim();
  const createValid =
    !!title.trim() &&
    sections.length > 0 &&
    sections.every((s) => s.title.trim().length > 0 && s.questionCount > 0) &&
    // If totalMarks is set, it must cover the section question counts
    // (assuming ~1 mark per question as a sane lower bound). totalMarks=0
    // means "let backend compute".
    (totalMarks === 0 || totalMarks >= totalQuestions) &&
    durationMinutes > 0;

  const canSubmit = !submitting && (mode === 'link' ? linkValid : createValid);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      if (mode === 'link') {
        await onSubmit({
          kind: 'paper',
          title: title.trim(),
          teacherNotes: teacherNotes.trim() || undefined,
          existingPaperId,
        });
      } else {
        await onSubmit({
          kind: 'paper',
          title: title.trim(),
          teacherNotes: teacherNotes.trim() || undefined,
          createPayload: {
            paperType,
            totalMarks: totalMarks > 0 ? totalMarks : undefined,
            durationMinutes,
            topicHint: topicHint.trim() || undefined,
            title: title.trim(),
            sections: sections.map((s) => ({
              title: s.title.trim(),
              questionCount: s.questionCount,
              questionType: s.questionType,
            })),
          },
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
              icon={FileText}
              title="No papers available"
              description="Generate or create a paper in the Papers module first, then link it here."
              action={
                <Link href="/teacher/papers/new">
                  <Button>Create paper</Button>
                </Link>
              }
            />
          ) : (
            <div>
              <Label htmlFor="paper-pick">
                Paper <span className="text-destructive">*</span>
              </Label>
              <Select value={existingPaperId} onValueChange={handleLinkChange}>
                <SelectTrigger id="paper-pick" className="w-full">
                  <SelectValue placeholder="Select a paper to link" />
                </SelectTrigger>
                <SelectContent>
                  {items.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <div className="flex flex-col">
                        <span className="truncate">{p.title}</span>
                        <span className="text-xs text-muted-foreground truncate">
                          {p.subtitle}
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
            AI generates the paper using your lesson&apos;s subject, grade and
            CAPS topic. Adjust sections below to control question counts and
            types.
          </div>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
            <div>
              <Label htmlFor="paper-type">Paper type</Label>
              <Select
                value={paperType}
                onValueChange={(v: unknown) => setPaperType(v as PaperType)}
              >
                <SelectTrigger id="paper-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAPER_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="paper-marks">Total marks</Label>
              <Input
                id="paper-marks"
                type="number"
                min={0}
                max={500}
                className="w-full"
                value={totalMarks || ''}
                onChange={(e) => setTotalMarks(Number(e.target.value))}
                placeholder="Auto"
              />
            </div>
            <div>
              <Label htmlFor="paper-duration">Duration (minutes)</Label>
              <Input
                id="paper-duration"
                type="number"
                min={5}
                max={480}
                className="w-full"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="paper-hint">Topic hint (optional)</Label>
            <Input
              id="paper-hint"
              className="w-full"
              value={topicHint}
              onChange={(e) => setTopicHint(e.target.value)}
              placeholder="Narrow the AI focus, e.g. 'Quadratic factorisation'"
            />
          </div>

          <PaperSectionsEditor
            sections={sections}
            totalQuestions={totalQuestions}
            onUpdate={updateSection}
            onAdd={addSection}
            onRemove={removeSection}
          />
        </TabsContent>
      </Tabs>

      <div>
        <Label htmlFor="paper-title">
          Title <span className="text-destructive">*</span>
        </Label>
        <Input
          id="paper-title"
          className="w-full"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="How this paper appears in the lesson"
        />
      </div>

      <div>
        <Label htmlFor="paper-notes">Teacher notes</Label>
        <Textarea
          id="paper-notes"
          className="w-full min-h-20"
          value={teacherNotes}
          onChange={(e) => setTeacherNotes(e.target.value)}
          placeholder="Anything learners should know?"
        />
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t">
        <Button type="button" variant="outline" onClick={closeDrawer} disabled={submitting}>
          Cancel
        </Button>
        <Button type="button" onClick={handleSubmit} disabled={!canSubmit}>
          {submitting ? 'Saving\u2026' : mode === 'link' ? 'Link paper' : 'Create paper'}
        </Button>
      </div>
    </div>
  );
}
