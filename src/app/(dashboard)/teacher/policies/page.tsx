'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { BookOpen } from 'lucide-react';
import { useGovernancePolicies } from '@/hooks/useGovernancePolicies';
import { PolicyList } from '@/components/governance';

export default function TeacherPoliciesPage() {
  const router = useRouter();
  const { policies, loading, fetchPolicies } = useGovernancePolicies();

  useEffect(() => { fetchPolicies({ status: 'active' }); }, [fetchPolicies]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader title="School Policies" description="View and acknowledge school policies" />

      {policies.length === 0 ? (
        <EmptyState icon={BookOpen} title="No policies" description="No active policies to display." />
      ) : (
        <PolicyList
          policies={policies}
          onView={(id) => router.push(`/admin/governance/policies/${id}`)}
        />
      )}
    </div>
  );
}
