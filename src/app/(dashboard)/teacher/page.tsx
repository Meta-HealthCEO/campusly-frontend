'use client';

import { DashboardSkeleton } from '@/components/shared/skeletons';
import { useAuthStore } from '@/stores/useAuthStore';
import { useSchoolStore } from '@/stores/useSchoolStore';
import { useTeacherDashboard } from '@/hooks/useTeacherDashboard';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';
import { useTeachingScope } from '@/hooks/useTeachingScope';
import { AIQuickMakeHero } from '@/components/teacher-home/AIQuickMakeHero';
import { GettingStartedCard } from '@/components/teacher-home/GettingStartedCard';
import { TodayZone } from '@/components/teacher-home/TodayZone';
import { GradingZone } from '@/components/teacher-home/GradingZone';
import { DraftsZone } from '@/components/teacher-home/DraftsZone';

function salutationForHour(hour: number): string {
  if (hour < 12) return 'Good morning, ';
  if (hour < 17) return 'Good afternoon, ';
  return 'Good evening, ';
}

export default function TeacherHomePage() {
  const user = useAuthStore((s) => s.user);
  const school = useSchoolStore((s) => s.school);
  const dashboard = useTeacherDashboard();
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

  const anyZoneHasContent =
    dashboard.todayTotal > 0 || dashboard.gradingTotal > 0 || dashboard.draftsTotal > 0;

  return (
    <div className="space-y-8 bg-background bg-linear-to-b from-muted/40 to-background bg-no-repeat bg-size-[100%_200px] dark:from-background">
      <header className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300">
        <h1 className="text-3xl font-semibold tracking-tight">
          {salutation}{firstName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{dateLabel}</p>
      </header>

      <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-300 motion-safe:delay-[80ms]">
        <AIQuickMakeHero />
      </div>

      {showChecklist ? (
        <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-300 motion-safe:delay-[160ms]">
          <GettingStartedCard
            scopeSet={scopeSet}
            hasClass={onboarding.hasClass}
            hasFirstContent={onboarding.hasFirstContent}
            hasStudent={onboarding.hasStudent}
            classCode={school?.joinCode ?? null}
          />
        </div>
      ) : null}

      {dashboard.loading ? (
        <DashboardSkeleton />
      ) : anyZoneHasContent ? (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1.5 motion-safe:duration-300 motion-safe:delay-[240ms]">
            <TodayZone items={dashboard.today} total={dashboard.todayTotal} />
          </div>
          <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1.5 motion-safe:duration-300 motion-safe:delay-[290ms]">
            <GradingZone items={dashboard.grading} total={dashboard.gradingTotal} />
          </div>
          <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1.5 motion-safe:duration-300 motion-safe:delay-[340ms]">
            <DraftsZone items={dashboard.drafts} total={dashboard.draftsTotal} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
