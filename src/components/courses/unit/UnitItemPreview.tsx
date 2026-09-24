'use client';

import { Check } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { BlockRenderer } from '@/components/content/renderers/BlockRenderer';
import type { ItemPreview, PreviewQuestion } from '@/hooks/useClassUnit';
import type { AttemptResult, BlockInteractionState } from '@/types';

// A preview is read-only: interactive blocks render but don't record attempts.
const previewAttempt = async (): Promise<AttemptResult> => ({ id: 'preview', correct: false, score: 0, maxScore: 1, attemptNumber: 1 });
const idle = (blockId: string): BlockInteractionState => ({
  blockId, answered: false, correct: null, score: 0, maxScore: 0, showExplanation: false, hintsRevealed: 0, attemptResult: null,
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preview: ItemPreview | null;
  loading: boolean;
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

/** An item as learners will get it: the teacher reads it here before releasing. */
export function UnitItemPreview({ open, onOpenChange, preview, loading }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="border-b border-border px-4 py-3">
          <SheetTitle>{preview?.title ?? 'Item'}</SheetTitle>
          <SheetDescription>
            {preview?.kind === 'quiz' ? 'Quick check: marked straight away, with the right answers ticked here.' : 'As your learners will see it.'}
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {loading || !preview ? <LoadingSpinner /> : null}
          {!loading && preview?.kind === 'content' ? (
            <div className="space-y-4">
              {preview.blocks.map((block) => <BlockRenderer key={block.blockId} block={block} onAttempt={previewAttempt} interaction={idle(block.blockId)} />)}
            </div>
          ) : null}
          {!loading && preview?.kind === 'quiz' ? <Questions questions={preview.questions} /> : null}
          {!loading && preview?.kind === 'not_ready' ? (
            <p className="text-sm text-muted-foreground">This item hasn&apos;t been written yet.</p>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
