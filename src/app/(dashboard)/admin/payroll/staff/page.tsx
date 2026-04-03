'use client';

import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Users, Plus } from 'lucide-react';
import { usePayrollSalaries } from '@/hooks/usePayrollSalaries';
import { SalaryList, SalaryFormDialog } from '@/components/payroll';
import type { SalaryRecord, CreateSalaryPayload } from '@/types';

export default function StaffSalaryListPage() {
  const { salaries, loading, fetchSalaries, createSalary, updateSalary } = usePayrollSalaries();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSalary, setEditingSalary] = useState<SalaryRecord | null>(null);

  useEffect(() => { fetchSalaries(); }, [fetchSalaries]);

  const handleCreate = useCallback(async (data: CreateSalaryPayload) => {
    await createSalary(data);
    await fetchSalaries();
    setDialogOpen(false);
  }, [createSalary, fetchSalaries]);

  const handleUpdate = useCallback(async (id: string, data: Partial<SalaryRecord> & { reason?: string }) => {
    await updateSalary(id, data);
    await fetchSalaries();
    setDialogOpen(false);
    setEditingSalary(null);
  }, [updateSalary, fetchSalaries]);

  const handleEdit = useCallback((salary: SalaryRecord) => {
    setEditingSalary(salary);
    setDialogOpen(true);
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader title="Staff Salaries" description="Manage salary records for all staff">
        <Button onClick={() => { setEditingSalary(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Add Salary Record
        </Button>
      </PageHeader>

      {salaries.length === 0 ? (
        <EmptyState icon={Users} title="No salary records" description="Add your first staff salary record to begin." />
      ) : (
        <SalaryList salaries={salaries} onEdit={handleEdit} />
      )}

      <SalaryFormDialog
        open={dialogOpen}
        onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingSalary(null); }}
        salary={editingSalary}
        staffList={[]}
        onSubmit={handleCreate}
        onUpdate={handleUpdate}
      />
    </div>
  );
}
