'use client';

import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { UnitHome } from '@/components/learner/UnitHome';
import { courseIdOf, useStudentUnits } from '@/hooks/useStudentUnits';
import { useLessonPlayer } from '@/hooks/useLessonPlayer';
import { ROUTES } from '@/lib/routes';
import type { LearnerUnit } from '@/lib/learner-unit';

export default function StudentUnitPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;
  const { enrolments, loading } = useStudentUnits();
  const enrolment = enrolments.find((e) => courseIdOf(e) === courseId) ?? null;
  const player = useLessonPlayer(enrolment?.id ?? '');

  if (loading) return <LoadingSpinner />;
  if (!enrolment) {
    return <EmptyState icon={GraduationCap} title="This unit isn't open to you" description="Ask your teacher to release it to your class." />;
  }
  if (player.loading || !player.enrolmentDetail) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => router.push(ROUTES.STUDENT_COURSES)} className="min-h-11">
        <ChevronLeft className="mr-1 h-4 w-4" /> Courses
      </Button>
      <UnitHome
        unit={player.enrolmentDetail.course as unknown as LearnerUnit & { description?: string }}
        progressPercent={player.enrolmentDetail.enrolment.progressPercent}
        onOpen={(lessonId) => router.push(ROUTES.STUDENT_LESSON_PLAYER(courseId, lessonId))}
      />
    </div>
  );
}
