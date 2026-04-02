'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Save, Loader2, CheckCircle2 } from 'lucide-react';
import type { PaymentGatewayConfig, PaymentProvider } from '@/types';

interface GatewayConfigFormProps {
  config: PaymentGatewayConfig | null;
  onSave: (data: Partial<PaymentGatewayConfig>) => Promise<void>;
  saving: boolean;
}

export function GatewayConfigForm({ config, onSave, saving }: GatewayConfigFormProps) {
  const [provider, setProvider] = useState<PaymentProvider>('payfast');
  const [merchantId, setMerchantId] = useState('');
  const [merchantKey, setMerchantKey] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [sandboxMode, setSandboxMode] = useState(true);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (config) {
      setProvider(config.provider);
      setMerchantId(config.credentials.merchantId);
      setMerchantKey(config.credentials.merchantKey);
      setPassphrase(config.credentials.passphrase);
      setSandboxMode(config.credentials.sandboxMode);
      setEnabled(config.enabled);
    }
  }, [config]);

  const hasCredentials = merchantId.trim() && merchantKey.trim();

  const handleSubmit = async () => {
    await onSave({
      provider,
      credentials: { merchantId, merchantKey, passphrase, sandboxMode },
      enabled,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Gateway Configuration</CardTitle>
        <CardDescription>
          Configure your payment provider credentials for online payments.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {sandboxMode && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Sandbox mode is enabled. Payments will be processed in test mode.
              Disable sandbox mode before going live.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label>Payment Provider</Label>
          <Select value={provider} onValueChange={(val: unknown) => setProvider(val as PaymentProvider)}>
            <SelectTrigger className="w-full sm:w-60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="payfast">PayFast</SelectItem>
              <SelectItem value="yoco">Yoco</SelectItem>
              <SelectItem value="paystack">Paystack</SelectItem>
              <SelectItem value="stripe">Stripe</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="merchant-id">Merchant ID <span className="text-destructive">*</span></Label>
            <Input
              id="merchant-id"
              value={merchantId}
              onChange={(e) => setMerchantId(e.target.value)}
              placeholder="e.g. 10000100"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="merchant-key">Merchant Key <span className="text-destructive">*</span></Label>
            <Input
              id="merchant-key"
              value={merchantKey}
              onChange={(e) => setMerchantKey(e.target.value)}
              placeholder="e.g. 46f0cd694581a"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="passphrase">Passphrase</Label>
          <Input
            id="passphrase"
            type="password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            placeholder="Optional security passphrase"
            className="w-full sm:w-80"
          />
          <p className="text-xs text-muted-foreground">
            Set this in your PayFast dashboard under Settings &gt; Security.
          </p>
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <p className="text-sm font-medium">Sandbox Mode</p>
            <p className="text-xs text-muted-foreground">
              Use test credentials for development
            </p>
          </div>
          <Switch checked={sandboxMode} onCheckedChange={setSandboxMode} />
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <p className="text-sm font-medium">Enable Online Payments</p>
            <p className="text-xs text-muted-foreground">
              Allow parents to pay fees and top up wallets online
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        {hasCredentials && (
          <div className="flex items-center gap-2 text-sm text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
            Credentials configured
          </div>
        )}

        <Button onClick={handleSubmit} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? 'Saving...' : 'Save Configuration'}
        </Button>
      </CardContent>
    </Card>
  );
}
