import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import type { Student, SchoolClass } from '@/types';

export interface SubjectTaught {
  id: string;
  name: string;
  code: string;
}

export interface TeacherClassEntry {
  class: SchoolClass;
  subject: SubjectTaught | null;
  students: Student[];
  isHomeroom: boolean;
}

interface TeachingLoadResponse {
  homeroom: { class: SchoolClass; students: Student[] } | null;
  subjectClasses: {
    class: SchoolClass;
    subject: SubjectTaught;
    students: Student[];
  }[];
}

interface CreateClassPayload {
  name: string;
  gradeId: string;
  capacity: number;
  schoolId: string;
  teacherId: string;
}

interface AddStudentPayload {
  firstName: string;
  lastName: string;
  admissionNumber: string;
  gradeId: string;
  classId: string;
  schoolId: string;
}

function getId(obj: unknown): string {
  if (obj && typeof obj === 'object' && 'id' in obj) return String((obj as { id: string }).id);
  return '';
}

export function useTeacherClasses() {
  const [entries, setEntries] = useState<TeacherClassEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const refetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refetch = useCallback(() => {
    if (refetchTimeoutRef.current) clearTimeout(refetchTimeoutRef.current);
    refetchTimeoutRef.current = setTimeout(() => {
      setRefreshKey((k) => k + 1);
    }, 300);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function fetchTeachingLoad() {
      try {
        setLoading(true);
        const res = await apiClient.get('/academic/teacher/me/teaching-load', {
          signal: controller.signal,
        });
        const data = unwrapResponse<TeachingLoadResponse>(res);

        const result: TeacherClassEntry[] = [];

        if (data.homeroom) {
          result.push({
            class: data.homeroom.class,
            subject: null,
            students: data.homeroom.students ?? [],
            isHomeroom: true,
          });
        }

        if (Array.isArray(data.subjectClasses)) {
          for (const sc of data.subjectClasses) {
            result.push({
              class: sc.class,
              subject: sc.subject,
              students: sc.students ?? [],
              isHomeroom: false,
            });
          }
        }

        setEntries(result);
      } catch (err: unknown) {
        if ((err as { name?: string })?.name === 'CanceledError') return;
        console.error('Failed to load teaching load', err);
        toast.error('Could not load classes. Please refresh.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    fetchTeachingLoad();
    return () => controller.abort();
  }, [refreshKey]);

  /** Deduplicated list of classes (backward compat). */
  const classes = useMemo(() => {
    const map = new Map<string, SchoolClass>();
    for (const entry of entries) {
      const id = getId(entry.class);
      if (id && !map.has(id)) map.set(id, entry.class);
    }
    return Array.from(map.values());
  }, [entries]);

  /** Deduplicated list of students (backward compat). */
  const students = useMemo(() => {
    const map = new Map<string, Student>();
    for (const entry of entries) {
      for (const s of entry.students) {
        const sid = getId(s);
        if (sid && !map.has(sid)) map.set(sid, s);
      }
    }
    return Array.from(map.values());
  }, [entries]);

  /** Homeroom entry or null. */
  const homeroom = useMemo(
    () => entries.find((e) => e.isHomeroom) ?? null,
    [entries],
  );

  // ─── Mutations ──────────────────────────────────────────────────────

  const createClass = useCallback(async (data: CreateClassPayload) => {
    const res = await apiClient.post('/academic/classes', data);
    refetch();
    return unwrapResponse<SchoolClass>(res);
  }, [refetch]);

  const updateClass = useCallback(async (id: string, data: Partial<CreateClassPayload>) => {
    const res = await apiClient.put(`/academic/classes/${id}`, data);
    refetch();
    return unwrapResponse<SchoolClass>(res);
  }, [refetch]);

  const deleteClass = useCallback(async (id: string) => {
    await apiClient.delete(`/academic/classes/${id}`);
    refetch();
  }, [refetch]);

  const addStudent = useCallback(async (data: AddStudentPayload) => {
    const res = await apiClient.post('/students', data);
    refetch();
    return unwrapResponse<Student>(res);
  }, [refetch]);

  const removeStudent = useCallback(async (studentId: string) => {
    await apiClient.delete(`/students/${studentId}`);
    refetch();
  }, [refetch]);

  const inviteStudent = useCallback(async (studentId: string, email: string) => {
    const res = await apiClient.post(`/students/${studentId}/invite`, { email });
    return unwrapResponse<{ tempPassword: string }>(res);
  }, []);

  const reassignStudent = useCallback(async (studentId: string, classId: string) => {
    await apiClient.put(`/students/${studentId}`, { classId });
    refetch();
  }, [refetch]);

  return {
    entries,
    classes,
    students,
    homeroom,
    loading,
    refetch,
    createClass,
    updateClass,
    deleteClass,
    addStudent,
    removeStudent,
    inviteStudent,
    reassignStudent,
  };
}
