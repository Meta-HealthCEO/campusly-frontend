import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import { useAuthStore } from '@/stores/useAuthStore';
import { toISODate } from '@/lib/utils';
import type { ChronicAbsentee, AttendancePattern } from '@/types';
import type { SchoolClass, Student } from '@/types';

interface AttendanceReportStats {
  totalDays: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  presentPercentage: number;
}

function getMonthRange(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return { start: toISODate(start), end: toISODate(now) };
}

export function useTeacherAttendanceReport() {
  const { user } = useAuthStore();

  const [homeClass, setHomeClass] = useState<SchoolClass | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [report, setReport] = useState<AttendanceReportStats | null>(null);
  const [chronicAbsentees, setChronicAbsentees] = useState<ChronicAbsentee[]>([]);
  const [patterns, setPatterns] = useState<AttendancePattern | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingAbsentees, setLoadingAbsentees] = useState(false);
  const [loadingPatterns, setLoadingPatterns] = useState(false);

  const defaultRange = getMonthRange();
  const [startDate, setStartDate] = useState(defaultRange.start);
  const [endDate, setEndDate] = useState(defaultRange.end);
  const [threshold, setThreshold] = useState(80);

  // ── Find home class (via teaching-load endpoint) ─────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    async function findHomeClass() {
      try {
        const res = await apiClient.get('/academic/teacher/me/teaching-load');
        if (cancelled) return;
        const data = unwrapResponse<{
          homeroom: { class: SchoolClass; students: Student[] } | null;
          subjectClasses: unknown[];
        }>(res);

        const mine = data.homeroom?.class ?? null;
        setHomeClass(mine);

        if (mine) {
          setStudents(data.homeroom?.students ?? []);
        }
      } catch (err: unknown) {
        if (cancelled) return;
        console.error('Failed to find home class', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    findHomeClass();
    return () => { cancelled = true; };
  }, [user?.id]);

  // ── Load report stats ────────────────────────────────────────────────────
  const loadReport = useCallback(
    async (start: string, end: string) => {
      if (!homeClass || !user?.schoolId) return;
      setLoading(true);
      try {
        const res = await apiClient.get('/attendance/report', {
          params: {
            startDate: start,
            endDate: end,
            classId: homeClass.id,
          },
        });
        const raw = unwrapResponse<{
          totalDays: number;
          present: number;
          absent: number;
          late: number;
          excused: number;
          attendancePercentage: number;
        }>(res);

        setReport({
          totalDays: raw.totalDays,
          presentCount: raw.present,
          absentCount: raw.absent,
          lateCount: raw.late,
          excusedCount: raw.excused,
          presentPercentage: raw.attendancePercentage,
        });
      } catch (err: unknown) {
        console.error('Failed to load attendance report', err);
        setReport(null);
      } finally {
        setLoading(false);
      }
    },
    [homeClass, user?.schoolId],
  );

  // ── Load chronic absentees (filtered to teacher's class) ─────────────────
  const loadChronicAbsentees = useCallback(
    async (thresh: number) => {
      if (!homeClass) return;
      setLoadingAbsentees(true);
      try {
        const res = await apiClient.get('/attendance/chronic-absentees', {
          params: { threshold: thresh },
        });
        const raw = unwrapResponse(res);
        const all = Array.isArray(raw) ? (raw as ChronicAbsentee[]) : [];
        // Filter to teacher's class only
        const filtered = all.filter(
          (a) => a.className === homeClass.name,
        );
        setChronicAbsentees(filtered);
      } catch (err: unknown) {
        console.error('Failed to load chronic absentees', err);
        setChronicAbsentees([]);
      } finally {
        setLoadingAbsentees(false);
      }
    },
    [homeClass],
  );

  // ── Load patterns for a single student ───────────────────────────────────
  const loadPatterns = useCallback(async (studentId: string) => {
    setLoadingPatterns(true);
    try {
      const res = await apiClient.get(
        `/attendance/student/${studentId}/patterns`,
      );
      const data = unwrapResponse<AttendancePattern>(res);
      setPatterns(data);
    } catch (err: unknown) {
      console.error('Failed to load attendance patterns', err);
      setPatterns(null);
    } finally {
      setLoadingPatterns(false);
    }
  }, []);

  // ── Auto-load report + absentees when home class is ready ────────────────
  useEffect(() => {
    if (!homeClass) return;
    loadReport(startDate, endDate);
    loadChronicAbsentees(threshold);
  }, [homeClass, startDate, endDate, threshold, loadReport, loadChronicAbsentees]);

  // ── Date range handler ───────────────────────────────────────────────────
  const setDateRange = useCallback(
    (start: string, end: string) => {
      setStartDate(start);
      setEndDate(end);
    },
    [],
  );

  const changeThreshold = useCallback(
    (t: number) => {
      setThreshold(t);
    },
    [],
  );

  return {
    homeClass,
    students,
    report,
    chronicAbsentees,
    patterns,
    loading,
    loadingAbsentees,
    loadingPatterns,
    startDate,
    endDate,
    threshold,
    setDateRange,
    changeThreshold,
    loadReport,
    loadChronicAbsentees,
    loadPatterns,
  };
}
