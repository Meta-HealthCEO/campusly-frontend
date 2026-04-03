'use client';

import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useBudget } from '@/hooks/useBudget';
import { useBudgetReports } from '@/hooks/useBudgetReports';
import {
  VarianceChart, CashFlowChart, MonthlyReportChart,
  MultiYearComparisonChart, ExportDialog,
} from '@/components/budget';

export default function BudgetReportsPage() {
  const { budgets, fetchBudgets } = useBudget();
  const {
    variance, monthly, cashflow, comparison, loading,
    fetchVariance, fetchMonthly, fetchCashflow, fetchComparison, exportReport,
  } = useBudgetReports();

  const [activeTab, setActiveTab] = useState('variance');
  const [selectedBudgetId, setSelectedBudgetId] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('all');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [comparisonYears, setComparisonYears] = useState('');

  useEffect(() => { fetchBudgets(); }, [fetchBudgets]);

  useEffect(() => {
    if (budgets.length > 0 && !selectedBudgetId) {
      setSelectedBudgetId(budgets[0].id);
    }
  }, [budgets, selectedBudgetId]);

  // Load data when tab or budget changes
  useEffect(() => {
    if (!selectedBudgetId && activeTab !== 'monthly' && activeTab !== 'comparison') return;
    if (activeTab === 'variance' && selectedBudgetId) {
      const term = selectedTerm !== 'all' ? Number(selectedTerm) : undefined;
      fetchVariance(selectedBudgetId, term);
    }
    if (activeTab === 'cashflow' && selectedBudgetId) {
      fetchCashflow(selectedBudgetId);
    }
  }, [activeTab, selectedBudgetId, selectedTerm, fetchVariance, fetchCashflow]);

  useEffect(() => {
    if (activeTab === 'monthly') fetchMonthly(selectedYear);
  }, [activeTab, selectedYear, fetchMonthly]);

  const handleCompare = useCallback(() => {
    if (!comparisonYears.trim()) return;
    const years = comparisonYears.split(',').map((y) => Number(y.trim())).filter(Boolean);
    if (years.length > 0) fetchComparison(years);
  }, [comparisonYears, fetchComparison]);

  return (
    <div className="space-y-6">
      <PageHeader title="Budget Reports" description="Analyse budget performance and trends">
        <ExportDialog budgets={budgets} onExport={exportReport} />
      </PageHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="variance">Variance</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
          <TabsTrigger value="comparison">Multi-Year</TabsTrigger>
        </TabsList>

        {/* ── Variance ──────────────────────────────────── */}
        <TabsContent value="variance" className="space-y-4 mt-4">
          <div className="flex flex-col sm:flex-row gap-3">
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
            <Select value={selectedTerm} onValueChange={(v: unknown) => setSelectedTerm(v as string)}>
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue placeholder="Term" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Annual</SelectItem>
                <SelectItem value="1">Term 1</SelectItem>
                <SelectItem value="2">Term 2</SelectItem>
                <SelectItem value="3">Term 3</SelectItem>
                <SelectItem value="4">Term 4</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {loading ? <LoadingSpinner /> : <VarianceChart report={variance} />}
        </TabsContent>

        {/* ── Monthly ───────────────────────────────────── */}
        <TabsContent value="monthly" className="space-y-4 mt-4">
          <div className="flex gap-3">
            <Select
              value={String(selectedYear)}
              onValueChange={(v: unknown) => setSelectedYear(Number(v))}
            >
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {[2024, 2025, 2026, 2027].map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {loading ? <LoadingSpinner /> : <MonthlyReportChart report={monthly} />}
        </TabsContent>

        {/* ── Cash Flow ─────────────────────────────────── */}
        <TabsContent value="cashflow" className="space-y-4 mt-4">
          <div className="flex gap-3">
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
          </div>
          {loading ? <LoadingSpinner /> : <CashFlowChart report={cashflow} />}
        </TabsContent>

        {/* ── Multi-Year Comparison ─────────────────────── */}
        <TabsContent value="comparison" className="space-y-4 mt-4">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="space-y-1 flex-1">
              <Label className="text-sm">Years (comma-separated)</Label>
              <Input
                value={comparisonYears}
                onChange={(e) => setComparisonYears(e.target.value)}
                placeholder="2024, 2025, 2026"
                className="w-full sm:w-64"
              />
            </div>
            <Button onClick={handleCompare} disabled={!comparisonYears.trim()}>
              Compare
            </Button>
          </div>
          {loading ? <LoadingSpinner /> : <MultiYearComparisonChart report={comparison} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
