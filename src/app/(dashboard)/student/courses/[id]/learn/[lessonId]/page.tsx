'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { Lock } from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { LessonMainContent, type QuizSubmit } from '@/components/learner/LessonMainContent';
import { useLessonPlayerActions } from '@/components/learner/LessonPlayerContext';
import type { AttemptResult, BlockInteractionState, LessonWithSource } from '@/types';

/** One item. The learn layout keeps the player; this page only loads the item. */
export default function LessonItemPage() {
  const params = useParams();
  const lessonId = params.lessonId as string;
  const { fetchLesson, writeProgress, submitQuiz } = useLessonPlayerActions();
  // undefined: loading; null: locked or gone.
  const [content, setContent] = useState<LessonWithSource | null | undefined>(undefined);
  const [interactions, setInteractions] = useState<Map<string, BlockInteractionState>>(new Map());
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchLesson(lessonId).then((c) => { if (!cancelled) setContent(c); });
    return () => { cancelled = true; };
  }, [lessonId, fetchLesson]);

  // Reading to the end of an item marks it done.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !content) return undefined;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) setScrolledToEnd(true);
    }, { threshold: 0.5 });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [content]);

  useEffect(() => {
    if (!content || content.source.kind === 'quiz') return;
    const interactionsDone = [...interactions.values()].filter((i) => i.answered).length;
    writeProgress(lessonId, { interactionsDone, scrolledToEnd });
  }, [content, interactions, scrolledToEnd, lessonId, writeProgress]);

  // Interactive blocks in a unit are practice: taking part counts, the quick check is what's marked.
  const onBlockAttempt = useCallback(async (blockId: string): Promise<AttemptResult> => {
    const attemptResult: AttemptResult = { id: `local-${blockId}-${Date.now()}`, correct: true, score: 1, maxScore: 1, attemptNumber: 1 };
    setInteractions((prev) => new Map(prev).set(blockId, {
      blockId, answered: true, correct: true, score: 1, maxScore: 1, showExplanation: true, hintsRevealed: 0, attemptResult,
    }));
    return attemptResult;
  }, []);

  const onSubmitQuiz: QuizSubmit = useCallback(async (answers) => {
    const res = await submitQuiz(lessonId, answers);
    return res ? { attempt: res.attempt, passed: res.passed, canRetry: res.canRetry } : null;
  }, [submitQuiz, lessonId]);

  if (content === undefined) return <LoadingSpinner />;
  if (content === null) {
    return <EmptyState icon={Lock} title="Not open yet" description="Finish the item before this one. Items open in order." />;
  }
  return (
    <>
      <LessonMainContent content={content} interactions={interactions} onBlockAttempt={onBlockAttempt} onSubmitQuiz={onSubmitQuiz} />
      <div ref={sentinelRef} className="h-1" aria-hidden />
    </>
  );
}
