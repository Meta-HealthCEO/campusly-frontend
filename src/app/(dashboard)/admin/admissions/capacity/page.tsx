'use client';

import { useEffect } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { CapacityConfigTable } from '@/components/admissions/CapacityConfigTable';
import { useAdmissionsCapacity } from '@/hooks/useAdmissionsCapacity';

export default function AdminAdmissionsCapacityPage() {
  const { capacities, loading, fetchCapacity, updateCapacity } = useAdmissionsCapacity();

  useEffect(() => {
    fetchCapacity();
  }, [fetchCapacity]);

  const handleSave = async (grades: { grade: number; maxCapacity: number }[]) => {
    await updateCapacity(grades);
    fetchCapacity();
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Capacity Management"
        description="Configure maximum students per grade for admissions."
      />

      {loading ? (
        <LoadingSpinner />
      ) : (
        <CapacityConfigTable
          capacities={capacities}
          onSave={handleSave}
          loading={loading}
        />
      )}
    </div>
  );
}
