'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, UserRound } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { buttonVariants } from '@/components/ui/button';
import { AcademicSummaryCard } from '@/components/student-360/AcademicSummaryCard';
import { AttendanceSummaryCard } from '@/components/student-360/AttendanceSummaryCard';
import { RecentActivityCard } from '@/components/student-360/RecentActivityCard';
import { LearnerQuickStats } from '@/components/students/LearnerQuickStats';
import { LearnerActions } from '@/components/students/LearnerActions';
import { MessageParentDialog } from '@/components/students/MessageParentDialog';
import { ReferralCreateDialog } from '@/components/pastoral/ReferralCreateDialog';
import { useLearnerActions } from '@/hooks/useLearnerActions';
import { useLearnerBehaviour } from '@/hooks/useBehaviour';
import { useModule } from '@/hooks/useModule';
import { LogBehaviourButton } from '@/components/behaviour/LogBehaviourButton';
import { BehaviourTimelineCard } from '@/components/behaviour/BehaviourTimelineCard';
import { useLearnerProfile } from '@/hooks/useLearnerProfile';
import { learnerClassLabel } from '@/lib/learner-profile';
import { ROUTES } from '@/lib/routes';
import { cn } from '@/lib/utils';

export default function LearnerProfilePage() {
  const params = useParams();
  const studentId = typeof params.id === 'string' ? params.id : '';
  const { profile, loading, error, loadProfile } = useLearnerProfile();
  const router = useRouter();
  const actions = useLearnerActions();
  const { isModuleEnabled } = useModule();
  const behaviourOn = isModuleEnabled('attendance');
  const behaviour = useLearnerBehaviour(behaviourOn ? studentId : '');
  const [messaging, setMessaging] = useState(false);
  const [referring, setReferring] = useState(false);

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
  const parents = profile.parents ?? [];
  const sendToParent = async (m: { recipientId: string; subject: string; message: string }): Promise<void> => {
    const ok = await actions.messageParent({ ...m, studentId: student.id, subject: m.subject || undefined });
    if (!ok) return;
    setMessaging(false);
    const to = parents.find((p) => p.userId === m.recipientId)?.name ?? 'the parent';
    toast.success(`Message sent to ${to}`, { action: { label: 'Open Messages', onClick: () => router.push(ROUTES.TEACHER_MESSAGES) } });
  };
  return (
    <div className="space-y-6">
      <PageHeader
        title={`${student.firstName} ${student.lastName}`}
        description={`${learnerClassLabel(student.gradeName, student.className)} · ${student.admissionNumber}`}
      >
        <LearnerActions
          onMessageParent={() => { actions.clearSendError(); setMessaging(true); }}
          onRefer={() => setReferring(true)}
          logBehaviour={<LogBehaviourButton learner={{ id: student.id, name: `${student.firstName} ${student.lastName}`.trim() }} source="profile" variant="full" onLogged={() => void behaviour.refresh()} />}
        />
        {back}
      </PageHeader>
      <LearnerQuickStats profile={profile} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AcademicSummaryCard academic={profile.academic} />
        <AttendanceSummaryCard attendance={profile.attendance} />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {behaviourOn ? (
          <BehaviourTimelineCard items={behaviour.items} summary={behaviour.summary} loading={behaviour.loading} error={behaviour.error} />
        ) : null}
        <RecentActivityCard achievements={profile.achievements} sports={profile.sports} />
      </div>

      {messaging ? (
        <MessageParentDialog
          open
          onOpenChange={setMessaging}
          firstName={student.firstName}
          parents={parents}
          sending={actions.sending}
          error={actions.sendError}
          onSend={(m) => void sendToParent(m)}
        />
      ) : null}
      <ReferralCreateDialog open={referring} onOpenChange={setReferring} defaultStudentId={student.id} onSubmit={actions.refer} />
    </div>
  );
}
