import { useCallback, useState, useEffect } from 'react';
import apiClient from '@/lib/api-client';
import { extractErrorMessage } from '@/lib/api-helpers';
import type {
  CounselorSession,
  CreateSessionPayload,
  SessionFilters,
} from '@/types/pastoral';

export function usePastoralSessions(initialFilters?: SessionFilters) {
  const [sessions, setSessions] = useState<CounselorSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const fetchSessions = useCallback(async (params?: SessionFilters) => {
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
      console.warn(extractErrorMessage(err, 'Failed to load sessions'));
    } finally {
      setSessionsLoading(false);
    }
  }, [initialFilters]);

  const createSession = useCallback(async (data: CreateSessionPayload): Promise<CounselorSession> => {
    const response = await apiClient.post('/pastoral/sessions', data);
    const created = response.data.data ?? response.data;
    await fetchSessions();
    return created as CounselorSession;
  }, [fetchSessions]);

  const updateSession = useCallback(async (
    id: string,
    data: Partial<CreateSessionPayload>,
  ): Promise<CounselorSession> => {
    const response = await apiClient.put(`/pastoral/sessions/${id}`, data);
    const updated = response.data.data ?? response.data;
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? (updated as CounselorSession) : s)),
    );
    return updated as CounselorSession;
  }, []);

  useEffect(() => {
    void fetchSessions();
  }, [fetchSessions]);

  return {
    sessions,
    sessionsLoading,
    total,
    fetchSessions,
    createSession,
    updateSession,
  };
}
