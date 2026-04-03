'use client';

import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { ChannelIcon } from './ChannelIcon';
import type { CommunicationChannel, TestChannelResult } from '@/types';

interface TestChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel: CommunicationChannel | null;
  onTest: (channel: CommunicationChannel, recipient: Record<string, string>) => Promise<TestChannelResult>;
}

const channelLabels: Record<CommunicationChannel, string> = {
  email: 'Email', sms: 'SMS', whatsapp: 'WhatsApp', push: 'Push',
};

export function TestChannelDialog({ open, onOpenChange, channel, onTest }: TestChannelDialogProps) {
  const [recipient, setRecipient] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<TestChannelResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTest = async () => {
    if (!channel || !recipient.trim()) return;
    setSending(true);
    setResult(null);
    setError(null);
    try {
      const key = channel === 'email'
        ? 'recipientEmail'
        : channel === 'push'
          ? 'recipientDeviceToken'
          : 'recipientPhone';
      const res = await onTest(channel, { [key]: recipient });
      setResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Test failed');
    } finally {
      setSending(false);
    }
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      setRecipient('');
      setResult(null);
      setError(null);
    }
    onOpenChange(v);
  };

  if (!channel) return null;

  const recipientLabel = channel === 'email' ? 'Recipient Email' : channel === 'push' ? 'Device Token' : 'Phone Number';
  const placeholder = channel === 'email' ? 'admin@school.co.za' : channel === 'push' ? 'FCM token' : '+27...';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ChannelIcon channel={channel} className="h-5 w-5" />
            Test {channelLabels[channel]}
          </DialogTitle>
          <DialogDescription>Send a test message to verify configuration.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="test-recipient">{recipientLabel} <span className="text-destructive">*</span></Label>
            <Input
              id="test-recipient"
              value={recipient}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRecipient(e.target.value)}
              placeholder={placeholder}
            />
          </div>

          {result && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400">
              <CheckCircle className="h-4 w-4 shrink-0" />
              <span>Test sent successfully (ID: {result.messageId})</span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Close</Button>
          <Button onClick={handleTest} disabled={sending || !recipient.trim()}>
            {sending ? 'Sending...' : 'Send Test'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
