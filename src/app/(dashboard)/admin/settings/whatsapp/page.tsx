'use client';

import { useEffect } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { WhatsAppConfigForm } from '@/components/whatsapp/WhatsAppConfigForm';
import { DeliveryStatsPanel } from '@/components/whatsapp/DeliveryStatsPanel';
import { MessageLogTable } from '@/components/whatsapp/MessageLogTable';
import { useWhatsAppAdmin } from '@/hooks/useWhatsAppAdmin';
import { useAuthStore } from '@/stores/useAuthStore';

export default function WhatsAppSettingsPage() {
  const user = useAuthStore((s) => s.user);
  const schoolId = user?.schoolId ?? '';

  const {
    config, deliveryStats, messages, loading,
    loadConfig, saveConfig, loadStats, loadMessages,
  } = useWhatsAppAdmin(schoolId);

  useEffect(() => {
    if (!schoolId) return;
    loadConfig();
    loadStats();
    loadMessages();
  }, [schoolId, loadConfig, loadStats, loadMessages]);

  if (!schoolId) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="WhatsApp Integration"
        description="Configure WhatsApp Business API for parent notifications"
      />

      <WhatsAppConfigForm config={config} loading={loading} onSave={saveConfig} />

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Delivery Statistics</h2>
        <DeliveryStatsPanel stats={deliveryStats} />
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Message Log</h2>
        <MessageLogTable messages={messages} />
      </div>
    </div>
  );
}
