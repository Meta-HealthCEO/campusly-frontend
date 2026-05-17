import { useCallback, useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList, extractErrorMessage, resolveId } from '@/lib/api-helpers';
import { toast } from 'sonner';
import type { Student } from '@/types';
import type { AttendanceStatus } from '@/hooks/useTeacherAttendance';

interface RawRecord {
  studentId: string | { id?: string; _id?: string };
  status: AttendanceStatus;
  notes?: string;
  period?: number;
}

export interface DayEntry {
  status: AttendanceStatus;
  note?: string;
}

interface UseAttendanceDayEditOptions {
  open: boolean;
  classId: string;
  date: string;
  period: number;
  students: Student[];
}

export function useAttendanceDayEdit({ open, classId, date, period, students }: UseAttendanceDayEditOptions) {
  const [entries, setEntries] = useState<Map<string, DayEntry>>(new Map());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await apiClient.get(`/attendance/class/${classId}`, { params: { date } });
        if (cancelled) return;
        const raw = unwrapList<RawRecord>(res).filter((r) => (r.period ?? 1) === period);
        const map = new Map<string, DayEntry>();
        students.forEach((s) => map.set(s.id, { status: 'present' }));
        for (const r of raw) {
          const sid = resolveId(r.studentId);
          if (sid) map.set(sid, { status: r.status, note: r.notes });
        }
        setEntries(map);
      } catch (err: unknown) {
        toast.error(extractErrorMessage(err, 'Could not load this day'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [open, classId, date, period, students]);

  const updateStatus = useCallback((studentId: string, status: AttendanceStatus) => {
    setEntries((prev) => {
      const next = new Map(prev);
      const existing = next.get(studentId);
      next.set(studentId, { status, note: existing?.note });
      return next;
    });
  }, []);

  const updateNote = useCallback((studentId: string, note: string) => {
    setEntries((prev) => {
      const next = new Map(prev);
      const existing = next.get(studentId);
      next.set(studentId, {
        status: existing?.status ?? 'present',
        note: note.trim() === '' ? undefined : note,
      });
      return next;
    });
  }, []);

  const save = useCallback(async (): Promise<boolean> => {
    setSaving(true);
    try {
      await apiClient.post('/attendance/bulk', {
        classId,
        date,
        period,
        records: students.map((s) => {
          const e = entries.get(s.id);
          return {
            studentId: s.id,
            status: e?.status ?? 'present',
            notes: e?.note?.trim() ?? '',
          };
        }),
      });
      toast.success(`Attendance saved for ${date}`);
      return true;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to save'));
      return false;
    } finally {
      setSaving(false);
    }
  }, [classId, date, period, students, entries]);

  return { entries, loading, saving, updateStatus, updateNote, save };
}
