'use client';

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { GraduationCap } from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { LessonPlayerShell } from '@/components/courses/LessonPlayerShell';
import { LessonPlayerProvider } from '@/components/learner/LessonPlayerContext';
import { courseIdOf, useStudentUnits } from '@/hooks/useStudentUnits';
import { useLessonPlayer } from '@/hooks/useLessonPlayer';
import { ROUTES } from '@/lib/routes';
import type { CourseLesson, CourseTree } from '@/types';

/** The unit's items in unlock order, for Previous / Next. */
function flatten(course: CourseTree): Array<CourseLesson & { unlockStatus?: string }> {
  return [...course.modules]
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .flatMap((m) => [...m.lessons].sort((a, b) => a.orderIndex - b.orderIndex));
}

/**
 * The player stays mounted while the learner moves between items: the unit
 * tree, outline and Previous / Next load once, and each item page only
 * fetches its own content.
 */
export default function LearnLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;
  const lessonId = params.lessonId as string;
  const { enrolments, loading } = useStudentUnits();
  const enrolment = enrolments.find((e) => courseIdOf(e) === courseId) ?? null;
  const player = useLessonPlayer(enrolment?.id ?? '');
  const { fetchLesson, writeProgress, submitQuiz } = player;
  const actions = useMemo(() => ({ fetchLesson, writeProgress, submitQuiz }), [fetchLesson, writeProgress, submitQuiz]);

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
    <LessonPlayerProvider value={actions}>
      <LessonPlayerShell
        course={player.enrolmentDetail.course}
        currentLessonId={lessonId}
        onSelectLesson={go}
        onPrevious={() => { if (prev) go(prev.id); }}
        onNext={() => { if (next) go(next.id); }}
        canGoNext={next !== null && next.unlockStatus !== undefined && next.unlockStatus !== 'locked'}
        canGoPrevious={prev !== null}
      >
        {children}
      </LessonPlayerShell>
    </LessonPlayerProvider>
  );
}
