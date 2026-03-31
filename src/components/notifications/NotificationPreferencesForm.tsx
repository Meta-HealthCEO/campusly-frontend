'use client';

import { useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Mail, MessageSquare, Bell, Smartphone } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';

const PREFERENCE_CHANNELS = [
  {
    field: 'email' as const,
    label: 'Email notifications',
    description: 'Receive notifications by email',
    icon: Mail,
  },
  {
    field: 'sms' as const,
    label: 'SMS notifications',
    description: 'Receive notifications by SMS',
    icon: MessageSquare,
  },
  {
    field: 'push' as const,
    label: 'Push notifications',
    description: 'Receive browser/device push notifications',
    icon: Smartphone,
  },
  {
    field: 'inApp' as const,
    label: 'In-app notifications',
    description: 'Receive in-app bell notifications',
    icon: Bell,
  },
] as const;

export function NotificationPreferencesForm() {
  const {
    preferences,
    preferencesLoading,
    fetchPreferences,
    updatePreference,
  } = useNotifications();

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  if (preferencesLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notification Channels</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
              <Skeleton className="h-5 w-9 rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Notification Channels</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {PREFERENCE_CHANNELS.map((channel) => {
          const Icon = channel.icon;
          const checked = preferences
            ? preferences[channel.field]
            : true;

          return (
            <div
              key={channel.field}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-muted p-2">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">{channel.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {channel.description}
                  </p>
                </div>
              </div>
              <Switch
                checked={checked}
                onCheckedChange={(val: boolean) =>
                  updatePreference(channel.field, val)
                }
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
