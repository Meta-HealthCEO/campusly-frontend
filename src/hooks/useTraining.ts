'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { useAuthStore } from '@/stores/useAuthStore';
import { unwrapResponse, unwrapList } from '@/lib/api-helpers';
import type {
  TrainingSession,
  TrainingAttendance,
  CreateTrainingSessionInput,
  UpdateTrainingSessionInput,
  AttendanceEntry,
  PlayerAttendanceSummary,
  DrillTemplate,
  CreateDrillTemplateInput,
} from '@/types/training';

interface ListParams {
  teamId?: string;
  studentId?: string;
  from?: string;
  to?: string;
  status?: string;
}

export function useTrainingSessions(params: ListParams = {}) {
  const user = useAuthStore((s) => s.user);
  const schoolId = user?.schoolId ?? '';
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [loading, setLoading] = useState(true);

  const paramKey = JSON.stringify(params);

  const fetchSessions = useCallback(async () => {
    if (!schoolId) return;
    try {
      setLoading(true);
      const res = await apiClient.get('/sports/training/sessions', { params });
      setSessions(unwrapList<TrainingSession>(res));
    } catch {
      console.error('Failed to load training sessions');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId, paramKey]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  return { sessions, loading, refetch: fetchSessions };
}

export async function createTrainingSession(
  input: CreateTrainingSessionInput,
): Promise<TrainingSession> {
  try {
    const res = await apiClient.post('/sports/training/sessions', input);
    toast.success('Training session created');
    return unwrapResponse<TrainingSession>(res);
  } catch (err: unknown) {
    const message =
      (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      ?? 'Failed to create session';
    toast.error(message);
    throw err;
  }
}

export async function updateTrainingSession(
  id: string,
  input: UpdateTrainingSessionInput,
): Promise<TrainingSession> {
  try {
    const res = await apiClient.put(`/sports/training/sessions/${id}`, input);
    toast.success('Training session updated');
    return unwrapResponse<TrainingSession>(res);
  } catch (err: unknown) {
    const message =
      (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      ?? 'Failed to update session';
    toast.error(message);
    throw err;
  }
}

export async function deleteTrainingSession(id: string): Promise<void> {
  try {
    await apiClient.delete(`/sports/training/sessions/${id}`);
    toast.success('Training session deleted');
  } catch (err: unknown) {
    const message =
      (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      ?? 'Failed to delete session';
    toast.error(message);
    throw err;
  }
}

export function useTrainingAttendance(sessionId: string | null) {
  const [records, setRecords] = useState<TrainingAttendance[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAttendance = useCallback(async () => {
    if (!sessionId) {
      setRecords([]);
      return;
    }
    try {
      setLoading(true);
      const res = await apiClient.get(`/sports/training/sessions/${sessionId}/attendance`);
      setRecords(unwrapList<TrainingAttendance>(res));
    } catch {
      console.error('Failed to load attendance');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { fetchAttendance(); }, [fetchAttendance]);

  return { records, loading, refetch: fetchAttendance };
}

export async function recordAttendance(
  sessionId: string,
  attendance: AttendanceEntry[],
): Promise<TrainingAttendance[]> {
  try {
    const res = await apiClient.post(
      `/sports/training/sessions/${sessionId}/attendance`,
      { attendance },
    );
    toast.success('Attendance recorded');
    return unwrapList<TrainingAttendance>(res);
  } catch (err: unknown) {
    const message =
      (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      ?? 'Failed to record attendance';
    toast.error(message);
    throw err;
  }
}

export async function getPlayerAttendanceSummary(
  studentId: string,
  from?: string,
  to?: string,
): Promise<PlayerAttendanceSummary> {
  const res = await apiClient.get(
    `/sports/training/players/${studentId}/attendance-summary`,
    { params: { from, to } },
  );
  return unwrapResponse<PlayerAttendanceSummary>(res);
}

export function useDrillTemplates(sport?: string) {
  const user = useAuthStore((s) => s.user);
  const schoolId = user?.schoolId ?? '';
  const [drills, setDrills] = useState<DrillTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDrills = useCallback(async () => {
    if (!schoolId) return;
    try {
      setLoading(true);
      const res = await apiClient.get('/sports/training/drills', {
        params: sport ? { sport } : {},
      });
      setDrills(unwrapList<DrillTemplate>(res));
    } catch {
      console.error('Failed to load drill templates');
    } finally {
      setLoading(false);
    }
  }, [schoolId, sport]);

  useEffect(() => { fetchDrills(); }, [fetchDrills]);

  return { drills, loading, refetch: fetchDrills };
}

export async function createDrillTemplate(
  input: CreateDrillTemplateInput,
): Promise<DrillTemplate> {
  try {
    const res = await apiClient.post('/sports/training/drills', input);
    toast.success('Drill saved');
    return unwrapResponse<DrillTemplate>(res);
  } catch (err: unknown) {
    const message =
      (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      ?? 'Failed to save drill';
    toast.error(message);
    throw err;
  }
}

export async function deleteDrillTemplate(id: string): Promise<void> {
  try {
    await apiClient.delete(`/sports/training/drills/${id}`);
    toast.success('Drill deleted');
  } catch (err: unknown) {
    const message =
      (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      ?? 'Failed to delete drill';
    toast.error(message);
    throw err;
  }
}
