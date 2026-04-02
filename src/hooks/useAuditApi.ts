import { useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import { useAuditStore } from '@/stores/useAuditStore';
import type { AuditLog, AuditSchool } from '@/stores/useAuditStore';

function extractApiError(err: unknown, fallback: string): string {
  const e = err as {
    response?: { data?: { error?: string; message?: string } };
  };
  return (
    e?.response?.data?.error ??
    e?.response?.data?.message ??
    fallback
  );
}

export function useAuditApi() {
  const setLogs = useAuditStore((s) => s.setLogs);
  const setLoading = useAuditStore((s) => s.setLoading);
  const setError = useAuditStore((s) => s.setError);
  const setExporting = useAuditStore((s) => s.setExporting);
  const setExportError = useAuditStore((s) => s.setExportError);
  const setSchools = useAuditStore((s) => s.setSchools);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { filters } = useAuditStore.getState();
      const params: Record<string, string | number> = {};
      if (filters.page) params.page = filters.page;
      if (filters.limit) params.limit = filters.limit;
      if (filters.userId) params.userId = filters.userId;
      if (filters.entity) params.entity = filters.entity;
      if (filters.action) params.action = filters.action;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.schoolId) params.schoolId = filters.schoolId;

      const res = await apiClient.get('/audit/logs', { params });
      const raw = unwrapResponse(res);
      const logs: AuditLog[] = Array.isArray(raw) ? raw : raw.logs ?? [];
      const total: number = typeof raw.total === 'number' ? raw.total : logs.length;
      setLogs(logs, total);
    } catch (err: unknown) {
      const msg = extractApiError(err, 'Failed to load audit logs');
      setError(msg);
      setLogs([], 0);
    } finally {
      setLoading(false);
    }
  }, [setLogs, setLoading, setError]);

  const exportLogs = useCallback(async (): Promise<AuditLog[]> => {
    setExporting(true);
    setExportError(null);
    try {
      const { filters } = useAuditStore.getState();
      const params: Record<string, string> = {};
      if (filters.userId) params.userId = filters.userId;
      if (filters.entity) params.entity = filters.entity;
      if (filters.action) params.action = filters.action;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.schoolId) params.schoolId = filters.schoolId;

      const res = await apiClient.get('/audit/logs/export', { params });
      const raw = unwrapResponse(res);
      const logs: AuditLog[] = Array.isArray(raw) ? raw : [];
      return logs;
    } catch (err: unknown) {
      const msg = extractApiError(err, 'Failed to export audit logs');
      setExportError(msg);
      throw new Error('Export failed');
    } finally {
      setExporting(false);
    }
  }, [setExporting, setExportError]);

  const fetchSchools = useCallback(async () => {
    try {
      const res = await apiClient.get('/schools');
      const raw = unwrapResponse(res);
      const arr: AuditSchool[] = Array.isArray(raw) ? raw : raw.schools ?? [];
      setSchools(arr);
    } catch {
      console.error('Failed to load schools');
    }
  }, [setSchools]);

  return { fetchLogs, exportLogs, fetchSchools };
}
