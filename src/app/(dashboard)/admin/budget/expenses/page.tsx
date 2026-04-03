'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Receipt, Plus, ClipboardCheck } from 'lucide-react';
import { useBudget } from '@/hooks/useBudget';
import { useBudgetCategories } from '@/hooks/useBudgetCategories';
import { useExpenses } from '@/hooks/useExpenses';
import { ExpenseTable, ExpenseSubmitDialog } from '@/components/budget';
import type { CreateExpensePayload, ExpenseFilters } from '@/types';

export default function BudgetExpensesPage() {
  const { budgets, fetchBudgets } = useBudget();
  const { flatCategories, fetchCategories } = useBudgetCategories();
  const {
    expenses, pendingExpenses, loading, fetchExpenses,
    fetchPendingExpenses, createExpense, approveExpense,
    rejectExpense, uploadReceipt,
  } = useExpenses();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterTerm, setFilterTerm] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchBudgets();
    fetchCategories();
    fetchPendingExpenses();
  }, [fetchBudgets, fetchCategories, fetchPendingExpenses]);

  useEffect(() => {
    const filters: ExpenseFilters = {};
    if (filterStatus !== 'all') filters.status = filterStatus;
    if (filterCategory !== 'all') filters.categoryId = filterCategory;
    if (filterTerm !== 'all') filters.term = Number(filterTerm);
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    fetchExpenses(filters);
  }, [filterStatus, filterCategory, filterTerm, startDate, endDate, fetchExpenses]);

  const handleSubmit = useCallback(async (data: CreateExpensePayload) => {
    await createExpense(data);
    await fetchExpenses();
  }, [createExpense, fetchExpenses]);

  const handleApprove = useCallback(async (id: string) => {
    await approveExpense(id);
    await fetchExpenses();
    await fetchPendingExpenses();
  }, [approveExpense, fetchExpenses, fetchPendingExpenses]);

  const handleReject = useCallback(async (id: string) => {
    await rejectExpense(id, 'Rejected by admin');
    await fetchExpenses();
    await fetchPendingExpenses();
  }, [rejectExpense, fetchExpenses, fetchPendingExpenses]);

  return (
    <div className="space-y-6">
      <PageHeader title="Expenses" description="Record, track, and manage expenses">
        <div className="flex gap-2">
          {pendingExpenses.length > 0 && (
            <Link href="/admin/budget/expenses/approval">
              <Button variant="outline" size="sm">
                <ClipboardCheck className="h-4 w-4 mr-1" />
                Pending <Badge variant="secondary" className="ml-1">{pendingExpenses.length}</Badge>
              </Button>
            </Link>
          )}
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> New Expense
          </Button>
        </div>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <Select value={filterStatus} onValueChange={(v: unknown) => setFilterStatus(v as string)}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterCategory} onValueChange={(v: unknown) => setFilterCategory(v as string)}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {flatCategories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterTerm} onValueChange={(v: unknown) => setFilterTerm(v as string)}>
          <SelectTrigger className="w-full sm:w-28">
            <SelectValue placeholder="Term" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Terms</SelectItem>
            <SelectItem value="1">Term 1</SelectItem>
            <SelectItem value="2">Term 2</SelectItem>
            <SelectItem value="3">Term 3</SelectItem>
            <SelectItem value="4">Term 4</SelectItem>
          </SelectContent>
        </Select>

        <Input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-full sm:w-36"
          placeholder="From"
        />
        <Input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="w-full sm:w-36"
          placeholder="To"
        />
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : expenses.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No expenses"
          description="Record your first expense to start tracking."
        />
      ) : (
        <ExpenseTable
          expenses={expenses}
          showApprovalActions
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}

      <ExpenseSubmitDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        categories={flatCategories}
        budgetId={budgets[0]?.id}
        onSubmit={handleSubmit}
        uploadReceipt={uploadReceipt}
      />
    </div>
  );
}
