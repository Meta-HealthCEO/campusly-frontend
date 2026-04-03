'use client';

import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse, unwrapList, extractErrorMessage } from '@/lib/api-helpers';
import type {
  SalaryRecord,
  SalaryHistoryEntry,
  CreateSalaryPayload,
  SalaryFilters,
} from '@/types';

export function usePayrollSalaries() {
  const [salaries, setSalaries] = useState<SalaryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const fetchSalaries = useCallback(async (filters?: SalaryFilters) => {
    setLoading(true);
    try {
      const response = await apiClient.get('/payroll/salaries', { params: filters });
      const raw = unwrapResponse<{ salaries?: SalaryRecord[]; total?: number }>(response);
      if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
        const obj = raw as Record<string, unknown>;
        const list = Array.isArray(obj.salaries) ? obj.salaries as SalaryRecord[] : [];
        setSalaries(list);
        setTotal((obj.total as number) ?? list.length);
      } else {
        const list = unwrapList<SalaryRecord>(response);
        setSalaries(list);
        setTotal(list.length);
      }
    } catch (err: unknown) {
      console.error('Failed to fetch salaries:', extractErrorMessage(err));
      setSalaries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSalary = useCallback(async (id: string): Promise<SalaryRecord> => {
    const response = await apiClient.get(`/payroll/salaries/${id}`);
    return unwrapResponse<SalaryRecord>(response);
  }, []);

  const createSalary = useCallback(async (data: CreateSalaryPayload): Promise<SalaryRecord> => {
    const response = await apiClient.post('/payroll/salaries', data);
    return unwrapResponse<SalaryRecord>(response);
  }, []);

  const updateSalary = useCallback(async (id: string, data: Partial<SalaryRecord> & { reason?: string }): Promise<void> => {
    await apiClient.put(`/payroll/salaries/${id}`, data);
  }, []);

  const fetchHistory = useCallback(async (id: string): Promise<SalaryHistoryEntry[]> => {
    const response = await apiClient.get(`/payroll/salaries/${id}/history`);
    return unwrapList<SalaryHistoryEntry>(response);
  }, []);

  return { salaries, loading, total, fetchSalaries, fetchSalary, createSalary, updateSalary, fetchHistory };
}
