'use client';

import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { CourseHome } from '@/components/courses/CourseHome';
import { useStudentCourses } from '@/hooks/useStudentCourses';
import { useLessonPlayer } from '@/hooks/useLessonPlayer';
import { ROUTES } from '@/lib/constants';
import { X } from 'lucide-react';
import type { Enrolment } from '@/types';

function getCourseIdFromEnrolment(enrolment: Enrolment): string {
  return typeof enrolment.courseId === 'string' ? enrolment.courseId : enrolment.courseId.id;
}

export default function StudentCourseHomePage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;
  const { myEnrolments, loading: enrolmentsLoading } = useStudentCourses();

  // Find the enrolment for this course.
  const enrolment = myEnrolments.find((e) => getCourseIdFromEnrolment(e) === courseId);

  // Pass an empty string if we haven't resolved yet — the hook no-ops.
  const player = useLessonPlayer(enrolment?.id ?? '');

  if (enrolmentsLoading) return <LoadingSpinner />;

  if (!enrolment) {
    return (
      <div className="space-y-6">
        <PageHeader title="Course" />
        <EmptyState
          icon={X}
          title="Not enroled"
          description="You are not enroled in this course. Ask your teacher to assign it."
        />
      </div>
    );
  }

  if (player.loading || !player.enrolmentDetail) {
    return <LoadingSpinner />;
  }

  return (
    <CourseHome
      course={player.enrolmentDetail.course}
      progressPercent={player.enrolmentDetail.enrolment.progressPercent}
      onOpenLesson={(lessonId) =>
        router.push(ROUTES.STUDENT_LESSON_PLAYER(courseId, lessonId))
      }
    />
  );
}
