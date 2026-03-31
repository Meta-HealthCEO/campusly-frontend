import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { useAuthStore } from '@/stores/useAuthStore';
import type { Grade, SchoolClass, Subject, Assessment, TimetableSlot, Student } from '@/types';

interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

function unwrapArray<T>(response: { data: unknown }): T[] {
  const raw = (response.data as Record<string, unknown>).data ?? response.data;
  if (Array.isArray(raw)) return raw as T[];
  const inner = (raw as Record<string, unknown>)?.data;
  return Array.isArray(inner) ? (inner as T[]) : [];
}

export function useGrades() {
  const { user } = useAuthStore();
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGrades = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/academic/grades');
      setGrades(unwrapArray<Grade>(res));
    } catch {
      console.error('Failed to load grades');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (user?.id) fetchGrades(); }, [user?.id, fetchGrades]);

  return { grades, loading, refetch: fetchGrades };
}

export function useClasses(gradeId?: string) {
  const { user } = useAuthStore();
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClasses = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (gradeId) params.gradeId = gradeId;
      const res = await apiClient.get('/academic/classes', { params });
      setClasses(unwrapArray<SchoolClass>(res));
    } catch {
      console.error('Failed to load classes');
    } finally {
      setLoading(false);
    }
  }, [gradeId]);

  useEffect(() => { if (user?.id) fetchClasses(); }, [user?.id, fetchClasses]);

  return { classes, loading, refetch: fetchClasses };
}

export function useSubjects() {
  const { user } = useAuthStore();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSubjects = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/academic/subjects');
      setSubjects(unwrapArray<Subject>(res));
    } catch {
      console.error('Failed to load subjects');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (user?.id) fetchSubjects(); }, [user?.id, fetchSubjects]);

  return { subjects, loading, refetch: fetchSubjects };
}

export function useStaff() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      try {
        const res = await apiClient.get('/staff');
        setStaff(unwrapArray<StaffMember>(res));
      } catch {
        console.error('Failed to load staff');
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, []);

  return { staff, loading };
}

export function useAssessments(filters?: {
  classId?: string;
  subjectId?: string;
  term?: number;
  academicYear?: number;
}) {
  const { user } = useAuthStore();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAssessments = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string | number> = {};
      if (filters?.classId) params.classId = filters.classId;
      if (filters?.subjectId) params.subjectId = filters.subjectId;
      if (filters?.term) params.term = filters.term;
      if (filters?.academicYear) params.academicYear = filters.academicYear;
      const res = await apiClient.get('/academic/assessments', { params });
      setAssessments(unwrapArray<Assessment>(res));
    } catch {
      console.error('Failed to load assessments');
    } finally {
      setLoading(false);
    }
  }, [filters?.classId, filters?.subjectId, filters?.term, filters?.academicYear]);

  useEffect(() => { if (user?.id) fetchAssessments(); }, [user?.id, fetchAssessments]);

  return { assessments, loading, refetch: fetchAssessments };
}

export function useTimetable(classId?: string) {
  const [entries, setEntries] = useState<TimetableSlot[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTimetable = useCallback(async () => {
    if (!classId) { setLoading(false); return; }
    try {
      setLoading(true);
      const res = await apiClient.get(`/academic/timetable/class/${classId}`);
      const raw = (res.data as Record<string, unknown>).data ?? res.data;
      setEntries(Array.isArray(raw) ? (raw as TimetableSlot[]) : []);
    } catch {
      console.error('Failed to load timetable');
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => { fetchTimetable(); }, [fetchTimetable]);

  return { entries, loading, refetch: fetchTimetable };
}

// Re-export extended hooks for convenience
export { useExams, useExamSlots, usePastPapers, useRemedials, useWeightings } from './useAcademicsExtended';
export type { Exam, ExamSlot, PastPaper, RemedialRecord, Weighting } from './useAcademicsExtended';

export type { StaffMember };
