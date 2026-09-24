'use client';

import { BookOpen, ClipboardList, FileText } from 'lucide-react';
import { LessonQuizShell } from '@/components/courses/LessonQuizShell';
import { BlockRenderer } from '@/components/content/renderers/BlockRenderer';
import type { AttemptResult, BlockInteractionState, ContentBlockItem, LessonWithSource, QuizAttempt } from '@/types';

export type QuizSubmit = (
  answers: { questionId: string; answer: unknown }[],
) => Promise<{ attempt: QuizAttempt; passed: boolean; canRetry: boolean } | null>;

interface Props {
  content: LessonWithSource;
  interactions: Map<string, BlockInteractionState>;
  onBlockAttempt: (blockId: string, response: string) => Promise<AttemptResult>;
  onSubmitQuiz: QuizSubmit;
}

export function emptyInteraction(blockId: string): BlockInteractionState {
  return { blockId, answered: false, correct: null, score: 0, maxScore: 0, showExplanation: false, hintsRevealed: 0, attemptResult: null };
}

/** One course item's content: blocks, a textbook chapter, homework, or a quick check. */
export function LessonMainContent({ content, interactions, onBlockAttempt, onSubmitQuiz }: Props) {
  const { lesson, source } = content;

  if (source.kind === 'content') {
    const blocks = [...source.resource.blocks].sort((a, b) => a.order - b.order);
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">{lesson.title}</h1>
        {blocks.map((block) => (
          <BlockRenderer
            key={block.blockId}
            block={block as unknown as ContentBlockItem}
            onAttempt={onBlockAttempt}
            interaction={interactions.get(block.blockId) ?? emptyInteraction(block.blockId)}
          />
        ))}
      </div>
    );
  }

  if (source.kind === 'chapter') {
    return (
      <div className="space-y-4">
        <p className="flex items-center gap-2 text-sm text-muted-foreground"><BookOpen className="h-4 w-4" aria-hidden /> From {source.textbook.title}</p>
        <h1 className="text-2xl font-semibold">{source.chapter.title}</h1>
        {source.chapter.description ? <p className="whitespace-pre-wrap text-sm text-muted-foreground">{source.chapter.description}</p> : null}
        <p className="text-sm italic text-muted-foreground">Scroll to the end to mark this done.</p>
      </div>
    );
  }

  if (source.kind === 'homework') {
    return (
      <div className="space-y-4">
        <p className="flex items-center gap-2 text-sm text-muted-foreground"><ClipboardList className="h-4 w-4" aria-hidden /> Homework</p>
        <h1 className="text-2xl font-semibold">{source.homework.title}</h1>
        <p className="whitespace-pre-wrap text-sm">{source.homework.description}</p>
        <p className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">Hand this in on the Homework page. That marks it done here too.</p>
      </div>
    );
  }

  if (source.kind === 'quiz') {
    // Keyed by the questions, so a check reloaded with new questions starts with no stale answers.
    return <LessonQuizShell key={source.questions.map((q) => q.id).join(',')} lessonTitle={lesson.title} questions={source.questions} maxAttempts={lesson.maxAttempts} onSubmit={onSubmitQuiz} />;
  }

  return (
    <p className="flex items-center gap-2 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
      <FileText className="h-4 w-4" aria-hidden /> This item can&apos;t be shown here.
    </p>
  );
}
