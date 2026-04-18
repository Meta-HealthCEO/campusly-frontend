'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { useAuthStore } from '@/stores/useAuthStore';
import { unwrapResponse, unwrapList } from '@/lib/api-helpers';
import type {
  InjuryRecord,
  RecoveryLog,
  CreateInjuryInput,
  UpdateInjuryInput,
  CreateRecoveryLogInput,
} from '@/types/injury';

interface ListFilters {
  studentId?: string;
  teamId?: string;
  status?: string;
}

export function useInjuries(filters: ListFilters = {}) {
  const user = useAuthStore((s) => s.user);
  const schoolId = user?.schoolId ?? '';
  const [injuries, setInjuries] = useState<InjuryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const paramKey = JSON.stringify(filters);

  const fetchInjuries = useCallback(async () => {
    if (!schoolId) return;
    try {
      setLoading(true);
      const res = await apiClient.get('/sports/injuries', { params: filters });
      setInjuries(unwrapList<InjuryRecord>(res));
    } catch {
      console.error('Failed to load injuries');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId, paramKey]);

  useEffect(() => { fetchInjuries(); }, [fetchInjuries]);

  return { injuries, loading, refetch: fetchInjuries };
}

export async function createInjury(input: CreateInjuryInput): Promise<InjuryRecord> {
  try {
    const res = await apiClient.post('/sports/injuries', input);
    toast.success('Injury recorded');
    return unwrapResponse<InjuryRecord>(res);
  } catch (err: unknown) {
    const message =
      (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      ?? 'Failed to record injury';
    toast.error(message);
    throw err;
  }
}

export async function updateInjury(
  id: string,
  input: UpdateInjuryInput,
): Promise<InjuryRecord> {
  try {
    const res = await apiClient.put(`/sports/injuries/${id}`, input);
    toast.success('Injury updated');
    return unwrapResponse<InjuryRecord>(res);
  } catch (err: unknown) {
    const message =
      (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      ?? 'Failed to update injury';
    toast.error(message);
    throw err;
  }
}

export async function deleteInjury(id: string): Promise<void> {
  try {
    await apiClient.delete(`/sports/injuries/${id}`);
    toast.success('Injury deleted');
  } catch (err: unknown) {
    const message =
      (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      ?? 'Failed to delete injury';
    toast.error(message);
    throw err;
  }
}

export function useRecoveryLogs(injuryId: string | null) {
  const [logs, setLogs] = useState<RecoveryLog[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = useCallback(async () => {
    if (!injuryId) {
      setLogs([]);
      return;
    }
    try {
      setLoading(true);
      const res = await apiClient.get(`/sports/injuries/${injuryId}/recovery-logs`);
      setLogs(unwrapList<RecoveryLog>(res));
    } catch {
      console.error('Failed to load recovery logs');
    } finally {
      setLoading(false);
    }
  }, [injuryId]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  return { logs, loading, refetch: fetchLogs };
}

export async function addRecoveryLog(
  injuryId: string,
  input: CreateRecoveryLogInput,
): Promise<RecoveryLog> {
  try {
    const res = await apiClient.post(`/sports/injuries/${injuryId}/recovery-logs`, input);
    toast.success('Recovery log added');
    return unwrapResponse<RecoveryLog>(res);
  } catch (err: unknown) {
    const message =
      (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      ?? 'Failed to add recovery log';
    toast.error(message);
    throw err;
  }
}

export async function getPlayerInjuries(studentId: string): Promise<InjuryRecord[]> {
  const res = await apiClient.get(`/sports/players/${studentId}/injuries`);
  return unwrapList<InjuryRecord>(res);
}
