import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse, unwrapList, extractErrorMessage } from '@/lib/api-helpers';
import { toast } from 'sonner';
import type { StudentLevel, BadgeDefinition } from '@/types';

interface UseGamificationOptions {
  studentId?: string;
  autoLoad?: boolean;
}

export function useGamification(options: UseGamificationOptions = {}) {
  const { studentId, autoLoad = true } = options;
  const [level, setLevel] = useState<StudentLevel | null>(null);
  const [leaderboard, setLeaderboard] = useState<StudentLevel[]>([]);
  const [badgeDefinitions, setBadgeDefinitions] = useState<BadgeDefinition[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLevel = useCallback(async (sid: string) => {
    try {
      const res = await apiClient.get(`/achiever/gamification/level?studentId=${sid}`);
      const data = unwrapResponse<StudentLevel>(res);
      setLevel({ ...data, id: (data as unknown as { _id?: string })._id ?? data.id ?? '' });
    } catch (err: unknown) {
      console.error('Failed to fetch student level', extractErrorMessage(err));
    }
  }, []);

  const fetchLeaderboard = useCallback(async (params?: {
    gradeId?: string;
    classId?: string;
    limit?: number;
  }) => {
    try {
      const query = new URLSearchParams();
      if (params?.gradeId) query.set('gradeId', params.gradeId);
      if (params?.classId) query.set('classId', params.classId);
      if (params?.limit) query.set('limit', String(params.limit));
      const res = await apiClient.get(`/achiever/gamification/leaderboard?${query.toString()}`);
      const data = unwrapList<StudentLevel>(res);
      setLeaderboard(data.map((d) => ({
        ...d,
        id: (d as unknown as { _id?: string })._id ?? d.id ?? '',
      })));
    } catch (err: unknown) {
      console.error('Failed to fetch leaderboard', extractErrorMessage(err));
    }
  }, []);

  const fetchBadgeDefinitions = useCallback(async () => {
    try {
      const res = await apiClient.get('/achiever/gamification/badges');
      const data = unwrapList<BadgeDefinition>(res);
      setBadgeDefinitions(data);
    } catch (err: unknown) {
      console.error('Failed to fetch badge definitions', extractErrorMessage(err));
    }
  }, []);

  const checkBadges = useCallback(async (sid: string) => {
    try {
      const res = await apiClient.post('/achiever/gamification/check-badges', { studentId: sid });
      const data = unwrapResponse<{ awarded: string[] }>(res);
      if (data.awarded.length > 0) {
        toast.success(`New badges earned: ${data.awarded.length}`);
        // Refresh level to get updated badges
        await fetchLevel(sid);
      }
      return data.awarded;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to check badges'));
      return [];
    }
  }, [fetchLevel]);

  useEffect(() => {
    if (!autoLoad) {
      setLoading(false);
      return;
    }

    async function load() {
      const promises: Promise<void>[] = [fetchBadgeDefinitions(), fetchLeaderboard()];
      if (studentId) promises.push(fetchLevel(studentId));
      await Promise.allSettled(promises);
      setLoading(false);
    }

    load();
  }, [autoLoad, studentId, fetchBadgeDefinitions, fetchLeaderboard, fetchLevel]);

  return {
    level,
    leaderboard,
    badgeDefinitions,
    loading,
    fetchLevel,
    fetchLeaderboard,
    fetchBadgeDefinitions,
    checkBadges,
  };
}
