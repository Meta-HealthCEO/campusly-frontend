import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse, unwrapList } from '@/lib/api-helpers';
import { toast } from 'sonner';
import type {
  TimetableConfig,
  TeacherAvailability,
  TeacherAvailabilityEntry,
} from '@/types';

const DEFAULT_CONFIG: Omit<TimetableConfig, 'id'> = {
  periodsPerDay: { monday: 7, tuesday: 7, wednesday: 7, thursday: 7, friday: 7 },
  periodTimes: Array.from({ length: 7 }, (_, i) => ({
    period: i + 1,
    startTime: `${String(7 + Math.floor((i * 45 + i * 5) / 60)).padStart(2, '0')}:${String((45 + (i * 50)) % 60).padStart(2, '0')}`,
    endTime: `${String(7 + Math.floor(((i + 1) * 45 + i * 5) / 60)).padStart(2, '0')}:${String(((i + 1) * 45 + i * 5) % 60).padStart(2, '0')}`,
  })),
  breakSlots: [{ afterPeriod: 3, duration: 30, label: 'Break' }],
  academicYear: new Date().getFullYear(),
  term: 1,
};

export function useTimetableConfig() {
  const [config, setConfig] = useState<TimetableConfig | null>(null);
  const [availability, setAvailability] = useState<TeacherAvailability[]>([]);
  const [loading, setLoading] = useState(false);

  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/timetable-builder/config');
      setConfig(unwrapResponse<TimetableConfig>(res));
    } catch {
      console.error('Failed to load timetable config');
    } finally {
      setLoading(false);
    }
  }, []);

  const saveConfig = useCallback(async (data: Partial<TimetableConfig>) => {
    try {
      const res = await apiClient.put('/timetable-builder/config', data);
      const saved = unwrapResponse<TimetableConfig>(res);
      setConfig(saved);
      toast.success('Period configuration saved');
      return saved;
    } catch (err: unknown) {
      toast.error('Failed to save configuration');
      throw err;
    }
  }, []);

  const loadAvailability = useCallback(async () => {
    try {
      const res = await apiClient.get('/timetable-builder/availability');
      setAvailability(unwrapList<TeacherAvailability>(res));
    } catch {
      console.error('Failed to load teacher availability');
    }
  }, []);

  const saveAvailability = useCallback(
    async (teacherId: string, unavailable: TeacherAvailabilityEntry[]) => {
      try {
        await apiClient.put(`/timetable-builder/availability/${teacherId}`, {
          unavailable,
        });
        toast.success('Availability saved');
        await loadAvailability();
      } catch (err: unknown) {
        toast.error('Failed to save availability');
        throw err;
      }
    },
    [loadAvailability],
  );

  const applyDefaults = useCallback(() => {
    setConfig((prev) =>
      prev
        ? { ...prev, ...DEFAULT_CONFIG }
        : { id: '', ...DEFAULT_CONFIG },
    );
  }, []);

  return {
    config,
    availability,
    loading,
    loadConfig,
    saveConfig,
    loadAvailability,
    saveAvailability,
    applyDefaults,
  };
}
