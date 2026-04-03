'use client';

import { useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { ClipboardCheck } from 'lucide-react';
import { useExpenses } from '@/hooks/useExpenses';
import { ExpenseApprovalCard } from '@/components/budget';

export default function ExpenseApprovalPage() {
  const { pendingExpenses, loading, fetchPendingExpenses, approveExpense, rejectExpense } = useExpenses();

  useEffect(() => { fetchPendingExpenses(); }, [fetchPendingExpenses]);

  const handleApprove = useCallback(async (id: string, notes?: string) => {
    await approveExpense(id, notes);
    await fetchPendingExpenses();
  }, [approveExpense, fetchPendingExpenses]);

  const handleReject = useCallback(async (id: string, reason: string) => {
    await rejectExpense(id, reason);
    await fetchPendingExpenses();
  }, [rejectExpense, fetchPendingExpenses]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expense Approvals"
        description={`${pendingExpenses.length} pending claim${pendingExpenses.length !== 1 ? 's' : ''} awaiting review`}
      />

      {pendingExpenses.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No pending claims"
          description="All expense claims have been reviewed."
        />
      ) : (
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          {pendingExpenses.map((expense) => (
            <ExpenseApprovalCard
              key={expense.id}
              expense={expense}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))}
        </div>
      )}
    </div>
  );
}
