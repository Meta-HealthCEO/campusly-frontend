import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { unwrapList, unwrapResponse } from '@/lib/api-helpers';
import { useAuthStore } from '@/stores/useAuthStore';
import type { Homework, TimetableSlot } from '@/types';

interface AbsentRecord {
  id: string;
  studentName: string;
}

interface HomeworkWithCount {
  id: string;
  title: string;
  subjectName: string;
  totalSubmissions: number;
  gradedCount: number;
}

interface DashboardData {
  timetable: TimetableSlot[];
  pendingHomework: HomeworkWithCount[];
  absentToday: AbsentRecord[];
  classCount: number;
  ungradedCount: number;
  loading: boolean;
  refreshing: boolean;
  refresh: () => Promise<void>;
}

export function useTeacherDashboard(): DashboardData {
  const { user } = useAuthStore();
  const [timetable, setTimetable] = useState<TimetableSlot[]>([]);
  const [pendingHomework, setPendingHomework] = useState<HomeworkWithCount[]>([]);
  const [absentToday, setAbsentToday] = useState<AbsentRecord[]>([]);
  const [classCount, setClassCount] = useState(0);
  const [ungradedCount, setUngradedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const today = new Date()
        .toLocaleDateString('en-US', { weekday: 'long' })
        .toLowerCase();

      const [timetableRes, homeworkRes, absentRes, classesRes] =
        await Promise.allSettled([
          apiClient.get(`/academic/timetable/teacher/${user.id}`),
          apiClient.get('/homework'),
          apiClient.get('/attendance/absentees', { params: { date: new Date().toISOString() } }),
          apiClient.get('/academic/classes'),
        ]);

      // Timetable
      if (timetableRes.status === 'fulfilled') {
        const raw = unwrapResponse(timetableRes.value);
        const arr = Array.isArray(raw)
          ? raw
          : ((raw as Record<string, unknown>).timetable ??
              (raw as Record<string, unknown>).data ??
              []) as Record<string, unknown>[];
        const todaySlots = (arr as Record<string, unknown>[])
          .filter((s) => (s.day as string) === today)
          .sort(
            (a, b) => (a.period as number) - (b.period as number),
          );
        setTimetable(todaySlots as unknown as TimetableSlot[]);
      }

      // Homework + submission counts (fetched in parallel)
      if (homeworkRes.status === 'fulfilled') {
        const arr = unwrapList<Homework>(homeworkRes.value);
        const myHomework = arr.filter((hw) => hw.teacherId === user.id);

        const submissionResults = await Promise.allSettled(
          myHomework.map((hw) =>
            apiClient.get(`/homework/${hw.id}/submissions`),
          ),
        );

        let totalUngraded = 0;
        const withCounts: HomeworkWithCount[] = [];

        myHomework.forEach((hw, idx) => {
          const result = submissionResults[idx];
          if (result.status !== 'fulfilled') return;

          const subs = unwrapList<Record<string, unknown>>(result.value);
          const submitted = subs.filter((s) => s.status === 'submitted').length;
          const graded = subs.filter(
            (s) => s.grade !== undefined && s.grade !== null,
          ).length;
          totalUngraded += submitted;
          if (submitted > 0) {
            withCounts.push({
              id: hw.id,
              title: hw.title,
              subjectName: hw.subject?.name ?? hw.subjectName ?? '',
              totalSubmissions: subs.length,
              gradedCount: graded,
            });
          }
        });

        setPendingHomework(withCounts);
        setUngradedCount(totalUngraded);
      }

      // Absentees
      if (absentRes.status === 'fulfilled') {
        const arr = unwrapList<Record<string, unknown>>(absentRes.value);
        setAbsentToday(
          arr.map((a) => ({
            id: (a.id as string) ?? '',
            studentName: `${
              (a.studentName as string) ??
              ((a.student as Record<string, unknown>)?.user as Record<string, unknown>)
                ?.firstName ??
              ''
            } ${
              ((a.student as Record<string, unknown>)?.user as Record<string, unknown>)
                ?.lastName ?? ''
            }`.trim(),
          })),
        );
      }

      // Classes count
      if (classesRes.status === 'fulfilled') {
        const arr = unwrapList<Record<string, unknown>>(classesRes.value);
        const myClasses = arr.filter(
          (c) => (c.teacherId as string) === user.id,
        );
        setClassCount(myClasses.length);
      }
    } catch (err: unknown) {
      console.error('Failed to load teacher dashboard', err);
      toast.error('Could not load dashboard. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchData();
    } finally {
      setRefreshing(false);
    }
  }, [fetchData]);

  return {
    timetable,
    pendingHomework,
    absentToday,
    classCount,
    ungradedCount,
    loading,
    refreshing,
    refresh,
  };
}

export type { AbsentRecord, HomeworkWithCount };
