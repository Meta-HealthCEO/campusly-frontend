import { useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import { useSchoolStore, mapSchool } from '@/stores/useSchoolStore';
import type { CreateSchoolInput, UpdateSchoolInput, UpdateSettingsInput, SchoolDocument } from '@/types';

export function useSchoolData() {
  const setSchool = useSchoolStore((s) => s.setSchool);
  const setSchoolLoading = useSchoolStore((s) => s.setSchoolLoading);
  const setSchoolError = useSchoolStore((s) => s.setSchoolError);
  const setSchools = useSchoolStore((s) => s.setSchools);
  const setSchoolsLoading = useSchoolStore((s) => s.setSchoolsLoading);
  const setSchoolsError = useSchoolStore((s) => s.setSchoolsError);

  const fetchSchool = useCallback(async (id: string) => {
    setSchoolLoading(true);
    setSchoolError(null);
    try {
      const response = await apiClient.get(`/schools/${id}`);
      const payload = unwrapResponse(response);
      const raw: Record<string, unknown> =
        (payload.school as Record<string, unknown> | undefined) ?? payload;
      setSchool(mapSchool(raw));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch school';
      setSchoolError(message);
      throw err;
    } finally {
      setSchoolLoading(false);
    }
  }, [setSchool, setSchoolLoading, setSchoolError]);

  const fetchSchools = useCallback(async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    sort?: string;
  }) => {
    setSchoolsLoading(true);
    setSchoolsError(null);
    try {
      const response = await apiClient.get('/schools', { params });
      const payload = unwrapResponse(response) as Record<string, unknown>;
      const rawList = (payload.schools ?? payload.data ?? []) as Record<string, unknown>[];
      const pagination = payload.pagination as Record<string, number> | undefined;
      const total = (pagination?.total ?? payload.total ?? rawList.length) as number;
      const page = (pagination?.page ?? payload.page ?? params?.page ?? 1) as number;
      const limit = (pagination?.limit ?? payload.limit ?? params?.limit ?? 20) as number;
      setSchools({
        schools: rawList.map(mapSchool),
        total,
        page,
        limit,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch schools';
      setSchoolsError(message);
      throw err;
    } finally {
      setSchoolsLoading(false);
    }
  }, [setSchools, setSchoolsLoading, setSchoolsError]);

  const createSchool = useCallback(async (data: CreateSchoolInput): Promise<SchoolDocument> => {
    const response = await apiClient.post('/schools', data);
    const payload = unwrapResponse(response) as Record<string, unknown>;
    const raw: Record<string, unknown> =
      (payload.school as Record<string, unknown> | undefined) ?? payload;
    return mapSchool(raw);
  }, []);

  const updateSchool = useCallback(async (id: string, data: UpdateSchoolInput) => {
    await apiClient.put(`/schools/${id}`, data);
    const currentSchool = useSchoolStore.getState().school;
    if (currentSchool?.id === id) {
      await fetchSchool(id);
    }
  }, [fetchSchool]);

  const deleteSchool = useCallback(async (id: string) => {
    await apiClient.delete(`/schools/${id}`);
  }, []);

  const updateSettings = useCallback(async (id: string, data: UpdateSettingsInput) => {
    await apiClient.patch(`/schools/${id}/settings`, data);
    const currentSchool = useSchoolStore.getState().school;
    if (currentSchool?.id === id) {
      await fetchSchool(id);
    }
  }, [fetchSchool]);

  return {
    fetchSchool,
    fetchSchools,
    createSchool,
    updateSchool,
    deleteSchool,
    updateSettings,
  };
}
