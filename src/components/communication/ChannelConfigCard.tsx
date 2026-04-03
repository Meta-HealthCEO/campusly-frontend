'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings, Send } from 'lucide-react';
import { ChannelIcon } from './ChannelIcon';
import { UsageLimitBar } from './UsageLimitBar';
import type { CommunicationChannel, ChannelConfig } from '@/types';

interface ChannelConfigCardProps {
  channel: CommunicationChannel;
  config: ChannelConfig;
  onConfigure: () => void;
  onTest: () => void;
}

const channelLabels: Record<CommunicationChannel, string> = {
  email: 'Email',
  sms: 'SMS',
  whatsapp: 'WhatsApp',
  push: 'Push Notifications',
};

export function ChannelConfigCard({
  channel, config, onConfigure, onTest,
}: ChannelConfigCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <ChannelIcon channel={channel} className="h-5 w-5" />
          <CardTitle className="text-base">{channelLabels[channel]}</CardTitle>
        </div>
        <Badge className={config.enabled
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
          : 'bg-muted text-muted-foreground'}
        >
          {config.enabled ? 'Enabled' : 'Disabled'}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm text-muted-foreground">
          Provider: <span className="font-medium text-foreground">{config.provider || 'Not configured'}</span>
        </div>

        {config.apiKeyConfigured ? (
          <Badge variant="outline" className="text-xs">API Key Configured</Badge>
        ) : (
          <Badge variant="outline" className="text-xs text-destructive border-destructive">
            API Key Missing
          </Badge>
        )}

        <UsageLimitBar used={config.usedToday} limit={config.dailyLimit} label="Daily usage" />

        <div className="flex gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={onConfigure} className="flex-1">
            <Settings className="mr-1.5 h-3.5 w-3.5" />
            Configure
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onTest}
            disabled={!config.enabled || !config.apiKeyConfigured}
            className="flex-1"
          >
            <Send className="mr-1.5 h-3.5 w-3.5" />
            Test
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
