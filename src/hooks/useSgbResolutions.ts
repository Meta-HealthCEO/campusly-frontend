import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import { useAuthStore } from '@/stores/useAuthStore';
import type {
  SgbResolution,
  CreateResolutionPayload,
  SgbVoteChoice,
} from '@/types';

interface ResolutionFilters {
  status?: string;
  meetingId?: string;
  category?: string;
}

export function useSgbResolutions(filters?: ResolutionFilters) {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId ?? '';
  const [resolutions, setResolutions] = useState<SgbResolution[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchResolutions = useCallback(async () => {
    if (!schoolId) return;
    try {
      setLoading(true);
      const params: Record<string, string> = { schoolId };
      if (filters?.status && filters.status !== 'all') params.status = filters.status;
      if (filters?.meetingId) params.meetingId = filters.meetingId;
      if (filters?.category && filters.category !== 'all') params.category = filters.category;
      const res = await apiClient.get('/sgb/resolutions', { params });
      const raw = unwrapResponse(res);
      const arr = Array.isArray(raw) ? raw : (raw.resolutions ?? raw.data ?? []);
      setResolutions(arr as SgbResolution[]);
    } catch (err: unknown) {
      console.error('Failed to load SGB resolutions', err);
    } finally {
      setLoading(false);
    }
  }, [schoolId, filters?.status, filters?.meetingId, filters?.category]);

  useEffect(() => {
    fetchResolutions();
  }, [fetchResolutions]);

  return { resolutions, loading, refetch: fetchResolutions };
}

export function useSgbResolutionMutations() {
  const createResolution = async (
    meetingId: string,
    payload: CreateResolutionPayload,
  ): Promise<SgbResolution> => {
    const res = await apiClient.post(`/sgb/meetings/${meetingId}/resolutions`, payload);
    return unwrapResponse<SgbResolution>(res);
  };

  const castVote = async (
    resolutionId: string,
    vote: SgbVoteChoice,
  ): Promise<{ votes: { for: number; against: number; abstain: number }; userVote: SgbVoteChoice }> => {
    const res = await apiClient.post(`/sgb/resolutions/${resolutionId}/vote`, { vote });
    return unwrapResponse(res);
  };

  return { createResolution, castVote };
}
