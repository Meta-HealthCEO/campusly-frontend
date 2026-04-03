import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import { useAuthStore } from '@/stores/useAuthStore';
import type {
  SgbMeeting,
  CreateMeetingPayload,
  RecordMinutesPayload,
} from '@/types';

export function useSgbMeetings(statusFilter?: string) {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId ?? '';
  const [meetings, setMeetings] = useState<SgbMeeting[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMeetings = useCallback(async () => {
    if (!schoolId) return;
    try {
      setLoading(true);
      const params: Record<string, string> = { schoolId };
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
      const res = await apiClient.get('/sgb/meetings', { params });
      const raw = unwrapResponse(res);
      const arr = Array.isArray(raw) ? raw : (raw.meetings ?? raw.data ?? []);
      setMeetings(arr as SgbMeeting[]);
    } catch (err: unknown) {
      console.error('Failed to load SGB meetings', err);
    } finally {
      setLoading(false);
    }
  }, [schoolId, statusFilter]);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  return { meetings, loading, refetch: fetchMeetings, schoolId };
}

export function useSgbMeetingDetail(meetingId: string) {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId ?? '';
  const [meeting, setMeeting] = useState<SgbMeeting | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMeeting = useCallback(async () => {
    if (!schoolId || !meetingId) return;
    try {
      setLoading(true);
      const res = await apiClient.get(`/sgb/meetings/${meetingId}`);
      setMeeting(unwrapResponse<SgbMeeting>(res));
    } catch (err: unknown) {
      console.error('Failed to load meeting detail', err);
    } finally {
      setLoading(false);
    }
  }, [schoolId, meetingId]);

  useEffect(() => {
    fetchMeeting();
  }, [fetchMeeting]);

  return { meeting, loading, refetch: fetchMeeting };
}

export function useSgbMeetingMutations() {
  const createMeeting = async (payload: CreateMeetingPayload): Promise<SgbMeeting> => {
    const res = await apiClient.post('/sgb/meetings', payload);
    return unwrapResponse<SgbMeeting>(res);
  };

  const updateMeeting = async (id: string, data: Partial<CreateMeetingPayload>): Promise<SgbMeeting> => {
    const res = await apiClient.put(`/sgb/meetings/${id}`, data);
    return unwrapResponse<SgbMeeting>(res);
  };

  const deleteMeeting = async (id: string): Promise<void> => {
    await apiClient.delete(`/sgb/meetings/${id}`);
  };

  const recordMinutes = async (id: string, data: RecordMinutesPayload): Promise<SgbMeeting> => {
    const res = await apiClient.put(`/sgb/meetings/${id}/minutes`, data);
    return unwrapResponse<SgbMeeting>(res);
  };

  return { createMeeting, updateMeeting, deleteMeeting, recordMinutes };
}
