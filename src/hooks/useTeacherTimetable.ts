import { useState, useEffect } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList } from '@/lib/api-helpers';
import { useAuthStore } from '@/stores/useAuthStore';
import type { TimetableSlot } from '@/types';

export function useTeacherTimetable() {
  const { user } = useAuthStore();
  const [timetable, setTimetable] = useState<TimetableSlot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    const teacherId = user.id;
    async function fetchTimetable() {
      try {
        const res = await apiClient.get(
          `/academic/timetable/teacher/${teacherId}`,
        );
        const arr = unwrapList<TimetableSlot>(res);
        setTimetable(arr);
      } catch {
        console.error('Failed to load timetable');
      } finally {
        setLoading(false);
      }
    }
    fetchTimetable();
  }, [user?.id]);

  return { timetable, loading };
}
