'use client';

import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse, unwrapList } from '@/lib/api-helpers';
import { useAuthStore } from '@/stores/useAuthStore';
import type {
  VarianceReport,
  MonthlyReport,
  CashFlowReport,
  ComparisonReport,
  BudgetAlert,
} from '@/types';

export function useBudgetReports() {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId ?? '';
  const [variance, setVariance] = useState<VarianceReport | null>(null);
  const [monthly, setMonthly] = useState<MonthlyReport | null>(null);
  const [cashflow, setCashflow] = useState<CashFlowReport | null>(null);
  const [comparison, setComparison] = useState<ComparisonReport | null>(null);
  const [alerts, setAlerts] = useState<BudgetAlert[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchVariance = useCallback(async (budgetId: string, term?: number) => {
    if (!schoolId) return;
    try {
      setLoading(true);
      const params: Record<string, string | number> = { schoolId, budgetId };
      if (term) params.term = term;
      const res = await apiClient.get('/budget/reports/variance', { params });
      setVariance(unwrapResponse<VarianceReport>(res));
    } catch (err: unknown) {
      console.error('Failed to load variance report', err);
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  const fetchMonthly = useCallback(async (year: number) => {
    if (!schoolId) return;
    try {
      setLoading(true);
      const res = await apiClient.get('/budget/reports/monthly', {
        params: { schoolId, year },
      });
      setMonthly(unwrapResponse<MonthlyReport>(res));
    } catch (err: unknown) {
      console.error('Failed to load monthly report', err);
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  const fetchCashflow = useCallback(async (budgetId: string, months?: number) => {
    if (!schoolId) return;
    try {
      setLoading(true);
      const params: Record<string, string | number> = { schoolId, budgetId };
      if (months) params.months = months;
      const res = await apiClient.get('/budget/reports/cashflow', { params });
      setCashflow(unwrapResponse<CashFlowReport>(res));
    } catch (err: unknown) {
      console.error('Failed to load cashflow report', err);
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  const fetchComparison = useCallback(async (years: number[]) => {
    if (!schoolId) return;
    try {
      setLoading(true);
      const res = await apiClient.get('/budget/reports/comparison', {
        params: { schoolId, years: years.join(',') },
      });
      setComparison(unwrapResponse<ComparisonReport>(res));
    } catch (err: unknown) {
      console.error('Failed to load comparison report', err);
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  const fetchAlerts = useCallback(async (budgetId: string) => {
    if (!schoolId) return;
    try {
      const res = await apiClient.get('/budget/alerts', {
        params: { schoolId, budgetId },
      });
      setAlerts(unwrapList<BudgetAlert>(res));
    } catch (err: unknown) {
      console.error('Failed to load budget alerts', err);
    }
  }, [schoolId]);

  const exportReport = useCallback(async (budgetId: string) => {
    if (!schoolId) return;
    const res = await apiClient.get('/budget/reports/export', {
      params: { schoolId, budgetId, format: 'xlsx' },
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([res.data as BlobPart]));
    const link = document.createElement('a');
    link.href = url;
    link.download = `budget-report.xlsx`;
    link.click();
    window.URL.revokeObjectURL(url);
  }, [schoolId]);

  return {
    variance,
    monthly,
    cashflow,
    comparison,
    alerts,
    loading,
    fetchVariance,
    fetchMonthly,
    fetchCashflow,
    fetchComparison,
    fetchAlerts,
    exportReport,
  };
}
