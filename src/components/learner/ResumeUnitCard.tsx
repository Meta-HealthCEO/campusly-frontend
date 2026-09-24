'use client';

import Link from 'next/link';
import { ArrowRight, GraduationCap } from 'lucide-react';
import { useLessonPlayer } from '@/hooks/useLessonPlayer';
import { resumeTarget } from '@/lib/learner-unit';
import { ROUTES } from '@/lib/routes';

interface Props {
  enrolmentId: string;
  courseId: string;
  unitTitle: string;
  progressPercent: number;
}

/** "Continue: What makes a pattern · Item 4 of 6 · 7 min": straight back to where the learner stopped. */
export function ResumeUnitCard({ enrolmentId, courseId, unitTitle, progressPercent }: Props) {
  const { enrolmentDetail } = useLessonPlayer(enrolmentId);
  const target = enrolmentDetail ? resumeTarget(enrolmentDetail.course) : null;
  const href = target ? ROUTES.STUDENT_LESSON_PLAYER(courseId, target.lessonId) : ROUTES.STUDENT_COURSE_HOME(courseId);

  return (
    <Link
      href={href}
      className="group block rounded-xl border border-accent-foreground/25 bg-accent p-4 transition-colors hover:border-accent-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-foreground"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background text-accent-foreground" aria-hidden>
          <GraduationCap className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-accent-foreground">{target?.started === false ? 'Start' : 'Continue'}</p>
          <p className="truncate text-base font-semibold">{target?.title ?? unitTitle}</p>
          {/* While the unit is still loading, target is null and the line above already reads unitTitle — don't repeat it here. */}
          {target ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {[unitTitle, target.position, target.minutes ? `${target.minutes} min` : ''].filter(Boolean).join(' · ')}
            </p>
          ) : null}
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-background" aria-hidden>
            <div className="h-full rounded-full bg-accent-foreground" style={{ width: `${progressPercent}%` }} />
          </div>
          <p className="mt-1 font-mono text-xs text-muted-foreground tabular-nums">{progressPercent}% done</p>
        </div>
        <ArrowRight className="mt-3 h-5 w-5 shrink-0 text-accent-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
      </div>
    </Link>
  );
}
