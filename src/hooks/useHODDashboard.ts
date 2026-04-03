import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse, unwrapList } from '@/lib/api-helpers';
import type {
  Department,
  DepartmentPerformance,
  DepartmentPacing,
  WorkloadEntry,
  ModerationQueue,
} from '@/types';

interface HODDashboardState {
  department: Department | null;
  departments: Department[];
  performance: DepartmentPerformance | null;
  pacing: DepartmentPacing | null;
  workload: WorkloadEntry[];
  moderation: ModerationQueue | null;
  loading: boolean;
  error: string | null;
}

export function useHODDashboard(departmentId: string | null) {
  const [state, setState] = useState<HODDashboardState>({
    department: null,
    departments: [],
    performance: null,
    pacing: null,
    workload: [],
    moderation: null,
    loading: true,
    error: null,
  });

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await apiClient.get('/departments');
      const list = unwrapList<Department>(res);
      setState((s) => ({ ...s, departments: list }));
    } catch (err: unknown) {
      console.error('Failed to load departments', err);
    }
  }, []);

  const fetchDepartment = useCallback(async (id: string) => {
    try {
      const res = await apiClient.get(`/departments/${id}`);
      const dept = unwrapResponse<Department>(res);
      setState((s) => ({ ...s, department: dept }));
    } catch (err: unknown) {
      console.error('Failed to load department', err);
    }
  }, []);

  const fetchPerformance = useCallback(async (id: string, term?: number, year?: number) => {
    try {
      const params = new URLSearchParams();
      if (term) params.set('term', String(term));
      if (year) params.set('year', String(year));
      const res = await apiClient.get(`/departments/${id}/performance?${params}`);
      const data = unwrapResponse<DepartmentPerformance>(res);
      setState((s) => ({ ...s, performance: data }));
    } catch (err: unknown) {
      console.error('Failed to load performance', err);
    }
  }, []);

  const fetchPacing = useCallback(async (id: string, term?: number, year?: number) => {
    try {
      const params = new URLSearchParams();
      if (term) params.set('term', String(term));
      if (year) params.set('year', String(year));
      const res = await apiClient.get(`/departments/${id}/pacing?${params}`);
      const data = unwrapResponse<DepartmentPacing>(res);
      setState((s) => ({ ...s, pacing: data }));
    } catch (err: unknown) {
      console.error('Failed to load pacing', err);
    }
  }, []);

  const fetchWorkload = useCallback(async (id: string) => {
    try {
      const res = await apiClient.get(`/departments/${id}/workload`);
      const data = unwrapList<WorkloadEntry>(res);
      setState((s) => ({ ...s, workload: data }));
    } catch (err: unknown) {
      console.error('Failed to load workload', err);
    }
  }, []);

  const fetchModeration = useCallback(async (
    id: string,
    status?: string,
    page?: number,
  ) => {
    try {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (page) params.set('page', String(page));
      const res = await apiClient.get(`/departments/${id}/moderation?${params}`);
      const data = unwrapResponse<ModerationQueue>(res);
      setState((s) => ({ ...s, moderation: data }));
    } catch (err: unknown) {
      console.error('Failed to load moderation', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (!departmentId) {
      fetchDepartments().finally(() => setState((s) => ({ ...s, loading: false })));
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    Promise.all([
      fetchDepartment(departmentId),
      fetchPerformance(departmentId),
      fetchModeration(departmentId),
    ]).finally(() => setState((s) => ({ ...s, loading: false })));
  }, [departmentId, fetchDepartment, fetchDepartments, fetchPerformance, fetchModeration]);

  return {
    ...state,
    fetchDepartments,
    fetchDepartment,
    fetchPerformance,
    fetchPacing,
    fetchWorkload,
    fetchModeration,
  };
}
