import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import type { AttendanceStats } from '@/types';

export function useAttendanceStats() {
  const [studentStats, setStudentStats] = useState<AttendanceStats | null>(null);
  const [classStats, setClassStats] = useState<AttendanceStats[]>([]);
  const [chronicAbsentees, setChronicAbsentees] = useState<AttendanceStats[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchStudentStats = useCallback(async (studentId: string): Promise<void> => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/attendance/stats/student/${studentId}`);
      const data = unwrapResponse<AttendanceStats | null>(res);
      setStudentStats(data);
    } catch (err: unknown) {
      console.error('Failed to load student attendance stats', err);
      setStudentStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchClassStats = useCallback(async (classId: string): Promise<void> => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/attendance/stats/class/${classId}`);
      const raw = unwrapResponse(res);
      setClassStats(Array.isArray(raw) ? (raw as AttendanceStats[]) : []);
    } catch (err: unknown) {
      console.error('Failed to load class attendance stats', err);
      setClassStats([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchChronicAbsentees = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const res = await apiClient.get('/attendance/stats/chronic-absentees');
      const raw = unwrapResponse(res);
      setChronicAbsentees(Array.isArray(raw) ? (raw as AttendanceStats[]) : []);
    } catch (err: unknown) {
      console.error('Failed to load chronic absentees stats', err);
      setChronicAbsentees([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    studentStats,
    classStats,
    chronicAbsentees,
    loading,
    fetchStudentStats,
    fetchClassStats,
    fetchChronicAbsentees,
  };
}
