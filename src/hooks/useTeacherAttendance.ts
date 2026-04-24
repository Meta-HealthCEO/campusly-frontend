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

export function useTeacherAttendance() {
  const { user } = useAuthStore();
  const [homeClass, setHomeClass] = useState<SchoolClass | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedDate, setSelectedDate] = useState(today);
  const [period, setPeriodState] = useState<number>(1);
  const [allRecords, setAllRecords] = useState<RawAttendanceRecord[]>([]);
  const [attendance, setAttendance] = useState<Map<string, AttendanceEntry>>(new Map());
  const [existingLoaded, setExistingLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // ── Load existing attendance for a given date ────────────────────────────
  // Fetches ALL records for the date (across periods), stores them, and
  // filters by the currently-selected period to build the attendance Map.
  const loadExistingAttendance = useCallback(
    async (classId: string, date: string, homeStudents: Student[]) => {
      try {
        const res = await apiClient.get(`/attendance/class/${classId}`, {
          params: { date },
        });
        const records = unwrapList<RawAttendanceRecord>(res);
        setAllRecords(records);

        // Filter by current period (default to 1 if records have no period)
        const filtered = records.filter((r) => (r.period ?? 1) === period);

        if (filtered.length > 0) {
          const map = new Map<string, AttendanceEntry>();
          filtered.forEach((r) => {
            const sid = resolveId(r.studentId);
            if (sid) map.set(sid, { status: r.status, note: r.notes, editHistory: r.editHistory });
          });
          setAttendance(map);
          setExistingLoaded(true);
        } else {
          // Default all to present
          const map = new Map<string, AttendanceEntry>();
          homeStudents.forEach((s) => map.set(s.id, { status: 'present' }));
          setAttendance(map);
          setExistingLoaded(false);
        }
      } catch {
        toast.error('Could not load previous attendance — defaulting all to present');
        setAllRecords([]);
        // Default all to present
        const map = new Map<string, AttendanceEntry>();
        homeStudents.forEach((s) => map.set(s.id, { status: 'present' }));
        setAttendance(map);
        setExistingLoaded(false);
      }
    },
    [period],
  );

  // ── Initial load: fetch teaching load, pick home class + its students ────
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

  // ── Period change (client-side filter of already-loaded records) ────────
  const setPeriod = useCallback(
    (nextPeriod: number) => {
      setPeriodState(nextPeriod);
      setSaved(false);
      const filtered = allRecords.filter((r) => (r.period ?? 1) === nextPeriod);
      if (filtered.length > 0) {
        const map = new Map<string, AttendanceEntry>();
        filtered.forEach((r) => {
          const sid = resolveId(r.studentId);
          if (sid) map.set(sid, { status: r.status, note: r.notes });
        });
        setAttendance(map);
        setExistingLoaded(true);
      } else {
        const map = new Map<string, AttendanceEntry>();
        students.forEach((s) => map.set(s.id, { status: 'present' }));
        setAttendance(map);
        setExistingLoaded(false);
      }
    },
    [allRecords, students],
  );

  // ── Status mutations ─────────────────────────────────────────────────────
  const updateStatus = useCallback((studentId: string, status: AttendanceStatus) => {
    setAttendance((prev) => {
      const next = new Map(prev);
      const existing = next.get(studentId);
      next.set(studentId, { status, note: existing?.note });
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
      });
      return next;
    });
    setSaved(false);
  }, []);

  const markAllPresent = useCallback(() => {
    setAttendance((prev) => {
      const next = new Map(prev);
      students.forEach((s) => next.set(s.id, { status: 'present' }));
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

    const records: AttendanceRecord[] = students.map((s) => {
      const entry = attendance.get(s.id);
      const record: AttendanceRecord = {
        studentId: s.id,
        status: entry?.status ?? 'present',
      };
      if (entry?.note) record.notes = entry.note;
      return record;
    });

    const isUpdate = existingLoaded;
    setSaving(true);
    try {
      // NOTE: schoolId is required by the backend `bulkAttendanceSchema` Zod
      // validator and is used in the `upsert` filter in the service. The
      // backend trusts the value from the JWT (`req.user.schoolId`) for
      // authorization, but still expects it in the payload for validation.
      await apiClient.post('/attendance/bulk', {
        classId: homeClass.id,
        schoolId: user.schoolId,
        date: `${selectedDate}T00:00:00.000Z`,
        period,
        records,
      });
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
  }, [user?.schoolId, homeClass, students, selectedDate, period, attendance, existingLoaded]);

  return {
    homeClass,
    students,
    selectedDate,
    period,
    attendance,
    existingLoaded,
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
