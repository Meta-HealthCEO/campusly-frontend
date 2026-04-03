'use client';

import { useState, useEffect, useMemo } from 'react';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { InsuranceList, InsuranceFormDialog } from '@/components/assets';
import { useAssetInsurance } from '@/hooks/useAssetInsurance';
import { useAssetCategories } from '@/hooks/useAssetCategories';
import type { AssetInsurance, CreateInsurancePayload } from '@/types';

export default function InsurancePage() {
  const {
    insurance,
    loading,
    fetchInsurance,
    fetchExpiringInsurance,
    createInsurance,
    updateInsurance,
  } = useAssetInsurance();

  const { flatCategories } = useAssetCategories();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<AssetInsurance | null>(null);
  const [expiringPolicies, setExpiringPolicies] = useState<AssetInsurance[]>([]);

  useEffect(() => {
    void fetchInsurance();
  }, [fetchInsurance]);

  useEffect(() => {
    fetchExpiringInsurance(30)
      .then((policies) => setExpiringPolicies(policies))
      .catch((err: unknown) => console.error('Failed to fetch expiring insurance:', err));
  }, [fetchExpiringInsurance]);

  const handleAdd = () => {
    setEditingPolicy(null);
    setDialogOpen(true);
  };

  const handleEdit = (policy: AssetInsurance) => {
    setEditingPolicy(policy);
    setDialogOpen(true);
  };

  const handleSubmit = async (data: CreateInsurancePayload) => {
    await createInsurance(data);
  };

  const handleUpdate = async (id: string, data: Partial<AssetInsurance>) => {
    await updateInsurance(id, data as Partial<CreateInsurancePayload>);
  };

  const alertPolicies = useMemo(
    () => expiringPolicies.filter((p) => p.id),
    [expiringPolicies],
  );

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <PageHeader title="Asset Insurance" description="Manage insurance policies for your asset categories.">
        <Button onClick={handleAdd} size="default" className="w-full sm:w-auto">
          Add Policy
        </Button>
      </PageHeader>

      {alertPolicies.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-4">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-300">
              {alertPolicies.length} polic{alertPolicies.length === 1 ? 'y' : 'ies'} expiring within 30 days
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5">
              Review and renew these policies before they expire.
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : insurance.length === 0 ? (
        <EmptyState
          icon={ShieldAlert}
          title="No insurance policies"
          description="Add your first insurance policy to start tracking asset coverage."
        />
      ) : (
        <InsuranceList policies={insurance} onEdit={handleEdit} />
      )}

      <InsuranceFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        policy={editingPolicy}
        categories={flatCategories}
        onSubmit={handleSubmit}
        onUpdate={handleUpdate}
      />
    </div>
  );
}
