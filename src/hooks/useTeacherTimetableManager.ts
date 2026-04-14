import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { unwrapResponse, unwrapList } from '@/lib/api-helpers';
import { useAuthStore } from '@/stores/useAuthStore';
import type { TimetableSlot, DayOfWeek } from '@/types';
import type { TimetableConfig } from '@/types/timetable-builder';

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
  const [configError, setConfigError] = useState(false);
  const mutatingRef = useRef(false);

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
    setConfigLoading(true);
    try {
      const res = await apiClient.get('/timetable-builder/config');
      const data = unwrapResponse<TimetableConfig>(res);
      setConfig(data);
      setConfigError(false);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        setConfig(null);
        setConfigError(false);
      } else {
        console.error('Failed to load timetable config', err);
        setConfigError(true);
        setConfig(null);
      }
    } finally {
      setConfigLoading(false);
    }
  }, []);

  const retryConfig = useCallback(() => {
    setConfigError(false);
    fetchConfig();
  }, [fetchConfig]);

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
    if (mutatingRef.current) {
      toast.error('Please wait for the current operation to complete');
      return;
    }
    mutatingRef.current = true;
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
    } finally {
      mutatingRef.current = false;
    }
  }, [user?.id, user?.schoolId, fetchTimetable]);

  const updateSlot = useCallback(async (id: string, data: Partial<CreateSlotPayload>) => {
    if (mutatingRef.current) {
      toast.error('Please wait for the current operation to complete');
      return;
    }
    mutatingRef.current = true;
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
    } finally {
      mutatingRef.current = false;
    }
  }, [user?.id, user?.schoolId, fetchTimetable]);

  const deleteSlot = useCallback(async (id: string) => {
    if (mutatingRef.current) {
      toast.error('Please wait for the current operation to complete');
      return;
    }
    mutatingRef.current = true;
    try {
      await apiClient.delete(`/academic/timetable/${id}`);
      toast.success('Timetable entry removed');
      await fetchTimetable();
    } catch (err: unknown) {
      console.error('Failed to delete slot', err);
      toast.error('Failed to remove timetable entry.');
      throw err;
    } finally {
      mutatingRef.current = false;
    }
  }, [fetchTimetable]);

  return {
    timetable, loading, config, configLoading, hasConfig,
    configError, retryConfig,
    saveConfig, createSlot, updateSlot, deleteSlot,
    refetch: fetchTimetable,
  };
}
