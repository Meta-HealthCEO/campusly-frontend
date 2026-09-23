'use client';

import { DashboardSkeleton } from '@/components/shared/skeletons';
import { useAuthStore } from '@/stores/useAuthStore';
import { useSchoolStore } from '@/stores/useSchoolStore';
import { useTeacherDashboard } from '@/hooks/useTeacherDashboard';
import { useTeacherToday } from '@/hooks/useTeacherToday';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';
import { useTeachingScope } from '@/hooks/useTeachingScope';
import { AIQuickMakeHero } from '@/components/teacher-home/AIQuickMakeHero';
import { GettingStartedCard } from '@/components/teacher-home/GettingStartedCard';
import { YourDayCard } from '@/components/teacher-home/YourDayCard';
import { NeedsYouCard } from '@/components/teacher-home/NeedsYouCard';
import { DraftsZone } from '@/components/teacher-home/DraftsZone';

function salutationForHour(hour: number): string {
  if (hour < 12) return 'Good morning, ';
  if (hour < 17) return 'Good afternoon, ';
  return 'Good evening, ';
}

const FADE_IN = 'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-300';

export default function TeacherHomePage() {
  const user = useAuthStore((s) => s.user);
  const school = useSchoolStore((s) => s.school);
  const dashboard = useTeacherDashboard();
  const today = useTeacherToday();
  const { status: onboarding, loading: onboardingLoading } = useOnboardingStatus();
  const { isEmpty: scopeEmpty, loading: scopeLoading } = useTeachingScope();

  const firstName = user?.firstName ?? 'Teacher';
  const now = new Date();
  const salutation = salutationForHour(now.getHours());
  const dateLabel = now.toLocaleDateString('en-ZA', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const scopeSet = !scopeLoading && !scopeEmpty;
  const checklistReady = !onboardingLoading && !scopeLoading;
  const isStandaloneTeacher = user?.isStandaloneTeacher === true;
  const showChecklist =
    isStandaloneTeacher &&
    checklistReady &&
    !(scopeSet && onboarding.hasClass && onboarding.hasFirstContent && onboarding.hasStudent);

  // Independent teachers rarely keep a timetable here — don't show them an
  // empty day every morning.
  const showDay = !isStandaloneTeacher || today.periods.length > 0;
  const loading = today.loading || dashboard.loading;

  const needsYou = (
    <NeedsYouCard
      marking={today.marking}
      gradingFallback={dashboard.gradingTotal}
      homeworkDueToday={dashboard.homeworkDueToday}
      unreadMessages={today.unreadMessages}
    />
  );

  return (
    <div className="space-y-8 bg-background bg-linear-to-b from-muted/40 to-background bg-no-repeat bg-size-[100%_200px] dark:from-background">
      <header className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300">
        <h1 className="text-3xl font-semibold tracking-tight">
          {salutation}{firstName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {dateLabel}
          {!loading && today.summary.length > 0 ? (
            <span className="text-foreground/80"> · {today.summary.join(' · ')}</span>
          ) : null}
        </p>
      </header>

      {showChecklist ? (
        <div className={FADE_IN}>
          <GettingStartedCard
            scopeSet={scopeSet}
            hasClass={onboarding.hasClass}
            hasFirstContent={onboarding.hasFirstContent}
            hasStudent={onboarding.hasStudent}
            classCode={school?.joinCode ?? null}
          />
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
                lessonsByClass={today.lessonsByClass}
                isWeekend={today.isWeekend}
                showTimetableLink={!isStandaloneTeacher}
              />
            </div>
          ) : null}
          {needsYou}
          {!showDay || dashboard.draftsTotal > 0 ? (
            <DraftsZone items={dashboard.drafts} total={dashboard.draftsTotal} />
          ) : null}
        </div>
      )}

      <section aria-labelledby="create-with-ai" className={FADE_IN}>
        <h2 id="create-with-ai" className="mb-3 text-sm font-medium text-muted-foreground">
          Create with AI
        </h2>
        <AIQuickMakeHero />
      </section>
    </div>
  );
}
