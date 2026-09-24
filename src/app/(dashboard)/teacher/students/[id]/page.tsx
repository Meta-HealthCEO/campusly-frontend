'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, UserRound } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { buttonVariants } from '@/components/ui/button';
import { AcademicSummaryCard } from '@/components/student-360/AcademicSummaryCard';
import { AttendanceSummaryCard } from '@/components/student-360/AttendanceSummaryCard';
import { RecentActivityCard } from '@/components/student-360/RecentActivityCard';
import { LearnerQuickStats } from '@/components/students/LearnerQuickStats';
import { useLearnerProfile } from '@/hooks/useLearnerProfile';
import { learnerClassLabel } from '@/lib/learner-profile';
import { ROUTES } from '@/lib/routes';
import { cn } from '@/lib/utils';

export default function LearnerProfilePage() {
  const params = useParams();
  const studentId = typeof params.id === 'string' ? params.id : '';
  const { profile, loading, error, loadProfile } = useLearnerProfile();

  useEffect(() => {
    if (studentId) void loadProfile(studentId);
  }, [studentId, loadProfile]);

  const back = (
    <Link href={ROUTES.TEACHER_CLASSES} className={cn(buttonVariants({ variant: 'outline' }), 'w-full sm:w-auto')}>
      <ArrowLeft className="mr-2 h-4 w-4" />
      My classes
    </Link>
  );

  if (loading) return <LoadingSpinner />;
  if (error || !profile) {
    return (
      <EmptyState
        icon={UserRound}
        title="We couldn't open this learner"
        description={error ?? "This learner isn't in one of your classes."}
        action={back}
      />
    );
  }

  const { student } = profile;
  return (
    <div className="space-y-6">
      <PageHeader
        title={`${student.firstName} ${student.lastName}`}
        description={`${learnerClassLabel(student.gradeName, student.className)} · ${student.admissionNumber}`}
      >
        {back}
      </PageHeader>
      <LearnerQuickStats profile={profile} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AcademicSummaryCard academic={profile.academic} />
        <AttendanceSummaryCard attendance={profile.attendance} />
      </div>
      <RecentActivityCard achievements={profile.achievements} behaviour={profile.behaviour} sports={profile.sports} />
    </div>
  );
}
