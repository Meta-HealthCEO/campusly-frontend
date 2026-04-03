'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { ChannelConfigCard } from '@/components/communication/ChannelConfigCard';
import { ChannelConfigDialog } from '@/components/communication/ChannelConfigDialog';
import { TestChannelDialog } from '@/components/communication/TestChannelDialog';
import { useCommConfig } from '@/hooks/useCommunicationAdmin';
import { Settings } from 'lucide-react';
import type { CommunicationChannel } from '@/types';

const CHANNELS: CommunicationChannel[] = ['email', 'sms', 'whatsapp', 'push'];

export default function CommunicationConfigPage() {
  const { config, loading, fetchConfig, updateConfig, testChannel } = useCommConfig();
  const [configChannel, setConfigChannel] = useState<CommunicationChannel | null>(null);
  const [testingChannel, setTestingChannel] = useState<CommunicationChannel | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const handleSave = async (channel: CommunicationChannel, data: Record<string, unknown>) => {
    setSaving(true);
    try {
      // Strip empty strings and undefined values before sending
      const cleaned = Object.fromEntries(
        Object.entries(data).filter(([, v]) => v !== undefined && v !== ''),
      );
      await updateConfig({ channels: { [channel]: cleaned } });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  if (!config) {
    return (
      <div className="space-y-6">
        <PageHeader title="Communication Settings" description="Configure messaging channels" />
        <EmptyState icon={Settings} title="No configuration found" description="Communication config will be created on first save." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Communication Settings" description="Configure messaging channels, API keys, and daily limits" />

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        {CHANNELS.map((ch) => (
          <ChannelConfigCard
            key={ch}
            channel={ch}
            config={config.channels[ch]}
            onConfigure={() => setConfigChannel(ch)}
            onTest={() => setTestingChannel(ch)}
          />
        ))}
      </div>

      <ChannelConfigDialog
        open={configChannel !== null}
        onOpenChange={(open) => { if (!open) setConfigChannel(null); }}
        channel={configChannel}
        config={configChannel ? config.channels[configChannel] : null}
        onSave={handleSave}
        saving={saving}
      />

      <TestChannelDialog
        open={testingChannel !== null}
        onOpenChange={(open) => { if (!open) setTestingChannel(null); }}
        channel={testingChannel}
        onTest={testChannel}
      />
    </div>
  );
}
