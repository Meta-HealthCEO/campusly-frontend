'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import type { DigestPreference, UpdateDigestPreferencesInput, DigestChannel } from '@/types';

interface DigestPreferencesFormProps {
  preferences: DigestPreference | null;
  loading: boolean;
  onUpdate: (data: UpdateDigestPreferencesInput) => Promise<unknown>;
}

export function DigestPreferencesForm({ preferences, loading, onUpdate }: DigestPreferencesFormProps) {
  const [dailyDigest, setDailyDigest] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const [channel, setChannel] = useState<DigestChannel>('email');
  const [morningTime, setMorningTime] = useState('07:00');
  const [eveningTime, setEveningTime] = useState('16:00');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (preferences) {
      setDailyDigest(preferences.dailyDigest);
      setWeeklyDigest(preferences.weeklyDigest);
      setChannel(preferences.digestChannel);
      setMorningTime(preferences.morningBriefTime);
      setEveningTime(preferences.eveningBriefTime);
    }
  }, [preferences]);

  if (loading) return <LoadingSpinner />;

  const handleSave = async () => {
    try {
      setSaving(true);
      await onUpdate({
        dailyDigest,
        weeklyDigest,
        digestChannel: channel,
        morningBriefTime: morningTime,
        eveningBriefTime: eveningTime,
      });
      toast.success('Digest preferences updated');
    } catch {
      toast.error('Failed to update preferences');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Digest Preferences</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Toggle daily digest */}
        <div className="flex items-center justify-between">
          <div>
            <Label className="font-medium">Daily Digest</Label>
            <p className="text-xs text-muted-foreground">Receive morning and evening summaries</p>
          </div>
          <Switch checked={dailyDigest} onCheckedChange={setDailyDigest} />
        </div>

        {/* Toggle weekly digest */}
        <div className="flex items-center justify-between">
          <div>
            <Label className="font-medium">Weekly Digest</Label>
            <p className="text-xs text-muted-foreground">Receive a weekly summary every Friday</p>
          </div>
          <Switch checked={weeklyDigest} onCheckedChange={setWeeklyDigest} />
        </div>

        {/* Channel select */}
        <div className="space-y-1.5">
          <Label>Delivery Channel</Label>
          <Select value={channel} onValueChange={(v: unknown) => setChannel(v as DigestChannel)}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="both">Both</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Time pickers */}
        {dailyDigest && (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="morning-time">Morning Brief Time</Label>
              <Input
                id="morning-time"
                type="time"
                value={morningTime}
                onChange={(e) => setMorningTime(e.target.value)}
                className="w-full sm:w-36"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="evening-time">Evening Brief Time</Label>
              <Input
                id="evening-time"
                type="time"
                value={eveningTime}
                onChange={(e) => setEveningTime(e.target.value)}
                className="w-full sm:w-36"
              />
            </div>
          </div>
        )}

        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </CardContent>
    </Card>
  );
}
