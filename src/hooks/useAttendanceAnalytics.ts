import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import type { ChronicAbsentee, AttendancePattern } from '@/types';

export function useAttendanceAnalytics() {
  const [chronicAbsentees, setChronicAbsentees] = useState<ChronicAbsentee[]>([]);
  const [loadingAbsentees, setLoadingAbsentees] = useState(false);
  const [attendancePatterns, setAttendancePatterns] = useState<AttendancePattern | null>(null);
  const [loadingPatterns, setLoadingPatterns] = useState(false);

  const loadChronicAbsentees = useCallback(async (threshold = 80) => {
    try {
      setLoadingAbsentees(true);
      const res = await apiClient.get('/attendance/chronic-absentees', {
        params: { threshold },
      });
      const raw = unwrapResponse(res);
      setChronicAbsentees(
        Array.isArray(raw) ? (raw as ChronicAbsentee[]) : [],
      );
    } catch (err: unknown) {
      console.error('Failed to load chronic absentees', err);
      setChronicAbsentees([]);
    } finally {
      setLoadingAbsentees(false);
    }
  }, []);

  const loadPatterns = useCallback(async (studentId: string) => {
    try {
      setLoadingPatterns(true);
      const res = await apiClient.get(`/attendance/student/${studentId}/patterns`);
      const data = unwrapResponse<AttendancePattern>(res);
      setAttendancePatterns(data);
    } catch (err: unknown) {
      console.error('Failed to load attendance patterns', err);
      setAttendancePatterns(null);
    } finally {
      setLoadingPatterns(false);
    }
  }, []);

  return {
    chronicAbsentees,
    loadingAbsentees,
    loadChronicAbsentees,
    attendancePatterns,
    loadingPatterns,
    loadPatterns,
  };
}
