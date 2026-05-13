import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList, unwrapResponse, extractErrorMessage, resolveId } from '@/lib/api-helpers';
import { useAuthStore } from '@/stores/useAuthStore';
import { toast } from 'sonner';
import { toISODate } from '@/lib/utils';
import type { Student, SchoolClass } from '@/types';
import type { AttendanceEditHistoryEntry } from '@/types/attendance';

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface AttendanceEntry {
  status: AttendanceStatus;
  note?: string;
  editHistory?: AttendanceEditHistoryEntry[];
}

interface AttendanceRecord {
  studentId: string;
  status: AttendanceStatus;
  notes?: string;
}

interface RawAttendanceRecord {
  studentId: string | { id?: string; _id?: string };
  status: AttendanceStatus;
  notes?: string;
  period?: number;
  editHistory?: AttendanceEditHistoryEntry[];
}

const today = toISODate(new Date());

function recordsToAttendanceMap(records: RawAttendanceRecord[]): Map<string, AttendanceEntry> {
  const map = new Map<string, AttendanceEntry>();
  records.forEach((record) => {
    const sid = resolveId(record.studentId);
    if (!sid) return;
    map.set(sid, {
      status: record.status,
      note: record.notes,
      editHistory: record.editHistory,
    });
  });
  return map;
}

function defaultPresentMap(students: Student[]): Map<string, AttendanceEntry> {
  const map = new Map<string, AttendanceEntry>();
  students.forEach((student) => map.set(student.id, { status: 'present' }));
  return map;
}

export function useTeacherAttendance() {
  const { user } = useAuthStore();
  const [homeClass, setHomeClass] = useState<SchoolClass | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedDate, setSelectedDate] = useState(today);
  const [period, setPeriodState] = useState<number>(1);
  const [allRecords, setAllRecords] = useState<RawAttendanceRecord[]>([]);
  const [attendance, setAttendance] = useState<Map<string, AttendanceEntry>>(new Map());
  const [existingLoaded, setExistingLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const loadExistingAttendance = useCallback(
    async (classId: string, date: string, homeStudents: Student[]) => {
      try {
        const res = await apiClient.get(`/attendance/class/${classId}`, {
          params: { date },
        });
        const records = unwrapList<RawAttendanceRecord>(res);
        const filtered = records.filter((record) => (record.period ?? 1) === period);

        setAllRecords(records);
        setLoadError(false);

        if (filtered.length > 0) {
          setAttendance(recordsToAttendanceMap(filtered));
          setExistingLoaded(true);
          return;
        }

        setAttendance(defaultPresentMap(homeStudents));
        setExistingLoaded(false);
      } catch {
        toast.error('Could not load previous attendance. Refresh before saving.');
        setAllRecords([]);
        setLoadError(true);
        setAttendance(defaultPresentMap(homeStudents));
        setExistingLoaded(false);
      }
    },
    [period],
  );

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    async function init() {
      setLoading(true);
      try {
        const res = await apiClient.get('/academic/teacher/me/teaching-load');
        if (cancelled) return;
        const data = unwrapResponse<{
          homeroom: { class: SchoolClass; students: Student[] } | null;
          subjectClasses: unknown[];
        }>(res);

        const mine = data.homeroom?.class ?? null;
        const homeStudents = data.homeroom?.students ?? [];
        setHomeClass(mine);

        if (!mine) return;

        setStudents(homeStudents);
        await loadExistingAttendance(mine.id, today, homeStudents);
      } catch (err: unknown) {
        if (cancelled) return;
        console.error('Failed to load attendance data', err);
        toast.error('Could not load attendance data. Please refresh.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => { cancelled = true; };
  }, [user?.id, loadExistingAttendance]);

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

  const setPeriod = useCallback(
    (nextPeriod: number) => {
      setPeriodState(nextPeriod);
      setSaved(false);
      const filtered = allRecords.filter((record) => (record.period ?? 1) === nextPeriod);

      if (filtered.length > 0) {
        setAttendance(recordsToAttendanceMap(filtered));
        setExistingLoaded(true);
        return;
      }

      setAttendance(defaultPresentMap(students));
      setExistingLoaded(false);
    },
    [allRecords, students],
  );

  const updateStatus = useCallback((studentId: string, status: AttendanceStatus) => {
    setAttendance((prev) => {
      const next = new Map(prev);
      const existing = next.get(studentId);
      next.set(studentId, {
        status,
        note: existing?.note,
        editHistory: existing?.editHistory,
      });
      return next;
    });
    setSaved(false);
  }, []);

  const updateNote = useCallback((studentId: string, note: string) => {
    setAttendance((prev) => {
      const next = new Map(prev);
      const existing = next.get(studentId);
      next.set(studentId, {
        status: existing?.status ?? 'present',
        note: note.trim() === '' ? undefined : note,
        editHistory: existing?.editHistory,
      });
      return next;
    });
    setSaved(false);
  }, []);

  const markAllPresent = useCallback(() => {
    setAttendance((prev) => {
      const next = new Map(prev);
      students.forEach((student) => {
        const existing = next.get(student.id);
        next.set(student.id, {
          status: 'present',
          note: existing?.note,
          editHistory: existing?.editHistory,
        });
      });
      return next;
    });
    setSaved(false);
  }, [students]);

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
    if (loadError) {
      toast.error('Attendance could not be verified. Refresh before saving to avoid overwriting records.');
      return;
    }

    const records: AttendanceRecord[] = students.map((student) => {
      const entry = attendance.get(student.id);
      return {
        studentId: student.id,
        status: entry?.status ?? 'present',
        notes: entry?.note?.trim() ?? '',
      };
    });

    const isUpdate = existingLoaded;
    setSaving(true);
    try {
      await apiClient.post('/attendance/bulk', {
        classId: homeClass.id,
        date: `${selectedDate}T00:00:00.000Z`,
        period,
        records,
      });

      setAllRecords((prev) => [
        ...prev.filter((record) => (record.period ?? 1) !== period),
        ...records.map((record) => ({
          studentId: record.studentId,
          status: record.status,
          notes: record.notes,
          period,
        })),
      ]);
      setLoadError(false);
      setSaved(true);
      setExistingLoaded(true);
      toast.success(
        isUpdate
          ? `Attendance updated for ${selectedDate}`
          : `Attendance saved for ${selectedDate}`,
      );
    } catch (err: unknown) {
      const msg = extractErrorMessage(err, '');
      toast.error(msg || 'Failed to save attendance. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [user?.schoolId, homeClass, students, selectedDate, period, attendance, existingLoaded, loadError]);

  return {
    homeClass,
    students,
    selectedDate,
    period,
    attendance,
    existingLoaded,
    loadError,
    saving,
    saved,
    loading,
    changeDate,
    setPeriod,
    updateStatus,
    updateNote,
    markAllPresent,
    saveAttendance,
  };
}
