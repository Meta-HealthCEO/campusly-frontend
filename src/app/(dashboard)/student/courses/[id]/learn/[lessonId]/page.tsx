'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { GraduationCap, Lock } from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { LessonPlayerShell } from '@/components/courses/LessonPlayerShell';
import { LessonMainContent, type QuizSubmit } from '@/components/learner/LessonMainContent';
import { courseIdOf, useStudentUnits } from '@/hooks/useStudentUnits';
import { useLessonPlayer } from '@/hooks/useLessonPlayer';
import { ROUTES } from '@/lib/routes';
import type { AttemptResult, BlockInteractionState, CourseLesson, CourseTree, LessonWithSource } from '@/types';

type Player = ReturnType<typeof useLessonPlayer>;

/** The unit's items in unlock order, for Previous / Next. */
function flatten(course: CourseTree): Array<CourseLesson & { unlockStatus?: string }> {
  return [...course.modules]
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .flatMap((m) => [...m.lessons].sort((a, b) => a.orderIndex - b.orderIndex));
}

interface BodyProps {
  lessonId: string;
  fetchLesson: Player['fetchLesson'];
  writeProgress: Player['writeProgress'];
  submitQuiz: Player['submitQuiz'];
}

/** One item. Keyed by item, so moving on starts it fresh. */
function LessonBody({ lessonId, fetchLesson, writeProgress, submitQuiz }: BodyProps) {
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
    return <EmptyState icon={Lock} title="Not open yet" description="Finish the item before this one first. Items open in order." />;
  }
  return (
    <>
      <LessonMainContent content={content} interactions={interactions} onBlockAttempt={onBlockAttempt} onSubmitQuiz={onSubmitQuiz} />
      <div ref={sentinelRef} className="h-1" aria-hidden />
    </>
  );
}

export default function LessonPlayerPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;
  const lessonId = params.lessonId as string;
  const { enrolments, loading } = useStudentUnits();
  const enrolment = enrolments.find((e) => courseIdOf(e) === courseId) ?? null;
  const player = useLessonPlayer(enrolment?.id ?? '');
  const { fetchLesson, writeProgress, submitQuiz } = player;

  const items = useMemo(() => (player.enrolmentDetail ? flatten(player.enrolmentDetail.course) : []), [player.enrolmentDetail]);
  const index = items.findIndex((l) => l.id === lessonId);
  const prev = index > 0 ? items[index - 1] : null;
  const next = index >= 0 && index < items.length - 1 ? items[index + 1] : null;
  const go = (id: string): void => router.push(ROUTES.STUDENT_LESSON_PLAYER(courseId, id));

  if (loading) return <LoadingSpinner />;
  if (!enrolment) {
    return <EmptyState icon={GraduationCap} title="This unit isn't open to you" description="Ask your teacher to release it to your class." />;
  }
  if (player.loading || !player.enrolmentDetail) return <LoadingSpinner />;
  if (index === -1) {
    return <EmptyState icon={GraduationCap} title="Item not found" description="Your teacher may have removed it from the unit." />;
  }

  return (
    <LessonPlayerShell
      course={player.enrolmentDetail.course}
      currentLessonId={lessonId}
      onSelectLesson={go}
      onPrevious={() => { if (prev) go(prev.id); }}
      onNext={() => { if (next) go(next.id); }}
      canGoNext={next !== null && next.unlockStatus !== undefined && next.unlockStatus !== 'locked'}
      canGoPrevious={prev !== null}
    >
      <LessonBody key={lessonId} lessonId={lessonId} fetchLesson={fetchLesson} writeProgress={writeProgress} submitQuiz={submitQuiz} />
    </LessonPlayerShell>
  );
}
