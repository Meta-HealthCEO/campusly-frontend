'use client';

import { useEffect } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { WhatsAppOptInCard } from '@/components/whatsapp/WhatsAppOptInCard';
import { useWhatsAppOptIn } from '@/hooks/useWhatsAppOptIn';

export default function ParentSettingsPage() {
  const { optInStatus, loading, available, loadOptInStatus, optIn, optOut } = useWhatsAppOptIn();

  useEffect(() => {
    loadOptInStatus();
  }, [loadOptInStatus]);

  if (loading && !optInStatus) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your notification preferences"
      />

      {available ? (
        <WhatsAppOptInCard
          status={optInStatus}
          loading={loading}
          onOptIn={optIn}
          onOptOut={optOut}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          WhatsApp notifications aren&apos;t available right now. Try again later.
        </p>
      )}
    </div>
  );
}
