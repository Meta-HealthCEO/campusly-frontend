'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { DashboardSkeleton } from '@/components/shared/skeletons';
import { buttonVariants } from '@/components/ui/button';
import { useAuthStore } from '@/stores/useAuthStore';
import { useTeacherDashboard } from '@/hooks/useTeacherDashboard';
import { useTeacherToday } from '@/hooks/useTeacherToday';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';
import { onboardingChecklist, onboardingStep } from '@/lib/onboarding';
import { AIQuickMakeHero } from '@/components/teacher-home/AIQuickMakeHero';
import { GettingStartedCard } from '@/components/teacher-home/GettingStartedCard';
import { YourDayCard, registerHref } from '@/components/teacher-home/YourDayCard';
import { NeedsYouCard } from '@/components/teacher-home/NeedsYouCard';
import { DraftsZone } from '@/components/teacher-home/DraftsZone';
import { todayEyebrow, todayLede } from '@/lib/eyebrow';
import type { AnnotatedPeriod } from '@/lib/teacher-today';
import { ROUTES } from '@/lib/routes';
import { cn } from '@/lib/utils';

function salutationForHour(hour: number): string {
  if (hour < 12) return 'Good morning, ';
  if (hour < 17) return 'Good afternoon, ';
  return 'Good evening, ';
}

const FADE_IN = 'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-300';

export default function TeacherHomePage() {
  const user = useAuthStore((s) => s.user);
  const dashboard = useTeacherDashboard();
  const today = useTeacherToday();
  const { status: onboarding, loading: onboardingLoading } = useOnboardingStatus();

  const firstName = user?.firstName ?? 'Teacher';
  const now = new Date();
  const salutation = salutationForHour(now.getHours());

  const isStandaloneTeacher = user?.isStandaloneTeacher === true;
  // The same steps as /teacher/onboarding, until they are done (or the last one is skipped).
  const showChecklist = isStandaloneTeacher && !onboardingLoading && onboardingStep(onboarding) !== 'done';

  // Independent teachers rarely keep a timetable here — don't show them an
  // empty day every morning.
  const showDay = !isStandaloneTeacher || today.periods.length > 0;
  const loading = today.loading || dashboard.loading;
  const lede = loading ? null : todayLede(today.periods);
  const unrecorded = today.periods.find((period: AnnotatedPeriod) => !period.recorded);

  const needsYou = (
    <NeedsYouCard
      marking={today.marking}
      gradingFallback={dashboard.gradingTotal}
      homeworkDueToday={dashboard.homeworkDueToday}
      unreadMessages={today.unreadMessages}
    />
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300">
        <div className="min-w-0">
          <p className="font-mono text-[11.5px] font-medium uppercase tracking-[0.08em] text-muted-foreground">{todayEyebrow(now)}</p>
          <h1 className="mt-1.5 font-heading text-[28px] font-semibold leading-tight tracking-[-0.025em] text-balance sm:text-[32px]">
            {salutation}{firstName}
          </h1>
          {lede ? <p className="mt-1.5 text-[15px] text-muted-foreground">{lede}</p> : null}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:shrink-0">
          {unrecorded ? (
            <Link href={registerHref(unrecorded)} className={cn(buttonVariants({ variant: 'outline' }), 'h-11 sm:h-9')}>
              Take register
            </Link>
          ) : null}
          <Link href={`${ROUTES.TEACHER_LESSONS}/new`} className={cn(buttonVariants(), 'h-11 gap-1.5 sm:h-9')}>
            <Sparkles className="size-4" aria-hidden />
            Make with AI
          </Link>
        </div>
      </header>

      {showChecklist ? (
        <div className={FADE_IN}>
          <GettingStartedCard items={onboardingChecklist(onboarding)} />
        </div>
      ) : null}

      {loading ? (
        <DashboardSkeleton />
      ) : (
        <div className={`grid grid-cols-1 gap-6 lg:grid-cols-3 ${FADE_IN}`}>
          {showDay ? (
            <div className="lg:col-span-2">
              <YourDayCard
                periods={today.periods}
                lessonsByPeriod={today.lessonsByPeriod}
                isWeekend={today.isWeekend}
                showTimetableLink={!isStandaloneTeacher}
                now={now}
              />
            </div>
          ) : null}
          {needsYou}
          {!showDay || dashboard.draftsTotal > 0 ? (
            <DraftsZone items={dashboard.drafts} total={dashboard.draftsTotal} />
          ) : null}
        </div>
      )}

      <section aria-labelledby="make-with-ai" className={FADE_IN}>
        <h2 id="make-with-ai" className="mb-3 font-mono text-[11.5px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
          Make with AI
        </h2>
        <AIQuickMakeHero />
      </section>
    </div>
  );
}
