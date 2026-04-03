'use client';

import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse, unwrapList, extractErrorMessage } from '@/lib/api-helpers';
import type { PayrollRun, Adjustment } from '@/types';

interface CreateRunPayload {
  month: number;
  year: number;
  description?: string;
}

export function usePayrollRuns() {
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [activeRun, setActiveRun] = useState<PayrollRun | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRuns = useCallback(async (year?: number, status?: string) => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {};
      if (year) params.year = year;
      if (status) params.status = status;
      const response = await apiClient.get('/payroll/runs', { params });
      const raw = unwrapResponse<{ runs?: PayrollRun[] }>(response);
      if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
        const obj = raw as Record<string, unknown>;
        setRuns(Array.isArray(obj.runs) ? obj.runs as PayrollRun[] : []);
      } else {
        setRuns(unwrapList<PayrollRun>(response));
      }
    } catch (err: unknown) {
      console.error('Failed to fetch payroll runs:', extractErrorMessage(err));
      setRuns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRun = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/payroll/runs/${id}`);
      const run = unwrapResponse<PayrollRun>(response);
      setActiveRun(run);
    } catch (err: unknown) {
      console.error('Failed to fetch payroll run:', extractErrorMessage(err));
      setActiveRun(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const createRun = useCallback(async (data: CreateRunPayload): Promise<PayrollRun> => {
    const response = await apiClient.post('/payroll/runs', data);
    return unwrapResponse<PayrollRun>(response);
  }, []);

  const reviewRun = useCallback(async (id: string, notes?: string): Promise<void> => {
    await apiClient.put(`/payroll/runs/${id}/review`, { reviewNotes: notes });
  }, []);

  const approveRun = useCallback(async (id: string): Promise<void> => {
    await apiClient.put(`/payroll/runs/${id}/approve`);
  }, []);

  const processRun = useCallback(async (id: string): Promise<void> => {
    await apiClient.put(`/payroll/runs/${id}/process`);
  }, []);

  const adjustItem = useCallback(async (runId: string, itemId: string, adjustments: Adjustment[]): Promise<void> => {
    await apiClient.put(`/payroll/runs/${runId}/items/${itemId}`, { adjustments });
  }, []);

  return {
    runs, activeRun, loading,
    fetchRuns, fetchRun, createRun,
    reviewRun, approveRun, processRun, adjustItem,
  };
}
