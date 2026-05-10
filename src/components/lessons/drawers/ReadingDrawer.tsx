'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { TextbookSourcePicker } from '../TextbookSourcePicker';
import { useLessonWorkspaceStore } from '@/stores/useLessonWorkspaceStore';
import type { ReadingMaterial, TextbookRef } from '@/types/lesson';

interface Props {
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
  existing?: ReadingMaterial;
}

export function ReadingDrawer({ onSubmit, existing }: Props) {
  const closeDrawer = useLessonWorkspaceStore((s) => s.closeDrawer);

  const initialCompCount = existing?.comprehensionQuestionIds?.length ?? 0;
  const initialGenerateComp = initialCompCount > 0;

  const [title, setTitle] = useState(existing?.title ?? 'Reading');
  const [teacherNotes, setTeacherNotes] = useState(existing?.teacherNotes ?? '');
  const [textbookRef, setTextbookRef] = useState<TextbookRef | null>(
    existing?.textbookRef ?? null,
  );
  const [generateComprehension, setGenerateComprehension] = useState(initialGenerateComp);
  const [comprehensionCount, setComprehensionCount] = useState(
    initialCompCount > 0 ? initialCompCount : 4,
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!existing) return;
    const compCount = existing.comprehensionQuestionIds?.length ?? 0;
    setTitle(existing.title);
    setTeacherNotes(existing.teacherNotes ?? '');
    setTextbookRef(existing.textbookRef);
    setGenerateComprehension(compCount > 0);
    setComprehensionCount(compCount > 0 ? compCount : 4);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing?._id]);

  const isExternalNoExcerpt =
    textbookRef?.source === 'external' && !textbookRef.excerpt?.trim();

  const showWarning = isExternalNoExcerpt && generateComprehension;

  const refIsValid =
    textbookRef !== null &&
    ((textbookRef.source === 'internal' && !!textbookRef.textbookId) ||
      (textbookRef.source === 'external' && !!textbookRef.title.trim()));

  const canSubmit = !!title.trim() && refIsValid && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit || !textbookRef) return;
    setSubmitting(true);
    try {
      await onSubmit({
        kind: 'reading',
        title: title.trim(),
        teacherNotes: teacherNotes.trim() || undefined,
        textbookRef,
        generateComprehension,
        comprehensionCount: generateComprehension ? comprehensionCount : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const actionLabel = existing ? 'Regenerate' : 'Generate';

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Label htmlFor="reading-title">
          Title <span className="text-destructive">*</span>
        </Label>
        <Input
          id="reading-title"
          className="w-full"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div>
        <Label htmlFor="reading-notes">Teacher notes</Label>
        <Textarea
          id="reading-notes"
          className="w-full min-h-20"
          value={teacherNotes}
          onChange={(e) => setTeacherNotes(e.target.value)}
          placeholder="What should learners focus on while reading?"
        />
      </div>

      <TextbookSourcePicker value={textbookRef} onChange={setTextbookRef} />

      <div className="flex items-center justify-between border rounded-md p-3">
        <div className="pr-3">
          <Label htmlFor="reading-comp-toggle" className="cursor-pointer">
            Generate comprehension questions
          </Label>
          <p className="text-xs text-muted-foreground mt-1">
            AI will generate short questions based on the source.
          </p>
        </div>
        <Switch
          id="reading-comp-toggle"
          checked={generateComprehension}
          onCheckedChange={(v: boolean) => setGenerateComprehension(v)}
        />
      </div>

      {generateComprehension && (
        <div>
          <Label htmlFor="reading-comp-count">How many questions?</Label>
          <Input
            id="reading-comp-count"
            type="number"
            min={1}
            max={10}
            className="w-full sm:w-32"
            value={comprehensionCount}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isFinite(n)) {
                setComprehensionCount(Math.max(1, Math.min(10, Math.floor(n))));
              }
            }}
          />
        </div>
      )}

      {showWarning && (
        <div className="flex gap-2 items-start bg-destructive/10 text-destructive border border-destructive/30 rounded-md p-3 text-sm">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <p>
            No excerpt provided. Comprehension questions will be based on the topic only
            and may not match the textbook.
          </p>
        </div>
      )}

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t">
        <Button type="button" variant="outline" onClick={closeDrawer} disabled={submitting}>
          Cancel
        </Button>
        <Button type="button" onClick={handleSubmit} disabled={!canSubmit}>
          {submitting ? 'Saving\u2026' : actionLabel}
        </Button>
      </div>
    </div>
  );
}
