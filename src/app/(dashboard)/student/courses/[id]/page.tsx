'use client';

import { useParams, useRouter } from 'next/navigation';
import { AlertTriangle, ChevronLeft, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { UnitHome } from '@/components/learner/UnitHome';
import { courseIdOf, useStudentUnits } from '@/hooks/useStudentUnits';
import { useLessonPlayer } from '@/hooks/useLessonPlayer';
import { ROUTES } from '@/lib/routes';

export default function StudentUnitPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;
  const { enrolments, loading, failed } = useStudentUnits();
  const enrolment = enrolments.find((e) => courseIdOf(e) === courseId) ?? null;
  const player = useLessonPlayer(enrolment?.id ?? '');

  if (loading) return <LoadingSpinner />;
  if (failed) {
    return <EmptyState icon={AlertTriangle} title="Couldn't load your units" description="Check your connection and refresh to try again." />;
  }
  if (!enrolment) {
    return <EmptyState icon={GraduationCap} title="This unit isn't open to you" description="Ask your teacher to release it to your class." />;
  }
  if (player.loading) return <LoadingSpinner />;
  if (player.error || !player.enrolmentDetail) {
    return <EmptyState icon={AlertTriangle} title="Couldn't load this unit" description={player.error ?? 'Try refreshing the page.'} />;
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => router.push(ROUTES.STUDENT_COURSES)} className="min-h-11">
        <ChevronLeft className="mr-1 h-4 w-4" /> Courses
      </Button>
      <UnitHome
        unit={player.enrolmentDetail.course}
        progressPercent={player.enrolmentDetail.enrolment.progressPercent}
        onOpen={(lessonId) => router.push(ROUTES.STUDENT_LESSON_PLAYER(courseId, lessonId))}
      />
    </div>
  );
}
