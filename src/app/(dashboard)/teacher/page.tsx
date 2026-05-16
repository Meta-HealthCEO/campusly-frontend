'use client';

import { PageHeader } from '@/components/shared/PageHeader';
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

export default function TeacherHomePage() {
  const user = useAuthStore((s) => s.user);
  const school = useSchoolStore((s) => s.school);
  const dashboard = useTeacherDashboard();
  const { status: onboarding, loading: onboardingLoading } = useOnboardingStatus();
  const { isEmpty: scopeEmpty, loading: scopeLoading } = useTeachingScope();

  const firstName = user?.firstName ?? 'Teacher';
  const dateLabel = new Date().toLocaleDateString('en-ZA', {
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
    <div className="space-y-6">
      <PageHeader title={`Hi ${firstName}`} description={dateLabel} />

      <AIQuickMakeHero />

      {showChecklist ? (
        <GettingStartedCard
          scopeSet={scopeSet}
          hasClass={onboarding.hasClass}
          hasFirstContent={onboarding.hasFirstContent}
          hasStudent={onboarding.hasStudent}
          classCode={school?.joinCode ?? null}
        />
      ) : null}

      {dashboard.loading ? (
        <DashboardSkeleton />
      ) : anyZoneHasContent ? (
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
          <TodayZone items={dashboard.today} total={dashboard.todayTotal} />
          <GradingZone items={dashboard.grading} total={dashboard.gradingTotal} />
          <DraftsZone items={dashboard.drafts} total={dashboard.draftsTotal} />
        </div>
      ) : null}
    </div>
  );
}
