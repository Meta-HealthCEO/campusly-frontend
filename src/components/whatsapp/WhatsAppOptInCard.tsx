'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { MessageSquare, Shield } from 'lucide-react';
import type { WhatsAppOptInStatus } from '@/types/whatsapp';

interface WhatsAppOptInCardProps {
  status: WhatsAppOptInStatus | null;
  loading: boolean;
  onOptIn: (phone: string, language: string) => Promise<unknown>;
  onOptOut: () => Promise<void>;
}

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'af', label: 'Afrikaans' },
  { value: 'zu', label: 'Zulu' },
  { value: 'xh', label: 'Xhosa' },
];

export function WhatsAppOptInCard({ status, loading, onOptIn, onOptOut }: WhatsAppOptInCardProps) {
  const [phone, setPhone] = useState(status?.phoneNumber ?? '');
  const [language, setLanguage] = useState(status?.preferredLanguage ?? 'en');
  const [submitting, setSubmitting] = useState(false);

  const handleOptIn = async () => {
    try {
      setSubmitting(true);
      await onOptIn(phone, language);
    } catch (err: unknown) {
      console.error('Opt-in failed', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOptOut = async () => {
    try {
      setSubmitting(true);
      await onOptOut();
    } catch (err: unknown) {
      console.error('Opt-out failed', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <CardTitle>WhatsApp Notifications</CardTitle>
          {status?.optedIn && <Badge variant="default">Active</Badge>}
        </div>
        <CardDescription>
          Receive school notifications via WhatsApp
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status?.optedIn ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              You are receiving WhatsApp notifications at <strong>{status.phoneNumber}</strong>.
            </p>
            <Button variant="outline" onClick={handleOptOut} disabled={submitting || loading}>
              {submitting ? 'Processing...' : 'Opt Out'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="wa-phone">Phone Number <span className="text-destructive">*</span></Label>
              <Input
                id="wa-phone"
                className="w-full sm:w-60"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+27 82 123 4567"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wa-lang">Preferred Language</Label>
              <Select value={language} onValueChange={(v: unknown) => { if (v) setLanguage(v as string); }}>
                <SelectTrigger className="w-full sm:w-48" id="wa-lang">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleOptIn} disabled={submitting || loading || !phone}>
              {submitting ? 'Processing...' : 'Opt In'}
            </Button>
          </div>
        )}

        <div className="flex items-start gap-2 rounded-md bg-muted p-3 text-xs text-muted-foreground">
          <Shield className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            In accordance with POPIA, your phone number will only be used for school-related notifications.
            You can opt out at any time.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
