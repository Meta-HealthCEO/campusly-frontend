import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import type {
  VirtualSession,
  CreateClassroomSessionPayload,
  SessionFilters,
} from '@/types';

export function useClassroomSessions(initialFilters?: SessionFilters) {
  const [sessions, setSessions] = useState<VirtualSession[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = async (filters?: SessionFilters) => {
    setLoading(true);
    try {
      const params = filters ?? initialFilters ?? {};
      const response = await apiClient.get('/classroom/sessions', { params });
      const raw = response.data.data ?? response.data;
      setSessions(Array.isArray(raw) ? raw : raw.data ?? []);
    } catch (err: unknown) {
      console.error('Failed to fetch classroom sessions', err);
    } finally {
      setLoading(false);
    }
  };

  const createSession = async (payload: CreateClassroomSessionPayload): Promise<VirtualSession> => {
    const response = await apiClient.post('/classroom/sessions', payload);
    return response.data.data ?? response.data;
  };

  const updateSession = async (
    sessionId: string,
    payload: Partial<CreateClassroomSessionPayload>,
  ): Promise<VirtualSession> => {
    const response = await apiClient.patch(`/classroom/sessions/${sessionId}`, payload);
    return response.data.data ?? response.data;
  };

  const cancelSession = async (sessionId: string): Promise<void> => {
    await apiClient.patch(`/classroom/sessions/${sessionId}/cancel`);
  };

  const startSession = async (sessionId: string): Promise<VirtualSession> => {
    const response = await apiClient.patch(`/classroom/sessions/${sessionId}/start`);
    return response.data.data ?? response.data;
  };

  const endSession = async (sessionId: string): Promise<VirtualSession> => {
    const response = await apiClient.patch(`/classroom/sessions/${sessionId}/end`);
    return response.data.data ?? response.data;
  };

  const getJoinToken = async (sessionId: string): Promise<string> => {
    const response = await apiClient.get(`/classroom/sessions/${sessionId}/join`);
    const raw = response.data.data ?? response.data;
    return typeof raw === 'string' ? raw : (raw.token as string);
  };

  useEffect(() => {
    fetchSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    sessions,
    loading,
    fetchSessions,
    createSession,
    updateSession,
    cancelSession,
    startSession,
    endSession,
    getJoinToken,
  };
}
