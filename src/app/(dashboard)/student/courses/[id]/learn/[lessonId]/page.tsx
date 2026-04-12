'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { LessonPlayerShell } from '@/components/courses/LessonPlayerShell';
import { LessonQuizShell } from '@/components/courses/LessonQuizShell';
import { BlockRenderer } from '@/components/content/renderers/BlockRenderer';
import { useStudentCourses } from '@/hooks/useStudentCourses';
import { useLessonPlayer } from '@/hooks/useLessonPlayer';
import { ROUTES } from '@/lib/constants';
import { X, BookOpen, FileText, ClipboardList } from 'lucide-react';
import type {
  Enrolment,
  CourseLesson,
  LessonWithSource,
  CourseTree,
  AttemptResult,
  BlockInteractionState,
  ContentBlockItem,
  QuizAttempt,
} from '@/types';

function getCourseIdFromEnrolment(enrolment: Enrolment): string {
  return typeof enrolment.courseId === 'string' ? enrolment.courseId : enrolment.courseId.id;
}

/**
 * Flatten a CourseTree's lessons into their linear-unlock order so we
 * can compute prev/next navigation for the bottom bar.
 */
function flattenLessons(course: CourseTree): CourseLesson[] {
  const all: CourseLesson[] = [];
  const modulesSorted = [...course.modules].sort((a, b) => a.orderIndex - b.orderIndex);
  for (const mod of modulesSorted) {
    const lessons = [...mod.lessons].sort((a, b) => a.orderIndex - b.orderIndex);
    all.push(...lessons);
  }
  return all;
}

/**
 * Initial BlockInteractionState for a block — not yet answered.
 */
function emptyInteraction(blockId: string): BlockInteractionState {
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

export default function LessonPlayerPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;
  const lessonId = params.lessonId as string;

  const { myEnrolments, loading: enrolmentsLoading } = useStudentCourses();
  const enrolment = myEnrolments.find((e) => getCourseIdFromEnrolment(e) === courseId);
  const player = useLessonPlayer(enrolment?.id ?? '');

  const [lessonContent, setLessonContent] = useState<LessonWithSource | null>(null);
  const [loadingLesson, setLoadingLesson] = useState(false);
  // Per-block interaction state — keyed by blockId, reset on lesson change.
  const [interactions, setInteractions] = useState<Map<string, BlockInteractionState>>(new Map());
  // Scrolled-to-end signal for text-only lessons.
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const scrollSentinelRef = useRef<HTMLDivElement | null>(null);

  const { fetchLesson, writeProgress, submitQuiz } = player;

  // Fetch the current lesson whenever lessonId changes. Reset interaction
  // state + scroll flag for the new lesson.
  useEffect(() => {
    if (!enrolment || !lessonId) return;
    let cancelled = false;
    setLoadingLesson(true);
    setInteractions(new Map());
    setScrolledToEnd(false);
    void (async () => {
      const content = await fetchLesson(lessonId);
      if (!cancelled) {
        setLessonContent(content);
        setLoadingLesson(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enrolment, lessonId, fetchLesson]);

  // Observe the scroll sentinel to detect "scrolled to end" for text-
  // only lessons. The sentinel is rendered at the bottom of the main
  // pane content; when it enters the viewport we flip the flag once.
  useEffect(() => {
    const sentinel = scrollSentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !scrolledToEnd) {
            setScrolledToEnd(true);
          }
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [scrolledToEnd, lessonContent]);

  // Whenever the interaction count or scroll flag changes, fire a
  // debounced progress write via the hook.
  useEffect(() => {
    if (!lessonContent) return;
    const interactionsDone = Array.from(interactions.values()).filter(
      (i) => i.answered,
    ).length;
    writeProgress(lessonId, {
      interactionsDone,
      scrolledToEnd,
    });
  }, [interactions, scrolledToEnd, lessonId, lessonContent, writeProgress]);

  // Per-block attempt handler. Called from BlockRenderer's onAttempt.
  // Content blocks in a course context are "participation" — we don't
  // grade them client-side, we just tick the interaction count so the
  // player reports progress. Quiz lessons go through submitQuiz instead.
  const handleBlockAttempt = useCallback(
    async (blockId: string, response: string): Promise<AttemptResult> => {
      const attemptResult: AttemptResult = {
        id: `local-${blockId}-${Date.now()}`,
        correct: true,
        score: 1,
        maxScore: 1,
        attemptNumber: 1,
      };
      setInteractions((prev) => {
        const next = new Map(prev);
        next.set(blockId, {
          blockId,
          answered: true,
          correct: true,
          score: 1,
          maxScore: 1,
          showExplanation: true,
          hintsRevealed: 0,
          attemptResult,
        });
        return next;
      });
      // Avoid lint warning about unused parameter.
      void response;
      return attemptResult;
    },
    [],
  );

  // Compute prev/next lesson IDs from the flattened lesson list.
  const flatLessons = useMemo(() => {
    if (!player.enrolmentDetail) return [] as CourseLesson[];
    return flattenLessons(player.enrolmentDetail.course);
  }, [player.enrolmentDetail]);

  const currentIdx = flatLessons.findIndex((l) => l.id === lessonId);
  const prevLesson = currentIdx > 0 ? flatLessons[currentIdx - 1] : null;
  const nextLesson =
    currentIdx >= 0 && currentIdx < flatLessons.length - 1 ? flatLessons[currentIdx + 1] : null;

  // canGoNext: the NEXT lesson must have an unlockStatus that isn't
  // 'locked'. The decorated tree from getEnrolment attaches unlockStatus
  // at runtime; we cast because the base CourseLesson type doesn't carry it.
  const nextUnlockStatus = nextLesson
    ? (nextLesson as CourseLesson & { unlockStatus?: string }).unlockStatus
    : undefined;
  const canGoNext =
    nextLesson !== null && nextUnlockStatus !== undefined && nextUnlockStatus !== 'locked';
  const canGoPrevious = prevLesson !== null;

  const navigate = (newLessonId: string) => {
    router.push(ROUTES.STUDENT_LESSON_PLAYER(courseId, newLessonId));
  };

  const handleSubmitQuiz = useCallback(
    async (
      answers: { questionId: string; answer: unknown }[],
    ): Promise<{ attempt: QuizAttempt; passed: boolean; canRetry: boolean } | null> => {
      const res = await submitQuiz(lessonId, answers);
      if (!res) return null;
      return { attempt: res.attempt, passed: res.passed, canRetry: res.canRetry };
    },
    [submitQuiz, lessonId],
  );

  // ─── Loading / error states ────────────────────────────────────────

  if (enrolmentsLoading) return <LoadingSpinner />;
  if (!enrolment) {
    return (
      <EmptyState
        icon={X}
        title="Not enroled"
        description="You are not enroled in this course."
      />
    );
  }
  if (player.loading || !player.enrolmentDetail) return <LoadingSpinner />;

  const currentLessonFromTree = flatLessons.find((l) => l.id === lessonId);
  if (!currentLessonFromTree) {
    return (
      <EmptyState
        icon={X}
        title="Lesson not found"
        description="This lesson may have been removed from the course."
      />
    );
  }

  return (
    <LessonPlayerShell
      course={player.enrolmentDetail.course}
      currentLessonId={lessonId}
      onSelectLesson={navigate}
      onPrevious={() => prevLesson && navigate(prevLesson.id)}
      onNext={() => nextLesson && navigate(nextLesson.id)}
      canGoNext={canGoNext}
      canGoPrevious={canGoPrevious}
    >
      {loadingLesson && <LoadingSpinner />}
      {!loadingLesson && lessonContent && (
        <LessonMainContent
          content={lessonContent}
          interactions={interactions}
          onBlockAttempt={handleBlockAttempt}
          onSubmitQuiz={handleSubmitQuiz}
        />
      )}
      {/* Scroll-to-end sentinel — last element in the main pane */}
      <div ref={scrollSentinelRef} className="h-1" />
    </LessonPlayerShell>
  );
}

// ─── Main content switch ──────────────────────────────────────────────

interface LessonMainContentProps {
  content: LessonWithSource;
  interactions: Map<string, BlockInteractionState>;
  onBlockAttempt: (blockId: string, response: string) => Promise<AttemptResult>;
  onSubmitQuiz: (
    answers: { questionId: string; answer: unknown }[],
  ) => Promise<{ attempt: QuizAttempt; passed: boolean; canRetry: boolean } | null>;
}

function LessonMainContent({
  content,
  interactions,
  onBlockAttempt,
  onSubmitQuiz,
}: LessonMainContentProps) {
  const { lesson, source } = content;

  if (source.kind === 'content') {
    // Render ContentResource blocks via BlockRenderer. The ContentResourceLite
    // shape is looser than ContentBlockItem; the renderer is tolerant of
    // missing optional fields, so the double-cast is safe.
    const sortedBlocks = [...source.resource.blocks].sort((a, b) => a.order - b.order);
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">{lesson.title}</h1>
        {sortedBlocks.map((block) => {
          const interaction = interactions.get(block.blockId) ?? emptyInteraction(block.blockId);
          return (
            <BlockRenderer
              key={block.blockId}
              block={block as unknown as ContentBlockItem}
              onAttempt={onBlockAttempt}
              interaction={interaction}
            />
          );
        })}
      </div>
    );
  }

  if (source.kind === 'chapter') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <BookOpen className="h-4 w-4" />
          <span>From {source.textbook.title}</span>
        </div>
        <h1 className="text-2xl font-bold">{source.chapter.title}</h1>
        {source.chapter.description && (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {source.chapter.description}
          </p>
        )}
        <p className="text-sm text-muted-foreground italic">
          Scroll to the bottom of this lesson to mark it complete.
        </p>
      </div>
    );
  }

  if (source.kind === 'homework') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ClipboardList className="h-4 w-4" />
          <span>Homework assignment</span>
        </div>
        <h1 className="text-2xl font-bold">{source.homework.title}</h1>
        <p className="text-sm whitespace-pre-wrap">{source.homework.description}</p>
        <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
          Submit this homework via the Homework page. Your submission will mark this lesson complete.
        </div>
      </div>
    );
  }

  if (source.kind === 'quiz') {
    return (
      <LessonQuizShell
        lessonTitle={lesson.title}
        questions={source.questions}
        maxAttempts={lesson.maxAttempts}
        onSubmit={onSubmitQuiz}
      />
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
      <FileText className="h-4 w-4" />
      <span>Unsupported lesson type</span>
    </div>
  );
}
