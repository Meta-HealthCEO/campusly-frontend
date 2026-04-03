'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { WhatsAppConfig, WhatsAppProvider } from '@/types/whatsapp';

interface WhatsAppConfigFormProps {
  config: WhatsAppConfig | null;
  loading: boolean;
  onSave: (data: Partial<WhatsAppConfig>) => Promise<unknown>;
}

const PROVIDERS: { value: WhatsAppProvider; label: string }[] = [
  { value: 'twilio', label: 'Twilio' },
  { value: '360dialog', label: '360dialog' },
  { value: 'wati', label: 'WATI' },
];

export function WhatsAppConfigForm({ config, loading, onSave }: WhatsAppConfigFormProps) {
  const [provider, setProvider] = useState<WhatsAppProvider>('twilio');
  const [accountSid, setAccountSid] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (config) {
      setProvider(config.provider);
      setAccountSid(config.credentials.accountSid);
      setAuthToken(config.credentials.authToken);
      setPhoneNumber(config.credentials.phoneNumber);
      setEnabled(config.enabled);
    }
  }, [config]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await onSave({
        provider,
        credentials: { accountSid, authToken, phoneNumber },
        enabled,
      });
    } catch (err: unknown) {
      console.error('Failed to save config', err);
    } finally {
      setSaving(false);
    }
  };

  const isConfigured = Boolean(config?.credentials.accountSid);

  return (
    <Card>
      <CardHeader>
        <CardTitle>WhatsApp Configuration</CardTitle>
        <CardDescription>Configure your WhatsApp Business API provider</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!isConfigured && (
          <div className="flex items-center gap-2 rounded-md bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>WhatsApp is not configured. Complete the form below to enable messaging.</span>
          </div>
        )}

        {isConfigured && config?.enabled && (
          <div className="flex items-center gap-2 rounded-md bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>WhatsApp messaging is active via {config.provider}.</span>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="provider">Provider <span className="text-destructive">*</span></Label>
          <Select value={provider} onValueChange={(v: unknown) => { if (v) setProvider(v as WhatsAppProvider); }}>
            <SelectTrigger className="w-full sm:w-60" id="provider">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROVIDERS.map((p) => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="accountSid">Account SID <span className="text-destructive">*</span></Label>
            <Input id="accountSid" value={accountSid} onChange={(e) => setAccountSid(e.target.value)} placeholder="AC..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="authToken">Auth Token <span className="text-destructive">*</span></Label>
            <Input id="authToken" type="password" value={authToken} onChange={(e) => setAuthToken(e.target.value)} placeholder="Token" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phoneNumber">WhatsApp Phone Number <span className="text-destructive">*</span></Label>
          <Input id="phoneNumber" className="w-full sm:w-60" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="+27..." />
        </div>

        <div className="flex items-center gap-3">
          <Switch checked={enabled} onCheckedChange={setEnabled} id="enabled" />
          <Label htmlFor="enabled">Enable WhatsApp messaging</Label>
        </div>

        <Button onClick={handleSave} disabled={saving || loading || !accountSid || !authToken || !phoneNumber}>
          {saving ? 'Saving...' : 'Save Configuration'}
        </Button>
      </CardContent>
    </Card>
  );
}
