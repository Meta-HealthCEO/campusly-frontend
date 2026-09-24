'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { AlertTriangle, Lock } from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { LessonMainContent, type QuizSubmit } from '@/components/learner/LessonMainContent';
import { useLessonPlayerActions } from '@/components/learner/LessonPlayerContext';
import { gradeBlockLocally } from '@/lib/block-grading';
import { applyAttemptToInteraction, createDefaultInteraction } from '@/lib/block-interactions';
import type { FetchLessonResult } from '@/hooks/useLessonPlayer';
import type { AttemptResult, BlockInteractionState } from '@/types';

/** One item. The learn layout keeps the player; this page only loads the item. */
export default function LessonItemPage() {
  const params = useParams();
  const lessonId = params.lessonId as string;
  const { fetchLesson, writeProgress, submitQuiz } = useLessonPlayerActions();
  // undefined: loading.
  const [content, setContent] = useState<FetchLessonResult | null | undefined>(undefined);
  const [interactions, setInteractions] = useState<Map<string, BlockInteractionState>>(new Map());
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchLesson(lessonId).then((c) => { if (!cancelled) setContent(c); });
    return () => { cancelled = true; };
  }, [lessonId, fetchLesson]);

  // A worked example's step-reveal blocks report an attempt once every step
  // is shown (see BlockRenderer/StepRevealBlock). Until then, the item
  // can't be "read to the end" — otherwise short content (few steps) can
  // already have the sentinel on-screen the moment the item opens, before
  // the learner has revealed anything past the first step.
  const hasUnrevealedSteps = content?.ok && content.lesson.source.kind === 'content'
    ? content.lesson.source.resource.blocks.some((b) => b.type === 'step_reveal' && !interactions.get(b.blockId)?.answered)
    : false;

  // Reading to the end of an item marks it done.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !content?.ok || hasUnrevealedSteps) return undefined;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) setScrolledToEnd(true);
    }, { threshold: 0.5 });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [content, hasUnrevealedSteps]);

  useEffect(() => {
    if (!content?.ok || content.lesson.source.kind === 'quiz') return;
    const interactionsDone = [...interactions.values()].filter((i) => i.answered).length;
    writeProgress(lessonId, { interactionsDone, scrolledToEnd });
  }, [content, interactions, scrolledToEnd, lessonId, writeProgress]);

  // Interactive blocks in a unit are practice: taking part counts toward
  // reading the item, the quick check is what's marked for the unit. But
  // "taking part counts" isn't "everything is correct" — grade the response
  // against the block's own answer key, same as the content library does.
  const onBlockAttempt = useCallback(async (blockId: string, response: string): Promise<AttemptResult> => {
    const block = content?.ok && content.lesson.source.kind === 'content'
      ? content.lesson.source.resource.blocks.find((b) => b.blockId === blockId)
      : undefined;
    const points = (block as { points?: number } | undefined)?.points ?? 1;
    const local = block
      ? gradeBlockLocally(block.type, block.content, response, points)
      : { correct: false as boolean | null, score: 0, maxScore: 1 };
    const attemptResult: AttemptResult = { id: `local-${blockId}-${Date.now()}`, correct: local.correct === true, score: local.score, maxScore: local.maxScore, attemptNumber: 1 };
    setInteractions((prev) => {
      const next = new Map(prev);
      const current = prev.get(blockId) ?? createDefaultInteraction(blockId);
      next.set(blockId, applyAttemptToInteraction(current, attemptResult, local.correct));
      return next;
    });
    return attemptResult;
  }, [content]);

  const onSubmitQuiz: QuizSubmit = useCallback(async (answers) => {
    const res = await submitQuiz(lessonId, answers);
    if (res && 'stale' in res) {
      // The teacher changed this check: load its current questions, or every
      // resubmit of the old ones is refused. The quiz starts over with them.
      const fresh = await fetchLesson(lessonId);
      if (fresh) setContent(fresh);
      return null;
    }
    return res ? { attempt: res.attempt, passed: res.passed, canRetry: res.canRetry } : null;
  }, [submitQuiz, fetchLesson, lessonId]);

  if (content === undefined) return <LoadingSpinner />;
  if (content === null || !content.ok) {
    if (content?.reason === 'error') {
      return <EmptyState icon={AlertTriangle} title="Couldn't load this item" description={content.message} />;
    }
    return <EmptyState icon={Lock} title="Not open yet" description="Finish the item before this one. Items open in order." />;
  }
  return (
    <>
      <LessonMainContent content={content.lesson} interactions={interactions} onBlockAttempt={onBlockAttempt} onSubmitQuiz={onSubmitQuiz} />
      <div ref={sentinelRef} className="h-1" aria-hidden />
    </>
  );
}
