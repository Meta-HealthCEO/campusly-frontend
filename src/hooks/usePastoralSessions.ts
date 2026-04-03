import { useState, useEffect } from 'react';
import apiClient from '@/lib/api-client';
import type {
  CounselorSession,
  CreateSessionPayload,
  SessionFilters,
} from '@/types/pastoral';

export function usePastoralSessions(initialFilters?: SessionFilters) {
  const [sessions, setSessions] = useState<CounselorSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const fetchSessions = async (params?: SessionFilters) => {
    setSessionsLoading(true);
    try {
      const response = await apiClient.get('/pastoral/sessions', {
        params: params ?? initialFilters,
      });
      const raw = response.data.data ?? response.data;
      const list = Array.isArray(raw) ? raw : (raw.sessions ?? []);
      setSessions(list);
      if (raw.total !== undefined) setTotal(raw.total as number);
    } catch (err: unknown) {
      console.error('Failed to load sessions', err);
    } finally {
      setSessionsLoading(false);
    }
  };

  const createSession = async (data: CreateSessionPayload): Promise<CounselorSession> => {
    const response = await apiClient.post('/pastoral/sessions', data);
    const created = response.data.data ?? response.data;
    await fetchSessions();
    return created as CounselorSession;
  };

  const updateSession = async (
    id: string,
    data: Partial<CreateSessionPayload>,
  ): Promise<CounselorSession> => {
    const response = await apiClient.put(`/pastoral/sessions/${id}`, data);
    const updated = response.data.data ?? response.data;
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? (updated as CounselorSession) : s)),
    );
    return updated as CounselorSession;
  };

  useEffect(() => {
    void fetchSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    sessions,
    sessionsLoading,
    total,
    fetchSessions,
    createSession,
    updateSession,
  };
}
