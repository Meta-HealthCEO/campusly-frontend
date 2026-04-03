import { useState } from 'react';
import apiClient from '@/lib/api-client';
import type {
  TeacherClassroomStats,
  ClassEngagementStats,
  SessionAttendanceRecord,
} from '@/types';

export function useClassroomAnalytics() {
  const [teacherStats, setTeacherStats] = useState<TeacherClassroomStats | null>(null);
  const [classStats, setClassStats] = useState<ClassEngagementStats | null>(null);
  const [attendance, setAttendance] = useState<SessionAttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTeacherStats = async (teacherId: string): Promise<void> => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/classroom/analytics/teacher/${teacherId}`);
      const raw = response.data.data ?? response.data;
      setTeacherStats(raw as TeacherClassroomStats);
    } catch (err: unknown) {
      console.error('Failed to fetch teacher classroom stats', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchClassStats = async (classId: string): Promise<void> => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/classroom/analytics/class/${classId}`);
      const raw = response.data.data ?? response.data;
      setClassStats(raw as ClassEngagementStats);
    } catch (err: unknown) {
      console.error('Failed to fetch class engagement stats', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async (sessionId: string): Promise<void> => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/classroom/sessions/${sessionId}/attendance`);
      const raw = response.data.data ?? response.data;
      setAttendance(Array.isArray(raw) ? raw : raw.data ?? []);
    } catch (err: unknown) {
      console.error('Failed to fetch session attendance', err);
    } finally {
      setLoading(false);
    }
  };

  return {
    teacherStats,
    classStats,
    attendance,
    loading,
    fetchTeacherStats,
    fetchClassStats,
    fetchAttendance,
  };
}
