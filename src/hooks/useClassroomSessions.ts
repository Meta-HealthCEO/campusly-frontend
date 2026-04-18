import { useState, useEffect } from 'react';
import apiClient from '@/lib/api-client';
import type {
  VirtualSession,
  CreateClassroomSessionPayload,
  ClassroomSessionFilters,
} from '@/types';

export interface JoinData {
  token: string;
  livekitUrl: string;
  roomName: string;
  participantName: string;
  isTeacher: boolean;
  livekitConfigured: boolean;
  sessionId: string;
}

export function useClassroomSessions(initialFilters?: ClassroomSessionFilters) {
  const [sessions, setSessions] = useState<VirtualSession[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = async (filters?: ClassroomSessionFilters) => {
    setLoading(true);
    try {
      const params = filters ?? initialFilters ?? {};
      const response = await apiClient.get('/classroom/sessions/upcoming', { params });
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

  const getJoinToken = async (sessionId: string): Promise<JoinData> => {
    const response = await apiClient.get(`/classroom/sessions/${sessionId}/join`);
    const raw = response.data.data ?? response.data;
    return raw as JoinData;
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
