import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { unwrapResponse, unwrapList } from '@/lib/api-helpers';
import { useAuthStore } from '@/stores/useAuthStore';
import type { TimetableSlot } from '@/types';
import type { TimetableConfig } from '@/types/timetable-builder';

type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';

export interface CreateSlotPayload {
  classId: string;
  day: DayOfWeek;
  period: number;
  startTime: string;
  endTime: string;
  subjectId: string;
  room?: string;
}

export function useTeacherTimetableManager() {
  const { user } = useAuthStore();
  const [timetable, setTimetable] = useState<TimetableSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<TimetableConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);

  const hasConfig = Boolean(config && config.periodTimes.length > 0);

  const fetchTimetable = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await apiClient.get(`/academic/timetable/teacher/${user.id}`);
      setTimetable(unwrapList<TimetableSlot>(res));
    } catch (err: unknown) {
      console.error('Failed to load timetable', err);
      toast.error('Could not load timetable.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await apiClient.get('/timetable-builder/config');
      setConfig(unwrapResponse<TimetableConfig>(res));
    } catch (err: unknown) {
      console.error('Failed to load timetable config', err);
      setConfig(null);
    } finally {
      setConfigLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTimetable();
    fetchConfig();
  }, [fetchTimetable, fetchConfig]);

  const saveConfig = useCallback(async (data: Partial<TimetableConfig>) => {
    try {
      const res = await apiClient.put('/timetable-builder/config', data);
      const saved = unwrapResponse<TimetableConfig>(res);
      setConfig(saved);
      toast.success('Period configuration saved');
    } catch (err: unknown) {
      console.error('Failed to save config', err);
      toast.error('Failed to save configuration.');
      throw err;
    }
  }, []);

  const createSlot = useCallback(async (data: CreateSlotPayload) => {
    try {
      await apiClient.post('/academic/timetable', {
        ...data,
        teacherId: user?.id,
        schoolId: user?.schoolId,
      });
      toast.success('Timetable entry added');
      await fetchTimetable();
    } catch (err: unknown) {
      console.error('Failed to create slot', err);
      toast.error('Failed to add timetable entry.');
      throw err;
    }
  }, [user?.id, user?.schoolId, fetchTimetable]);

  const updateSlot = useCallback(async (id: string, data: Partial<CreateSlotPayload>) => {
    try {
      await apiClient.put(`/academic/timetable/${id}`, {
        ...data,
        teacherId: user?.id,
        schoolId: user?.schoolId,
      });
      toast.success('Timetable entry updated');
      await fetchTimetable();
    } catch (err: unknown) {
      console.error('Failed to update slot', err);
      toast.error('Failed to update timetable entry.');
      throw err;
    }
  }, [user?.id, user?.schoolId, fetchTimetable]);

  const deleteSlot = useCallback(async (id: string) => {
    try {
      await apiClient.delete(`/academic/timetable/${id}`);
      toast.success('Timetable entry removed');
      await fetchTimetable();
    } catch (err: unknown) {
      console.error('Failed to delete slot', err);
      toast.error('Failed to remove timetable entry.');
      throw err;
    }
  }, [fetchTimetable]);

  return {
    timetable, loading, config, configLoading, hasConfig,
    saveConfig, createSlot, updateSlot, deleteSlot,
    refetch: fetchTimetable,
  };
}
