import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { unwrapResponse, extractErrorMessage } from '@/lib/api-helpers';
import type {
  Enrolment,
  CourseTree,
  LessonWithSource,
  QuizAttempt,
} from '@/types';

interface EnrolmentDetail {
  enrolment: Enrolment;
  course: CourseTree;
}

export type FetchLessonResult =
  | { ok: true; lesson: LessonWithSource }
  /** locked: the previous item isn't done yet. error: a network/server failure — not the same thing to a learner. */
  | { ok: false; reason: 'locked' | 'error'; message: string };

interface ProgressWriteBody {
  interactionsDone?: number;
  scrolledToEnd?: boolean;
}

interface ProgressWriteResponse {
  progress: unknown;
  lessonStatus: string;
  nextLessonUnlocked: boolean;
}

interface QuizSubmitResponse {
  attempt: QuizAttempt;
  passed: boolean;
  canRetry: boolean;
  nextLessonUnlocked: boolean;
}

/**
 * Hook for the student course home + lesson player. Takes an
 * enrolmentId (which callers resolve from courseId via
 * useStudentCourses.myEnrolments first) and exposes:
 *
 * - `enrolmentDetail` — { enrolment, course } with per-lesson progress
 *   and unlock statuses, suitable for rendering the course home +
 *   lesson outline sidebar directly.
 * - `fetchLesson(lessonId)` — loads one lesson's content payload,
 *   enforcing unlock server-side. Returns null on 403 (locked) or 404.
 * - `writeProgress(lessonId, body)` — idempotent progress write,
 *   debounced by 500ms. Queues the latest body and flushes 500ms
 *   after the last call. If the server reports `lessonStatus === 'completed'`,
 *   the hook refetches the enrolment tree so the outline reflects
 *   the new unlock state.
 * - `submitQuiz(lessonId, answers)` — single-shot quiz attempt.
 *   Shows a success toast on pass, an info toast on fail (with retry
 *   hint when applicable). Refetches the tree on pass.
 *
 * Guards against empty enrolmentId — callers may pass '' while they
 * resolve courseId → enrolmentId, so the hook no-ops on empty input.
 */
export function useLessonPlayer(enrolmentId: string) {
  const [enrolmentDetail, setEnrolmentDetail] = useState<EnrolmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEnrolment = useCallback(async () => {
    if (!enrolmentId) {
      setLoading(false);
      return;
    }
    try {
      const res = await apiClient.get(`/enrolments/${enrolmentId}`);
      const data = unwrapResponse<EnrolmentDetail>(res);
      setEnrolmentDetail(data);
      setError(null);
    } catch (err: unknown) {
      console.error('Failed to load enrolment', err);
      const message = extractErrorMessage(err, 'Could not load this unit. Please try again.');
      toast.error(message);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [enrolmentId]);

  useEffect(() => {
    void fetchEnrolment();
  }, [fetchEnrolment]);

  const fetchLesson = useCallback(
    async (lessonId: string): Promise<FetchLessonResult | null> => {
      if (!enrolmentId || !lessonId) return null;
      try {
        const res = await apiClient.get(`/enrolments/${enrolmentId}/lessons/${lessonId}`);
        return { ok: true, lesson: unwrapResponse<LessonWithSource>(res) };
      } catch (err: unknown) {
        // A locked lesson (403, or a missing one, 404 — both mean "not
        // reachable yet") reads differently to a learner than a genuine
        // network or server failure.
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 403 || status === 404) {
          const message = 'Complete the previous lesson first.';
          toast.error(message);
          return { ok: false, reason: 'locked', message };
        }
        const message = extractErrorMessage(err, 'Could not load lesson.');
        toast.error(message);
        return { ok: false, reason: 'error', message };
      }
    },
    [enrolmentId],
  );

  // ─── Debounced progress writer ──────────────────────────────────────
  //
  // Queues the latest { lessonId, body } and fires 500ms after the last
  // call. If a new call comes in before the timer fires, resets the
  // timer. Merges interactionsDone (taking the max) and scrolledToEnd
  // (true dominates) so rapid calls don't drop signals.
  //
  // On success, if the server reports lessonStatus === 'completed', we
  // refetch the enrolment tree so the outline picks up the new unlock
  // state for the next lesson.
  const queueRef = useRef<{ lessonId: string; body: ProgressWriteBody } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushProgress = useCallback(async () => {
    const queued = queueRef.current;
    queueRef.current = null;
    if (!queued || !enrolmentId) return;
    try {
      const res = await apiClient.post(
        `/enrolments/${enrolmentId}/lessons/${queued.lessonId}/progress`,
        queued.body,
      );
      const result = unwrapResponse<ProgressWriteResponse>(res);
      if (result.lessonStatus === 'completed') {
        await fetchEnrolment();
      }
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to save progress.'));
    }
  }, [enrolmentId, fetchEnrolment]);

  const writeProgress = useCallback(
    (lessonId: string, body: ProgressWriteBody) => {
      // Merge into the queue: max of interactionsDone, OR of scrolledToEnd.
      const existing = queueRef.current;
      const merged: ProgressWriteBody = existing && existing.lessonId === lessonId
        ? {
            interactionsDone: Math.max(
              existing.body.interactionsDone ?? 0,
              body.interactionsDone ?? 0,
            ) || (existing.body.interactionsDone ?? body.interactionsDone),
            scrolledToEnd: existing.body.scrolledToEnd || body.scrolledToEnd,
          }
        : body;
      queueRef.current = { lessonId, body: merged };

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        void flushProgress();
      }, 500);
    },
    [flushProgress],
  );

  // Flush any pending write on unmount so the student doesn't lose
  // in-flight progress when navigating away.
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        // Fire-and-forget flush — we can't await during cleanup.
        void flushProgress();
      }
    };
  }, [flushProgress]);

  // ─── Quiz submission ────────────────────────────────────────────────

  const submitQuiz = useCallback(
    async (
      lessonId: string,
      answers: { questionId: string; answer: unknown }[],
    ): Promise<QuizSubmitResponse | null> => {
      if (!enrolmentId || !lessonId) return null;
      try {
        const res = await apiClient.post(
          `/enrolments/${enrolmentId}/lessons/${lessonId}/quiz-attempt`,
          { answers },
        );
        const result = unwrapResponse<QuizSubmitResponse>(res);
        if (result.passed) {
          toast.success(`Passed! ${result.attempt.percent}%`);
          await fetchEnrolment();
        } else if (result.canRetry) {
          toast.info(`Not quite — you scored ${result.attempt.percent}%. Try again.`);
        } else {
          toast.error(`Quiz not passed (${result.attempt.percent}%). No attempts left.`);
        }
        return result;
      } catch (err: unknown) {
        toast.error(extractErrorMessage(err, 'Failed to submit quiz.'));
        return null;
      }
    },
    [enrolmentId, fetchEnrolment],
  );

  return {
    enrolmentDetail,
    loading,
    error,
    fetchLesson,
    writeProgress,
    submitQuiz,
    refresh: fetchEnrolment,
  };
}
