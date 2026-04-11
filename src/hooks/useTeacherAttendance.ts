import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList, extractErrorMessage, resolveId } from '@/lib/api-helpers';
import { useAuthStore } from '@/stores/useAuthStore';
import { toast } from 'sonner';
import type { Student, SchoolClass } from '@/types';

export type AttendanceStatus = 'present' | 'absent' | 'late';

interface AttendanceRecord {
  studentId: string;
  status: AttendanceStatus;
}

interface RawAttendanceRecord {
  studentId: string | { id?: string; _id?: string };
  status: AttendanceStatus;
}

function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const today = toISODate(new Date());

export function useTeacherAttendance() {
  const { user } = useAuthStore();
  const [homeClass, setHomeClass] = useState<SchoolClass | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedDate, setSelectedDate] = useState(today);
  const [attendance, setAttendance] = useState<Map<string, AttendanceStatus>>(new Map());
  const [existingLoaded, setExistingLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // ── Initial load: find home class + fetch its students ──────────────────
  useEffect(() => {
    if (!user?.id) return;

    async function init() {
      setLoading(true);
      try {
        const classesRes = await apiClient.get('/academic/classes');
        const allClasses = unwrapList<SchoolClass>(classesRes);
        const mine = allClasses.find(
          (c) => resolveId(c.teacherId as string | { id?: string; _id?: string } | undefined) === user!.id,
        ) ?? null;
        setHomeClass(mine);

        if (!mine) return;

        const studentsRes = await apiClient.get('/students');
        const allStudents = unwrapList<Student>(studentsRes);
        const homeStudents = allStudents.filter(
          (s) => resolveId(s.classId as string | { id?: string; _id?: string } | undefined) === mine.id,
        );
        setStudents(homeStudents);

        await loadExistingAttendance(mine.id, today, homeStudents);
      } catch (err: unknown) {
        console.error('Failed to load attendance data', err);
        toast.error('Could not load attendance data. Please refresh.');
      } finally {
        setLoading(false);
      }
    }

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // ── Load existing attendance for a given date ────────────────────────────
  const loadExistingAttendance = useCallback(
    async (classId: string, date: string, homeStudents: Student[]) => {
      try {
        const res = await apiClient.get(`/attendance/class/${classId}`, {
          params: { date },
        });
        const raw = res.data?.data ?? res.data;
        const records: RawAttendanceRecord[] = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.records)
          ? raw.records
          : [];

        if (records.length > 0) {
          const map = new Map<string, AttendanceStatus>();
          records.forEach((r) => {
            const sid = resolveId(r.studentId);
            if (sid) map.set(sid, r.status);
          });
          setAttendance(map);
          setExistingLoaded(true);
        } else {
          // Default all to present
          const map = new Map<string, AttendanceStatus>();
          homeStudents.forEach((s) => map.set(s.id, 'present'));
          setAttendance(map);
          setExistingLoaded(false);
        }
      } catch {
        // If endpoint errors, default all to present
        const map = new Map<string, AttendanceStatus>();
        homeStudents.forEach((s) => map.set(s.id, 'present'));
        setAttendance(map);
        setExistingLoaded(false);
      }
    },
    [],
  );

  // ── Date change ─────────────────────────────────────────────────────────
  const changeDate = useCallback(
    async (date: string) => {
      setSelectedDate(date);
      setSaved(false);
      setExistingLoaded(false);
      if (homeClass) {
        await loadExistingAttendance(homeClass.id, date, students);
      }
    },
    [homeClass, students, loadExistingAttendance],
  );

  // ── Status mutations ─────────────────────────────────────────────────────
  const updateStatus = useCallback((studentId: string, status: AttendanceStatus) => {
    setAttendance((prev) => {
      const next = new Map(prev);
      next.set(studentId, status);
      return next;
    });
    setSaved(false);
  }, []);

  const markAllPresent = useCallback(() => {
    setAttendance((prev) => {
      const next = new Map(prev);
      students.forEach((s) => next.set(s.id, 'present'));
      return next;
    });
    setSaved(false);
  }, [students]);

  // ── Save ─────────────────────────────────────────────────────────────────
  const saveAttendance = useCallback(async () => {
    if (!user?.schoolId) {
      toast.error('School information not available');
      return;
    }
    if (!homeClass) {
      toast.error('No home class assigned');
      return;
    }
    if (students.length === 0) {
      toast.error('No students to mark attendance for');
      return;
    }
    if (selectedDate > today) {
      toast.error('Cannot record attendance for a future date');
      return;
    }

    const records: AttendanceRecord[] = students.map((s) => ({
      studentId: s.id,
      status: attendance.get(s.id) ?? 'present',
    }));

    setSaving(true);
    try {
      await apiClient.post('/attendance/bulk', {
        classId: homeClass.id,
        schoolId: user.schoolId,
        date: `${selectedDate}T00:00:00.000Z`,
        period: 1,
        records,
      });
      setSaved(true);
      setExistingLoaded(true);
      toast.success(`Attendance saved for ${selectedDate}`);
    } catch (err: unknown) {
      const msg = extractErrorMessage(err, '');
      toast.error(msg || 'Failed to save attendance. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [user?.schoolId, homeClass, students, selectedDate, attendance]);

  return {
    homeClass,
    students,
    selectedDate,
    attendance,
    existingLoaded,
    saving,
    saved,
    loading,
    changeDate,
    updateStatus,
    markAllPresent,
    saveAttendance,
  };
}
