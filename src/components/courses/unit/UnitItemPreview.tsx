'use client';

import { useState } from 'react';
import { Check, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { BlockRenderer } from '@/components/content/renderers/BlockRenderer';
import { RewriteMenu } from '@/components/courses/unit/RewriteMenu';
import { UnitItemEditor, type ItemEdit } from '@/components/courses/unit/UnitItemEditor';
import type { ItemPreview, PreviewQuestion } from '@/hooks/useClassUnit';
import type { RewriteAction } from '@/lib/item-editing';
import type { AttemptResult, BlockInteractionState } from '@/types';
import type { CourseLesson } from '@/types/courses';

// A preview is read-only: interactive blocks render but don't record attempts.
const previewAttempt = async (): Promise<AttemptResult> => ({ id: 'preview', correct: false, score: 0, maxScore: 1, attemptNumber: 1 });
const idle = (blockId: string): BlockInteractionState => ({
  blockId, answered: false, correct: null, score: 0, maxScore: 0, showExplanation: false, hintsRevealed: 0, attemptResult: null,
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: CourseLesson | null;
  preview: ItemPreview | null;
  loading: boolean;
  /** Saving or rewriting is in progress. */
  busy: boolean;
  /** Why the last save or rewrite failed. */
  error: string | null;
  onSave: (edit: ItemEdit) => Promise<boolean>;
  onRewrite: (action: RewriteAction, language?: string) => void;
}

function Questions({ questions }: { questions: PreviewQuestion[] }) {
  return (
    <ol className="space-y-4">
      {questions.map((q: PreviewQuestion, i: number) => (
        <li key={q.id} className="space-y-1.5">
          <p className="text-sm font-medium"><span className="font-mono text-muted-foreground">{i + 1}.</span> {q.stem}</p>
          <ul className="space-y-0.5 pl-5 text-sm" aria-label="Options">
            {q.options.map((o) => (
              <li key={o.label} className={o.isCorrect ? 'flex items-center gap-1.5 font-medium text-success' : 'flex items-center gap-1.5'}>
                <span className="font-mono text-xs">{o.label}.</span> {o.text}
                {o.isCorrect ? <Check className="h-3.5 w-3.5" aria-label="Correct answer" /> : null}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}

/** An item as learners will get it, with Edit and Rewrite for the teacher. */
export function UnitItemPreview({ open, onOpenChange, item, preview, loading, busy, error, onSave, onRewrite }: Props) {
  const [editing, setEditing] = useState(false);
  const ready = !loading && preview && preview.kind !== 'not_ready' && item?.itemKind;
  const close = (next: boolean): void => {
    if (!next) setEditing(false);
    onOpenChange(next);
  };

  return (
    <Sheet open={open} onOpenChange={close}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="space-y-2 border-b border-border px-4 py-3">
          <SheetTitle className="pr-8">{preview?.title ?? item?.title ?? 'Item'}</SheetTitle>
          <SheetDescription>
            {editing ? 'Editing. Learners see your version once you save.' : preview?.kind === 'quiz' ? 'Quick check: marked straight away, with the right answers ticked here.' : 'As your learners will see it.'}
          </SheetDescription>
          {ready && !editing ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(true)} disabled={busy} className="min-h-11 gap-1.5 sm:min-h-8">
                <Pencil className="h-4 w-4" aria-hidden /> Edit
              </Button>
              <RewriteMenu busy={busy} onRewrite={onRewrite} />
            </div>
          ) : null}
          {error && !editing ? <p role="alert" className="rounded-md border border-destructive/30 bg-destructive-soft px-3 py-2 text-sm text-destructive">{error}</p> : null}
        </SheetHeader>
        {editing && ready && preview && item?.itemKind ? (
          <UnitItemEditor
            key={`${item.id}-${preview.kind}`}
            itemKind={item.itemKind}
            preview={preview}
            saving={busy}
            error={error}
            onSave={(edit) => void onSave(edit).then((ok) => { if (ok) setEditing(false); })}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {loading || !preview ? <LoadingSpinner /> : null}
            {!loading && preview?.kind === 'content' ? (
              <div className="space-y-4">
                {preview.blocks.map((block) => <BlockRenderer key={block.blockId} block={block} onAttempt={previewAttempt} interaction={idle(block.blockId)} />)}
              </div>
            ) : null}
            {!loading && preview?.kind === 'quiz' ? <Questions questions={preview.questions} /> : null}
            {!loading && preview?.kind === 'not_ready' ? <p className="text-sm text-muted-foreground">This item hasn&apos;t been written yet.</p> : null}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
