import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { useAuthStore } from '@/stores/useAuthStore';

export interface DailyClassSummary {
  classId: string;
  className: string;
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
}

export interface AbsenteeRecord {
  _id: string;
  studentId:
    | {
        _id: string;
        admissionNumber?: string;
        userId?: { firstName?: string; lastName?: string };
      }
    | string;
  classId: { _id: string; name?: string } | string;
  date: string;
  period: number;
  status: string;
}

export function useAdminAttendance(selectedDate: string) {
  const { user } = useAuthStore();
  const [dailyReport, setDailyReport] = useState<DailyClassSummary[]>([]);
  const [absentees, setAbsentees] = useState<AbsenteeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const dateISO = new Date(selectedDate).toISOString();
      const [dailyRes, absenteesRes] = await Promise.allSettled([
        apiClient.get(`/attendance/daily/${dateISO}`),
        apiClient.get('/attendance/absentees', {
          params: { date: dateISO, schoolId: user?.schoolId },
        }),
      ]);

      if (dailyRes.status === 'fulfilled') {
        const raw = dailyRes.value.data.data ?? dailyRes.value.data;
        setDailyReport(
          Array.isArray(raw)
            ? (raw as DailyClassSummary[])
            : ((raw as Record<string, unknown>).data as DailyClassSummary[]) ??
                [],
        );
      }

      if (absenteesRes.status === 'fulfilled') {
        const raw =
          absenteesRes.value.data.data ?? absenteesRes.value.data;
        setAbsentees(
          Array.isArray(raw)
            ? (raw as AbsenteeRecord[])
            : ((raw as Record<string, unknown>).data as AbsenteeRecord[]) ??
                [],
        );
      }
    } catch {
      console.error('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, user?.schoolId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { dailyReport, absentees, loading };
}
