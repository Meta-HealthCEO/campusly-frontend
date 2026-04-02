import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import { useAuthStore } from '@/stores/useAuthStore';
import type {
  AccountingConfig,
  AccountingExport,
  IncomeStatement,
  CashFlowPoint,
  ExportFormat,
} from '@/types';

// ─── Config ──────────────────────────────────────────────────────────────────

export function useAccountingConfig() {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId ?? '';
  const [config, setConfig] = useState<AccountingConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchConfig = useCallback(async () => {
    if (!schoolId) return;
    try {
      const res = await apiClient.get('/accounting/config');
      setConfig(unwrapResponse<AccountingConfig | null>(res));
    } catch {
      console.error('Failed to load accounting config');
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const saveConfig = async (data: Partial<AccountingConfig>) => {
    const res = await apiClient.put('/accounting/config', data);
    const saved = unwrapResponse<AccountingConfig>(res);
    setConfig(saved);
    toast.success('Configuration saved');
    return saved;
  };

  return { config, loading, saveConfig, refetch: fetchConfig };
}

// ─── Exports ─────────────────────────────────────────────────────────────────

export function useAccountingExports() {
  const [exports, setExports] = useState<AccountingExport[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchExports = useCallback(async () => {
    try {
      const res = await apiClient.get('/accounting/exports');
      const data = unwrapResponse<{ exports: AccountingExport[]; total: number }>(res);
      setExports(data.exports ?? []);
    } catch {
      console.error('Failed to load exports');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchExports(); }, [fetchExports]);

  const generateExport = async (format: ExportFormat, dateFrom: string, dateTo: string) => {
    const res = await apiClient.post('/accounting/export', { format, dateFrom, dateTo });
    const record = unwrapResponse<AccountingExport>(res);
    toast.success('Export generated');
    await fetchExports();
    return record;
  };

  const downloadExport = async (exportId: string): Promise<string | null> => {
    const res = await apiClient.get(`/accounting/exports/${exportId}/download`);
    const record = unwrapResponse<AccountingExport>(res);
    return record?.downloadUrl ?? null;
  };

  return { exports, loading, generateExport, downloadExport, refetch: fetchExports };
}

// ─── Reports ─────────────────────────────────────────────────────────────────

export function useIncomeStatement(dateFrom: string, dateTo: string) {
  const [statement, setStatement] = useState<IncomeStatement | null>(null);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!dateFrom || !dateTo) return;
    setLoading(true);
    try {
      const res = await apiClient.get('/accounting/income-statement', {
        params: { dateFrom, dateTo },
      });
      setStatement(unwrapResponse<IncomeStatement>(res));
    } catch {
      console.error('Failed to load income statement');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => { fetch(); }, [fetch]);

  return { statement, loading, refetch: fetch };
}

export function useCashFlow(dateFrom: string, dateTo: string) {
  const [cashFlow, setCashFlow] = useState<CashFlowPoint[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!dateFrom || !dateTo) return;
    setLoading(true);
    try {
      const res = await apiClient.get('/accounting/cash-flow', {
        params: { dateFrom, dateTo },
      });
      const data = unwrapResponse<CashFlowPoint[]>(res);
      setCashFlow(Array.isArray(data) ? data : []);
    } catch {
      console.error('Failed to load cash flow');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => { fetch(); }, [fetch]);

  return { cashFlow, loading, refetch: fetch };
}
