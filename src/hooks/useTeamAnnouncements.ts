'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { useAuthStore } from '@/stores/useAuthStore';
import { unwrapResponse, unwrapList } from '@/lib/api-helpers';
import type {
  TeamAnnouncement,
  CreateTeamAnnouncementInput,
  UpdateTeamAnnouncementInput,
} from '@/types/team-announcement';

interface ListFilters {
  teamId?: string;
  studentId?: string;
  pinned?: boolean;
}

export function useTeamAnnouncements(filters: ListFilters = {}) {
  const user = useAuthStore((s) => s.user);
  const schoolId = user?.schoolId ?? '';
  const [announcements, setAnnouncements] = useState<TeamAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const paramKey = JSON.stringify(filters);

  const fetchAnnouncements = useCallback(async () => {
    if (!schoolId) return;
    try {
      setLoading(true);
      const res = await apiClient.get('/sports/announcements', { params: filters });
      setAnnouncements(unwrapList<TeamAnnouncement>(res));
    } catch {
      console.error('Failed to load team announcements');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId, paramKey]);

  useEffect(() => { fetchAnnouncements(); }, [fetchAnnouncements]);

  return { announcements, loading, refetch: fetchAnnouncements };
}

export async function createTeamAnnouncement(
  input: CreateTeamAnnouncementInput,
): Promise<TeamAnnouncement> {
  try {
    const res = await apiClient.post('/sports/announcements', input);
    toast.success('Announcement published');
    return unwrapResponse<TeamAnnouncement>(res);
  } catch (err: unknown) {
    const message =
      (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      ?? 'Failed to publish announcement';
    toast.error(message);
    throw err;
  }
}

export async function updateTeamAnnouncement(
  id: string,
  input: UpdateTeamAnnouncementInput,
): Promise<TeamAnnouncement> {
  try {
    const res = await apiClient.put(`/sports/announcements/${id}`, input);
    toast.success('Announcement updated');
    return unwrapResponse<TeamAnnouncement>(res);
  } catch (err: unknown) {
    const message =
      (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      ?? 'Failed to update announcement';
    toast.error(message);
    throw err;
  }
}

export async function deleteTeamAnnouncement(id: string): Promise<void> {
  try {
    await apiClient.delete(`/sports/announcements/${id}`);
    toast.success('Announcement deleted');
  } catch (err: unknown) {
    const message =
      (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      ?? 'Failed to delete announcement';
    toast.error(message);
    throw err;
  }
}
