'use client';

import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { GatewayConfigForm } from '@/components/payment/GatewayConfigForm';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { usePaymentGatewayAdmin } from '@/hooks/usePaymentGatewayAdmin';
import type { PaymentGatewayConfig } from '@/types';

export default function PaymentSettingsPage() {
  const { config, loading, saving, saveConfig, loadConfig } = usePaymentGatewayAdmin();

  const handleSave = async (data: Partial<PaymentGatewayConfig>) => {
    try {
      await saveConfig(data);
      toast.success('Payment gateway configuration saved!');
      await loadConfig();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save configuration');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment Gateway Settings"
        description="Configure online payment processing for your school."
      />

      {!config && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            No payment gateway has been configured yet. Set up your credentials below
            to enable online payments for parents.
          </AlertDescription>
        </Alert>
      )}

      <GatewayConfigForm config={config} onSave={handleSave} saving={saving} />
    </div>
  );
}
