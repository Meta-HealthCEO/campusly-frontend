'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { WellbeingProfileView, SessionCreateDialog } from '@/components/pastoral';
import { ShieldAlert, Plus } from 'lucide-react';
import { usePastoralCare } from '@/hooks/usePastoralCare';
import { usePastoralSessions } from '@/hooks/usePastoralSessions';
import { useAuthStore } from '@/stores/useAuthStore';
import type { CreateSessionPayload } from '@/types';

export default function StudentWellbeingProfilePage() {
  const { studentId } = useParams<{ studentId: string }>();
  const { hasPermission } = useAuthStore();
  const isCounselor = hasPermission('isCounselor');

  const { wellbeingProfile, wellbeingLoading, fetchWellbeing } = usePastoralCare();
  const { createSession } = usePastoralSessions();

  const [sessionCreateOpen, setSessionCreateOpen] = useState(false);

  useEffect(() => {
    if (studentId) {
      void fetchWellbeing(studentId);
    }
  }, [fetchWellbeing, studentId]);

  const handleCreateSession = async (data: CreateSessionPayload) => {
    await createSession(data);
    setSessionCreateOpen(false);
    void fetchWellbeing(studentId);
  };

  if (!isCounselor) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Access Restricted"
        description="Only school counselors can view student wellbeing profiles."
      />
    );
  }

  if (wellbeingLoading) return <LoadingSpinner />;

  if (!wellbeingProfile) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Profile Not Found"
        description="No wellbeing profile found for this student."
      />
    );
  }

  const studentLabel = `${wellbeingProfile.student.firstName} ${wellbeingProfile.student.lastName}`.trim();

  return (
    <div className="space-y-6">
      <PageHeader
        title={studentLabel}
        description="Counselor view - referral history, sessions, and risk flags"
      >
        <Button onClick={() => setSessionCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Session
        </Button>
      </PageHeader>

      <WellbeingProfileView profile={wellbeingProfile} />

      <SessionCreateDialog
        open={sessionCreateOpen}
        onOpenChange={setSessionCreateOpen}
        onSubmit={handleCreateSession}
        defaultStudentId={studentId}
        studentOptions={[{
          id: studentId,
          label: studentLabel,
          detail: wellbeingProfile.student.grade ? `Grade ${wellbeingProfile.student.grade}` : undefined,
        }]}
        referralOptions={wellbeingProfile.referrals.recent
          .filter((referral) => !['resolved', 'closed'].includes(referral.status))
          .map((referral) => ({
            id: referral.id,
            studentId,
            label: `${referral.reason.replace(/_/g, ' ')} - ${referral.status.replace(/_/g, ' ')}`,
          }))}
      />
    </div>
  );
}
