'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { ReferralInbox, ReferralCreateDialog } from '@/components/pastoral';
import { Plus, ClipboardList } from 'lucide-react';
import { usePastoralReferrals } from '@/hooks/usePastoralReferrals';
import { useAuthStore } from '@/stores/useAuthStore';
import type { CreateReferralPayload, PastoralReferral } from '@/types';

export default function TeacherReferralPage() {
  const { user } = useAuthStore();
  const { referrals, referralsLoading, fetchReferrals, createReferral } = usePastoralReferrals();
  const [createOpen, setCreateOpen] = useState(false);

  const myReferrals = referrals.filter(
    (r: PastoralReferral) => r.referredBy.id === user?.id,
  );

  const load = useCallback(async () => {
    await fetchReferrals();
  }, [fetchReferrals]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (data: CreateReferralPayload) => {
    await createReferral(data);
    setCreateOpen(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Submit Student Referral"
        description="Refer a student to the school counselor for support."
      >
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Referral
        </Button>
      </PageHeader>

      {referralsLoading ? (
        <LoadingSpinner />
      ) : myReferrals.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No referrals submitted"
          description="You have not submitted any referrals yet. Use the button above to get started."
        />
      ) : (
        <ReferralInbox referrals={myReferrals} onView={() => undefined} />
      )}

      <ReferralCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
      />
    </div>
  );
}
