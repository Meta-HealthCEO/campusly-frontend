import { useState, useEffect } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList, mapId } from '@/lib/api-helpers';
import { useCurrentStudent } from './useCurrentStudent';
import type { TimetableSlot } from '@/types';

interface StudentTimetableResult {
  timetable: TimetableSlot[];
  loading: boolean;
}

export function useStudentTimetable(): StudentTimetableResult {
  const { student, loading: studentLoading } = useCurrentStudent();
  const [timetable, setTimetable] = useState<TimetableSlot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!student) {
      if (!studentLoading) setLoading(false);
      return;
    }

    async function fetchTimetable() {
      try {
        const classRaw = student!.class ?? student!.classId;
        const classId = typeof classRaw === 'object' && classRaw !== null
          ? (classRaw as { _id?: string; id?: string })._id ?? (classRaw as { id?: string }).id ?? ''
          : (classRaw as string) ?? '';
        if (!classId) { setLoading(false); return; }

        const res = await apiClient.get(`/academic/timetable/class/${classId}`);
        const arr = unwrapList<Record<string, unknown>>(res, 'timetable');
        setTimetable(
          arr.map((s) => ({
            ...s,
            id: (s._id as string) ?? (s.id as string) ?? `${s.day}-${s.period}`,
          })) as unknown as TimetableSlot[]
        );
      } catch {
        console.error('Failed to load timetable');
      } finally {
        setLoading(false);
      }
    }

    fetchTimetable();
  }, [student, studentLoading]);

  return { timetable, loading: studentLoading || loading };
}
