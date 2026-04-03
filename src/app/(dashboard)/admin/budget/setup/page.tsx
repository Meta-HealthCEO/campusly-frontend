'use client';

import { useEffect } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useBudget } from '@/hooks/useBudget';
import { useBudgetCategories } from '@/hooks/useBudgetCategories';
import { BudgetSetupSection } from '../BudgetSetupSection';

export default function BudgetSetupPage() {
  const { budgets, loading, fetchBudgets, createBudget, updateBudget, deleteBudget } = useBudget();
  const { flatCategories, fetchCategories } = useBudgetCategories();

  useEffect(() => {
    fetchBudgets();
    fetchCategories();
  }, [fetchBudgets, fetchCategories]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Budget Setup"
        description="Create and manage annual budgets with line items"
      />
      <BudgetSetupSection
        budgets={budgets}
        categories={flatCategories}
        onCreate={createBudget}
        onUpdate={updateBudget}
        onDelete={deleteBudget}
        onRefresh={fetchBudgets}
      />
    </div>
  );
}
