'use client';

import { useEffect } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Settings } from 'lucide-react';
import { toast } from 'sonner';
import { useTaxConfig } from '@/hooks/useTaxConfig';
import { TaxBracketEditor } from '@/components/payroll';
import type { TaxTable } from '@/types';

export default function TaxConfigPage() {
  const { taxTable, loading, fetchTaxTable, saveTaxTable } = useTaxConfig();

  useEffect(() => { fetchTaxTable(); }, [fetchTaxTable]);

  const handleSave = async (data: Omit<TaxTable, 'id' | 'schoolId'>) => {
    try {
      await saveTaxTable(data);
      toast.success('Tax table saved successfully');
    } catch (err: unknown) {
      console.error('Failed to save tax table', err);
      toast.error('Failed to save tax table');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader title="Tax Configuration" description="South African tax brackets, rebates, UIF rates, and thresholds" />

      {!taxTable && !loading ? (
        <EmptyState
          icon={Settings}
          title="No tax table configured"
          description="Configure SA tax brackets for the current tax year. The editor below will create a new table."
        />
      ) : null}

      <TaxBracketEditor taxTable={taxTable} onSave={handleSave} />
    </div>
  );
}
