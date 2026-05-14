'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ExerciseQuestionsList } from '@/components/homework/ExerciseQuestionsList';
import { BlockRenderer } from '@/components/content/renderers/BlockRenderer';
import { useLessonMaterialPreview } from '@/hooks/useLessonMaterialPreview';
import type { LessonMaterial } from '@/types/lesson';
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
  const { busy, error, questions, resourceBlocks } = useLessonMaterialPreview(material, enabled);

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
        || material.kind === 'study_notes'
        || material.kind === 'worked_example') && (
        <ContentBlocksList blocks={resourceBlocks} />
      )}

      {material.kind === 'quiz' && <QuizSummary material={material} />}
      {material.kind === 'paper' && <PaperSummary material={material} />}
    </div>
  );
}

// Default state for a block before any teacher interaction.
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

/**
 * Best-effort local correctness check for quiz/true_false blocks in the
 * teacher preview. The content is JSON; we look for an option with
 * `isCorrect: true` (structured format) or a `correctIndex` (legacy seed
 * format) and compare against the teacher's response. Returns null when
 * we can't determine — caller renders the question as "answered" without
 * a correct/incorrect verdict.
 */
function judgeQuizResponse(block: ContentBlockItem, response: string): boolean | null {
  try {
    const parsed = JSON.parse(block.content) as Record<string, unknown>;
    if (Array.isArray(parsed.options) && parsed.options.length > 0) {
      const first = parsed.options[0];
      // Structured: options is array of { label, text, isCorrect }
      if (typeof first === 'object' && first !== null) {
        for (const opt of parsed.options as Array<Record<string, unknown>>) {
          if (opt.isCorrect === true) {
            return opt.label === response || opt.text === response;
          }
        }
        return null;
      }
      // Legacy: options is string[], correctIndex points at one
      if (typeof first === 'string' && typeof parsed.correctIndex === 'number') {
        const correctText = (parsed.options as string[])[parsed.correctIndex];
        return correctText === response;
      }
    }
    // True/False — explicit correct field
    if (parsed.type === 'true_false' && typeof parsed.correctAnswer === 'string') {
      return parsed.correctAnswer.toLowerCase() === response.toLowerCase();
    }
    // Short answer: too many valid phrasings to judge with string equality.
    // Return null so the preview marks the question as answered without
    // claiming the teacher's response is right or wrong.
  } catch {
    /* fallthrough */
  }
  return null;
}

function ContentBlocksList({ blocks }: { blocks: unknown[] }) {
  const [interactions, setInteractions] = useState<Map<string, BlockInteractionState>>(
    () => new Map(),
  );

  const handleAttempt = useCallback(
    async (blockId: string, response: string): Promise<AttemptResult> => {
      // Find the original block to judge correctness against. We re-walk
      // the blocks array each call — cheap, only fires on click.
      const raw = (blocks as ContentBlockItem[]).find((b, i) => {
        const id = (typeof b.blockId === 'string' && b.blockId) || `preview-${i}`;
        return id === blockId;
      });
      const correct = raw ? judgeQuizResponse(raw, response) : null;
      const result: AttemptResult = {
        id: `preview-${blockId}`,
        correct: correct === true,
        score: correct === true ? 1 : 0,
        maxScore: 1,
        attemptNumber: 1,
      };
      setInteractions((prev) => {
        const next = new Map(prev);
        next.set(blockId, {
          blockId,
          answered: true,
          correct,
          score: result.score,
          maxScore: result.maxScore,
          showExplanation: true,
          hintsRevealed: 0,
          attemptResult: result,
        });
        return next;
      });
      return result;
    },
    [blocks],
  );

  if (blocks.length === 0) {
    return <p className="text-xs text-muted-foreground">No content blocks.</p>;
  }
  return (
    <div className="space-y-3">
      {blocks.map((raw, i) => {
        const block = raw as ContentBlockItem;
        const blockId =
          (typeof block.blockId === 'string' && block.blockId) || `preview-${i}`;
        const safeBlock: ContentBlockItem = { ...block, blockId };
        const interaction = interactions.get(blockId) ?? defaultInteraction(blockId);
        return (
          <BlockRenderer
            key={blockId}
            block={safeBlock}
            onAttempt={handleAttempt}
            interaction={interaction}
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
      {id && (
        <Link href="/teacher/learning" className="text-primary text-xs hover:underline">
          Open Learning module
        </Link>
      )}
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
