'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Calculator, ArrowRight, ClipboardList, FolderTree, Receipt, BarChart3 } from 'lucide-react';
import { useBudget } from '@/hooks/useBudget';
import { useExpenses } from '@/hooks/useExpenses';
import { useBudgetReports } from '@/hooks/useBudgetReports';
import { BudgetSummaryCards, BudgetAlertBanner, ExpenseTable } from '@/components/budget';

export default function AdminBudgetPage() {
  const { budgets, activeBudget, loading, fetchBudgets, fetchBudget } = useBudget();
  const { expenses, pendingExpenses, fetchExpenses, fetchPendingExpenses, approveExpense, rejectExpense } = useExpenses();
  const { alerts, fetchAlerts } = useBudgetReports();
  const [selectedBudgetId, setSelectedBudgetId] = useState('');

  useEffect(() => { fetchBudgets(); }, [fetchBudgets]);

  useEffect(() => {
    if (budgets.length > 0 && !selectedBudgetId) {
      setSelectedBudgetId(budgets[0].id);
    }
  }, [budgets, selectedBudgetId]);

  useEffect(() => {
    if (!selectedBudgetId) return;
    fetchBudget(selectedBudgetId);
    fetchAlerts(selectedBudgetId);
    fetchExpenses();
    fetchPendingExpenses();
  }, [selectedBudgetId, fetchBudget, fetchAlerts, fetchExpenses, fetchPendingExpenses]);

  const totalExpenses = useMemo(
    () => expenses.filter((e) => e.status === 'approved').reduce((sum, e) => sum + e.amount, 0),
    [expenses],
  );

  const handleApprove = useCallback(async (id: string) => {
    await approveExpense(id);
    await fetchPendingExpenses();
  }, [approveExpense, fetchPendingExpenses]);

  const handleReject = useCallback(async (id: string) => {
    await rejectExpense(id, 'Rejected by admin');
    await fetchPendingExpenses();
  }, [rejectExpense, fetchPendingExpenses]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <PageHeader title="Budget Management" description="Plan, track, and analyse your school budget">
        {budgets.length > 0 && (
          <Select value={selectedBudgetId} onValueChange={(v: unknown) => setSelectedBudgetId(v as string)}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Select budget" />
            </SelectTrigger>
            <SelectContent>
              {budgets.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.name} ({b.year})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </PageHeader>

      {budgets.length === 0 ? (
        <EmptyState
          icon={Calculator}
          title="No budgets yet"
          description="Create your first annual budget to get started."
          action={
            <Link href="/admin/budget/setup">
              <Button>Create Budget</Button>
            </Link>
          }
        />
      ) : (
        <>
          <BudgetSummaryCards budget={activeBudget} totalExpenses={totalExpenses} />
          <BudgetAlertBanner alerts={alerts} />

          {/* Quick Links */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Link href="/admin/budget/setup">
              <Button variant="outline" className="w-full justify-start">
                <ClipboardList className="h-4 w-4 mr-2" /> Budget Setup
              </Button>
            </Link>
            <Link href="/admin/budget/categories">
              <Button variant="outline" className="w-full justify-start">
                <FolderTree className="h-4 w-4 mr-2" /> Categories
              </Button>
            </Link>
            <Link href="/admin/budget/expenses">
              <Button variant="outline" className="w-full justify-start">
                <Receipt className="h-4 w-4 mr-2" /> Expenses
              </Button>
            </Link>
            <Link href="/admin/budget/reports">
              <Button variant="outline" className="w-full justify-start">
                <BarChart3 className="h-4 w-4 mr-2" /> Reports
              </Button>
            </Link>
          </div>

          {/* Pending Approvals Preview */}
          {pendingExpenses.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  Pending Approvals ({pendingExpenses.length})
                </h3>
                <Link href="/admin/budget/expenses/approval">
                  <Button variant="ghost" size="sm">
                    View All <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
              <ExpenseTable
                expenses={pendingExpenses.slice(0, 5)}
                showApprovalActions
                onApprove={handleApprove}
                onReject={handleReject}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
