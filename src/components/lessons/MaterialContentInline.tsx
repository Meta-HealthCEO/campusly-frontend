'use client';

import { useEffect, useState } from 'react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ExerciseQuestionsList } from '@/components/homework/ExerciseQuestionsList';
import { BlockRenderer } from '@/components/content/renderers/BlockRenderer';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import type { LessonMaterial } from '@/types/lesson';
import type { QuestionItem } from '@/types/question-bank';
import type { ContentBlockItem, AttemptResult, BlockInteractionState } from '@/types';

interface Props {
  material: LessonMaterial;
  /** Lazy: only fetch when the card is expanded. */
  enabled: boolean;
}

interface PopulatedRef {
  _id?: string;
  id?: string;
  title?: string;
  type?: string;
}

function extractId(ref: unknown): string | null {
  if (!ref) return null;
  if (typeof ref === 'string') return ref;
  if (typeof ref === 'object') {
    const o = ref as PopulatedRef;
    return o._id ?? o.id ?? null;
  }
  return null;
}

function extractTitle(ref: unknown): string | null {
  if (!ref || typeof ref !== 'object') return null;
  return (ref as PopulatedRef).title ?? null;
}

export function MaterialContentInline({ material, enabled }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [resourceBlocks, setResourceBlocks] = useState<unknown[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!enabled || loaded) return;
    setError(null);

    const load = async () => {
      try {
        setBusy(true);

        if (
          material.kind === 'worksheet'
          || material.kind === 'activity'
          || material.kind === 'notes'
          || material.kind === 'worked_example'
        ) {
          const id = extractId(material.contentResourceId);
          if (!id) { setLoaded(true); return; }
          const res = await apiClient.get(`/content-library/resources/${id}`);
          const data = unwrapResponse<{ blocks?: unknown[] }>(res);
          setResourceBlocks(data.blocks ?? []);
          setLoaded(true);
          return;
        }

        if (material.kind === 'practice_questions') {
          const qs = (material.questionIds ?? [])
            .map((q) => (typeof q === 'object' ? (q as QuestionItem) : null))
            .filter((q): q is QuestionItem => !!q);
          if (qs.length > 0) { setQuestions(qs); setLoaded(true); return; }
          const ids = (material.questionIds ?? [])
            .map((q) => extractId(q))
            .filter((s): s is string => !!s);
          if (ids.length === 0) { setLoaded(true); return; }
          const res = await apiClient.get('/question-bank/questions', { params: { ids: ids.join(',') } });
          const data = unwrapResponse<{ items?: QuestionItem[] }>(res);
          setQuestions(data.items ?? []);
          setLoaded(true);
          return;
        }

        if (material.kind === 'homework') {
          const id = extractId(material.homeworkId);
          if (!id) { setLoaded(true); return; }
          const res = await apiClient.get(`/homework/${id}`);
          const data = unwrapResponse<{
            type?: string;
            exerciseQuestions?: QuestionItem[];
            exerciseQuestionIds?: QuestionItem[];
          }>(res);
          setQuestions(data.exerciseQuestions ?? data.exerciseQuestionIds ?? []);
          setLoaded(true);
          return;
        }

        if (material.kind === 'reading') {
          const qs = (material.comprehensionQuestionIds ?? [])
            .map((q) => (typeof q === 'object' ? (q as QuestionItem) : null))
            .filter((q): q is QuestionItem => !!q);
          setQuestions(qs);
          setLoaded(true);
          return;
        }

        setLoaded(true);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to load content';
        setError(msg);
      } finally {
        setBusy(false);
      }
    };
    void load();
  }, [enabled, loaded, material]);

  if (!enabled) return null;
  if (busy) return <div className="py-2"><LoadingSpinner /></div>;
  if (error) return <p className="text-xs text-destructive py-2">{error}</p>;

  return (
    <div className="mt-3 pt-3 border-t space-y-3">
      {material.kind === 'reading' && <ReadingHeader material={material} />}

      {(material.kind === 'homework'
        || material.kind === 'practice_questions'
        || material.kind === 'reading') && (
        <ExerciseQuestionsList questions={questions} />
      )}

      {(material.kind === 'worksheet'
        || material.kind === 'activity'
        || material.kind === 'notes'
        || material.kind === 'worked_example') && (
        <ContentBlocksList blocks={resourceBlocks} />
      )}

      {material.kind === 'quiz' && <QuizSummary material={material} />}
      {material.kind === 'paper' && <PaperSummary material={material} />}
    </div>
  );
}

// Read-only preview: BlockRenderer expects an `onAttempt` for interactive
// blocks (quiz/fill_blank/match/ordering). For teacher preview we never
// submit attempts — return a stable no-op so the renderer is happy.
const NOOP_ATTEMPT_RESULT: AttemptResult = {
  id: 'preview',
  correct: false,
  score: 0,
  maxScore: 0,
  attemptNumber: 0,
};

function defaultInteraction(blockId: string): BlockInteractionState {
  return {
    blockId,
    answered: false,
    correct: null,
    score: 0,
    maxScore: 0,
    showExplanation: false,
    hintsRevealed: 0,
    attemptResult: null,
  };
}

async function noopAttempt(): Promise<AttemptResult> {
  return NOOP_ATTEMPT_RESULT;
}

function ContentBlocksList({ blocks }: { blocks: unknown[] }) {
  if (blocks.length === 0) {
    return <p className="text-xs text-muted-foreground">No content blocks.</p>;
  }
  return (
    <div className="space-y-3">
      {blocks.map((raw, i) => {
        const block = raw as ContentBlockItem;
        const blockId =
          (typeof block.blockId === 'string' && block.blockId) || `preview-${i}`;
        // BlockRenderer reads block.blockId; ensure it's set even if seed data lacks it
        const safeBlock: ContentBlockItem = { ...block, blockId };
        return (
          <BlockRenderer
            key={blockId}
            block={safeBlock}
            onAttempt={noopAttempt}
            interaction={defaultInteraction(blockId)}
          />
        );
      })}
    </div>
  );
}

function QuizSummary({ material }: { material: LessonMaterial & { kind: 'quiz' } }) {
  const id = extractId(material.quizId);
  const title = extractTitle(material.quizId);
  return (
    <div className="text-sm space-y-1">
      <p>Linked quiz: <span className="font-medium">{title ?? id}</span></p>
      {id && <a href={`/teacher/learning/quizzes/${id}`} target="_blank" rel="noreferrer" className="text-primary text-xs hover:underline">Open in Learning module →</a>}
    </div>
  );
}

function PaperSummary({ material }: { material: LessonMaterial & { kind: 'paper' } }) {
  const id = extractId(material.paperId);
  const title = extractTitle(material.paperId);
  return (
    <div className="text-sm space-y-1">
      <p>Linked paper: <span className="font-medium">{title ?? id}</span></p>
      {id && <a href={`/teacher/papers/${id}`} target="_blank" rel="noreferrer" className="text-primary text-xs hover:underline">Open paper detail →</a>}
    </div>
  );
}

function ReadingHeader({ material }: { material: LessonMaterial & { kind: 'reading' } }) {
  const ref = material.textbookRef;
  if (!ref) return null;
  return (
    <div className="rounded border bg-muted/30 p-3 text-xs space-y-1">
      <p className="font-medium">Textbook reference</p>
      {ref.source === 'internal' ? (
        <p className="text-muted-foreground">
          Internal textbook · pages {ref.pageStart ?? '?'}-{ref.pageEnd ?? '?'}
        </p>
      ) : (
        <>
          <p className="text-muted-foreground">{ref.title}{ref.publisher ? ` (${ref.publisher})` : ''}</p>
          {ref.pageStart && ref.pageEnd && <p className="text-muted-foreground">Pages {ref.pageStart}-{ref.pageEnd}</p>}
        </>
      )}
    </div>
  );
}
