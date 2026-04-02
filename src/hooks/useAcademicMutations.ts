import { useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import { useAuthStore } from '@/stores/useAuthStore';
import type { Grade, SchoolClass, Subject, Assessment } from '@/types';

// ============== Payload types ==============

interface GradePayload {
  name: string;
  orderIndex: number;
}

interface ClassPayload {
  name: string;
  gradeId: string;
  teacherId: string;
  capacity: number;
}

interface SubjectPayload {
  name: string;
  code: string;
  gradeIds: string[];
}

interface TimetableSlotPayload {
  classId: string;
  day: string;
  period: number;
  startTime: string;
  endTime: string;
  subjectId: string;
  teacherId: string;
  room?: string;
}

interface AssessmentPayload {
  name: string;
  subjectId: string;
  classId: string;
  type: string;
  totalMarks: number;
  weight: number;
  term: number;
  academicYear: number;
  date: string;
}

// ============== useGradeMutations ==============

export function useGradeMutations() {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId ?? '';

  const createGrade = useCallback(async (data: GradePayload): Promise<Grade> => {
    const res = await apiClient.post('/academic/grades', { ...data, schoolId });
    return unwrapResponse<Grade>(res);
  }, [schoolId]);

  const updateGrade = useCallback(async (id: string, data: GradePayload): Promise<Grade> => {
    const res = await apiClient.put(`/academic/grades/${id}`, { ...data, schoolId });
    return unwrapResponse<Grade>(res);
  }, [schoolId]);

  const deleteGrade = useCallback(async (id: string): Promise<void> => {
    await apiClient.delete(`/academic/grades/${id}`);
  }, []);

  return { createGrade, updateGrade, deleteGrade };
}

// ============== useClassMutations ==============

export function useClassMutations() {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId ?? '';

  const createClass = useCallback(async (data: ClassPayload): Promise<SchoolClass> => {
    const res = await apiClient.post('/academic/classes', { ...data, schoolId });
    return unwrapResponse<SchoolClass>(res);
  }, [schoolId]);

  const updateClass = useCallback(async (id: string, data: ClassPayload): Promise<SchoolClass> => {
    const res = await apiClient.put(`/academic/classes/${id}`, { ...data, schoolId });
    return unwrapResponse<SchoolClass>(res);
  }, [schoolId]);

  const deleteClass = useCallback(async (id: string): Promise<void> => {
    await apiClient.delete(`/academic/classes/${id}`);
  }, []);

  return { createClass, updateClass, deleteClass };
}

// ============== useSubjectMutations ==============

export function useSubjectMutations() {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId ?? '';

  const createSubject = useCallback(async (data: SubjectPayload): Promise<Subject> => {
    const res = await apiClient.post('/academic/subjects', { ...data, schoolId });
    return unwrapResponse<Subject>(res);
  }, [schoolId]);

  const updateSubject = useCallback(async (id: string, data: SubjectPayload): Promise<Subject> => {
    const res = await apiClient.put(`/academic/subjects/${id}`, { ...data, schoolId });
    return unwrapResponse<Subject>(res);
  }, [schoolId]);

  const deleteSubject = useCallback(async (id: string): Promise<void> => {
    await apiClient.delete(`/academic/subjects/${id}`);
  }, []);

  return { createSubject, updateSubject, deleteSubject };
}

// ============== useTimetableMutations ==============

export function useTimetableMutations() {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId ?? '';

  const createSlot = useCallback(async (data: TimetableSlotPayload): Promise<unknown> => {
    const res = await apiClient.post('/academic/timetable', { ...data, schoolId });
    return unwrapResponse<unknown>(res);
  }, [schoolId]);

  const deleteSlot = useCallback(async (id: string): Promise<void> => {
    await apiClient.delete(`/academic/timetable/${id}`);
  }, []);

  return { createSlot, deleteSlot };
}

// ============== useAssessmentMutations ==============

export function useAssessmentMutations() {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId ?? '';

  const createAssessment = useCallback(async (data: AssessmentPayload): Promise<Assessment> => {
    const res = await apiClient.post('/academic/assessments', { ...data, schoolId });
    return unwrapResponse<Assessment>(res);
  }, [schoolId]);

  const updateAssessment = useCallback(async (id: string, data: AssessmentPayload): Promise<Assessment> => {
    const res = await apiClient.put(`/academic/assessments/${id}`, { ...data, schoolId });
    return unwrapResponse<Assessment>(res);
  }, [schoolId]);

  const deleteAssessment = useCallback(async (id: string): Promise<void> => {
    await apiClient.delete(`/academic/assessments/${id}`);
  }, []);

  return { createAssessment, updateAssessment, deleteAssessment };
}
