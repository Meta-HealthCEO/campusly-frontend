'use client';

import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { PolicyComplianceTable } from '@/components/sgb';
import { useSgbCompliance } from '@/hooks/useSgbDocuments';
import { Shield } from 'lucide-react';

export default function SgbPoliciesPage() {
  const { compliance, loading } = useSgbCompliance();

  if (loading) return <LoadingSpinner />;
  if (!compliance) return <EmptyState icon={Shield} title="No data" description="Compliance data is not available." />;

  return (
    <div className="space-y-6">
      <PageHeader title="Policy Compliance" description="Policy review status and governance checklist" />
      <PolicyComplianceTable compliance={compliance} />
    </div>
  );
}
