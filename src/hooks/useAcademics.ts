import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList } from '@/lib/api-helpers';
import { useAuthStore } from '@/stores/useAuthStore';
import type { Grade, SchoolClass, Subject, Assessment, TimetableSlot, Student } from '@/types';

interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export function useGrades() {
  const { user } = useAuthStore();
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGrades = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/academic/grades');
      setGrades(unwrapList<Grade>(res));
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
      setClasses(unwrapList<SchoolClass>(res));
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
      setSubjects(unwrapList<Subject>(res));
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
        setStaff(unwrapList<StaffMember>(res));
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
      setAssessments(unwrapList<Assessment>(res));
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
      setEntries(unwrapList<TimetableSlot>(res));
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
