import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import type {
  TeacherObservation,
  CreateObservationPayload,
  UpdateObservationPayload,
} from '@/types';

interface ObservationListResult {
  items: TeacherObservation[];
  total: number;
}

export function useTeacherObservations(departmentId: string | null) {
  const [observations, setObservations] = useState<TeacherObservation[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchObservations = useCallback(async (
    filters?: { teacherId?: string; status?: string; page?: number },
  ) => {
    if (!departmentId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters?.teacherId) params.set('teacherId', filters.teacherId);
      if (filters?.status) params.set('status', filters.status);
      if (filters?.page) params.set('page', String(filters.page));
      const res = await apiClient.get(`/departments/${departmentId}/observations?${params}`);
      const data = unwrapResponse<ObservationListResult>(res);
      setObservations(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (err: unknown) {
      console.error('Failed to load observations', err);
    } finally {
      setLoading(false);
    }
  }, [departmentId]);

  const createObservation = useCallback(async (data: CreateObservationPayload) => {
    if (!departmentId) return;
    const res = await apiClient.post(`/departments/${departmentId}/observations`, data);
    return unwrapResponse<TeacherObservation>(res);
  }, [departmentId]);

  const updateObservation = useCallback(async (
    observationId: string,
    data: UpdateObservationPayload,
  ) => {
    if (!departmentId) return;
    const res = await apiClient.put(
      `/departments/${departmentId}/observations/${observationId}`,
      data,
    );
    return unwrapResponse<TeacherObservation>(res);
  }, [departmentId]);

  const deleteObservation = useCallback(async (observationId: string) => {
    if (!departmentId) return;
    await apiClient.delete(`/departments/${departmentId}/observations/${observationId}`);
  }, [departmentId]);

  return {
    observations,
    total,
    loading,
    fetchObservations,
    createObservation,
    updateObservation,
    deleteObservation,
  };
}
