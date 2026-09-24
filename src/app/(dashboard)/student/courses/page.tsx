'use client';

import Link from 'next/link';
import { AlertTriangle, GraduationCap } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { CardGridSkeleton } from '@/components/shared/skeletons';
import { EmptyState } from '@/components/shared/EmptyState';
import { ResumeUnitCard } from '@/components/learner/ResumeUnitCard';
import { courseIdOf, courseOf, useStudentUnits } from '@/hooks/useStudentUnits';
import { ROUTES } from '@/lib/routes';
import type { Enrolment } from '@/types';

function UnitRow({ enrolment }: { enrolment: Enrolment }) {
  const course = courseOf(enrolment);
  const subject = course && typeof course.subjectId === 'object' && course.subjectId ? course.subjectId.name : '';
  const done = enrolment.status === 'completed';
  return (
    <li>
      <Link href={ROUTES.STUDENT_COURSE_HOME(courseIdOf(enrolment))} className="block rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-foreground">
        <p className="truncate font-medium">{course?.title ?? 'Unit'}</p>
        <p className="text-xs text-muted-foreground">{[subject, done ? 'Finished' : `${enrolment.progressPercent}% done`].filter(Boolean).join(' · ')}</p>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
          <div className={`h-full rounded-full ${done ? 'bg-success' : 'bg-accent-foreground'}`} style={{ width: `${enrolment.progressPercent}%` }} />
        </div>
      </Link>
    </li>
  );
}

export default function StudentCoursesPage() {
  const { enrolments, current, loading, failed } = useStudentUnits();
  const currentCourse = current ? courseOf(current) : null;
  return (
    <div className="space-y-6">
      <PageHeader title="Courses" description="Units your teachers released to your class. Short items you can do on your phone." />
      {loading ? <CardGridSkeleton count={2} /> : failed ? (
        <EmptyState icon={AlertTriangle} title="Couldn't load your units" description="Check your connection and refresh to try again." />
      ) : enrolments.length === 0 ? (
        <EmptyState icon={GraduationCap} title="No units yet" description="When your teacher releases a unit to your class, it appears here." />
      ) : (
        <>
          {current ? (
            <ResumeUnitCard enrolmentId={current.id} courseId={courseIdOf(current)} unitTitle={currentCourse?.title ?? 'Unit'} progressPercent={current.progressPercent} />
          ) : null}
          <section className="space-y-2" aria-label="My units">
            <h2 className="text-sm font-medium text-muted-foreground">My units</h2>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {enrolments.map((e) => <UnitRow key={e.id} enrolment={e} />)}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
