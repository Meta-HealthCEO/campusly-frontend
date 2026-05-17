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

export interface TeacherClassOption {
  id: string;
  label: string;       // "Grade 11A · Mathematics" or "Grade 11A · Homeroom"
  isHomeroom: boolean;
  students: Student[];
}

interface TeachingLoadResponse {
  homeroom: { class: SchoolClass; subject?: { name?: string } | null; students: Student[] } | null;
  subjectClasses: { class: SchoolClass; subject: { name?: string } | null; students: Student[] }[];
}

function buildOption(entry: { class: SchoolClass; subject?: { name?: string } | null; students: Student[] }, isHomeroom: boolean): TeacherClassOption {
  const cls = entry.class;
  const gradeName = cls.grade?.name ?? cls.gradeName ?? '';
  const subjectName = entry.subject?.name ?? (isHomeroom ? 'Homeroom' : '');
  const label = [gradeName ? `${gradeName} ${cls.name}` : cls.name, subjectName]
    .filter(Boolean)
    .join(' · ');
  return {
    id: resolveId(cls),
    label,
    isHomeroom,
    students: entry.students,
  };
}

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

interface UseTeacherAttendanceOptions {
  classId?: string;            // explicit class to load (e.g. from URL)
  initialDate?: string;        // YYYY-MM-DD, defaults to today
  initialPeriod?: number;      // defaults to 1
}

export function useTeacherAttendance(options: UseTeacherAttendanceOptions = {}) {
  const { user } = useAuthStore();
  const [classes, setClasses] = useState<TeacherClassOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(options.classId ?? null);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedDate, setSelectedDate] = useState(options.initialDate ?? toISODate(new Date()));
  const [period, setPeriodState] = useState<number>(options.initialPeriod ?? 1);
  const [allRecords, setAllRecords] = useState<RawAttendanceRecord[]>([]);
  const [attendance, setAttendance] = useState<Map<string, AttendanceEntry>>(new Map());
  const [existingLoaded, setExistingLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const selectedClass = classes.find((c) => c.id === selectedClassId) ?? null;

  const loadExistingAttendance = useCallback(
    async (classId: string, date: string, classStudents: Student[]) => {
      try {
        const res = await apiClient.get(`/attendance/class/${classId}`, { params: { date } });
        const records = unwrapList<RawAttendanceRecord>(res);
        const filtered = records.filter((record) => (record.period ?? 1) === period);

        setAllRecords(records);
        setLoadError(false);

        if (filtered.length > 0) {
          setAttendance(recordsToAttendanceMap(filtered));
          setExistingLoaded(true);
          return;
        }

        setAttendance(defaultPresentMap(classStudents));
        setExistingLoaded(false);
      } catch {
        toast.error('Could not load previous attendance. Refresh before saving.');
        setAllRecords([]);
        setLoadError(true);
        setAttendance(defaultPresentMap(classStudents));
        setExistingLoaded(false);
      }
    },
    [period],
  );

  // Initial load: fetch the teacher's classes, resolve the selected class, load attendance.
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    async function init() {
      setLoading(true);
      try {
        const res = await apiClient.get('/academic/teacher/me/teaching-load');
        if (cancelled) return;
        const data = unwrapResponse<TeachingLoadResponse>(res);

        const opts: TeacherClassOption[] = [];
        if (data.homeroom) opts.push(buildOption(data.homeroom, true));
        for (const sc of data.subjectClasses) opts.push(buildOption(sc, false));
        // Homeroom is pinned first by construction; sort the rest alphabetically.
        const homeroom = opts.filter((o) => o.isHomeroom);
        const rest = opts.filter((o) => !o.isHomeroom).sort((a, b) => a.label.localeCompare(b.label));
        const sorted = [...homeroom, ...rest];
        setClasses(sorted);

        const resolvedId = (options.classId && sorted.some((c) => c.id === options.classId))
          ? options.classId
          : (sorted[0]?.id ?? null);
        setSelectedClassId(resolvedId);

        if (!resolvedId) return;
        const target = sorted.find((c) => c.id === resolvedId)!;
        setStudents(target.students);
        await loadExistingAttendance(resolvedId, selectedDate, target.students);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const changeClass = useCallback(
    async (nextClassId: string) => {
      const target = classes.find((c) => c.id === nextClassId);
      if (!target) return;
      setSelectedClassId(nextClassId);
      setStudents(target.students);
      setSaved(false);
      setExistingLoaded(false);
      await loadExistingAttendance(nextClassId, selectedDate, target.students);
    },
    [classes, selectedDate, loadExistingAttendance],
  );

  const changeDate = useCallback(
    async (date: string) => {
      setSelectedDate(date);
      setSaved(false);
      setExistingLoaded(false);
      if (selectedClass) {
        await loadExistingAttendance(selectedClass.id, date, students);
      }
    },
    [selectedClass, students, loadExistingAttendance],
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

  const markAll = useCallback((status: AttendanceStatus) => {
    setAttendance((prev) => {
      const next = new Map(prev);
      students.forEach((student) => {
        const existing = next.get(student.id);
        next.set(student.id, {
          status,
          note: existing?.note,        // preserve notes
          editHistory: existing?.editHistory,
        });
      });
      return next;
    });
    setSaved(false);
  }, [students]);

  const saveAttendance = useCallback(async () => {
    if (!user?.schoolId) { toast.error('School information not available'); return; }
    if (!selectedClass) { toast.error('No class selected'); return; }
    if (students.length === 0) { toast.error('No students to mark attendance for'); return; }
    if (selectedDate > toISODate(new Date())) { toast.error('Cannot record attendance for a future date'); return; }
    if (loadError) {
      toast.error('Attendance could not be verified. Refresh before saving.');
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
        classId: selectedClass.id,
        date: selectedDate, // plain YYYY-MM-DD; backend accepts both formats since Task 1
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
      toast.success(isUpdate
        ? `Attendance updated for ${selectedDate}`
        : `Attendance saved for ${selectedDate}`);
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Failed to save attendance. Please try again.'));
    } finally {
      setSaving(false);
    }
  }, [user?.schoolId, selectedClass, students, selectedDate, period, attendance, existingLoaded, loadError]);

  return {
    classes,
    selectedClass,
    students,
    selectedDate,
    period,
    attendance,
    existingLoaded,
    loadError,
    saving,
    saved,
    loading,
    changeClass,
    changeDate,
    setPeriod,
    updateStatus,
    updateNote,
    markAll,
    saveAttendance,
  };
}
