import { useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import { useAuthStore } from '@/stores/useAuthStore';
import type { Exam } from './useAcademicsExtended';

// ============== Payload types ==============

interface ExamPayload {
  name: string;
  term: number;
  year: number;
  startDate: string;
  endDate: string;
  status: string;
}

interface ExamSlotPayload {
  examId: string;
  subjectId: string;
  gradeId: string;
  date: string;
  startTime: string;
  endTime: string;
  venue: string;
  invigilator: string;
  duration: number;
}

interface PastPaperPayload {
  subjectId: string;
  gradeId: string;
  year: number;
  term: number;
  fileUrl: string;
}

interface RemedialPayload {
  studentId: string;
  subjectId: string;
  identifiedDate: string;
  areas: string[];
  interventions: string[];
  progress: string[];
  status: string;
  reviewDate?: string;
}

interface WeightingPayload {
  subjectId: string;
  gradeId: string;
  assessmentType: string;
  weightPercentage: number;
  term: number;
}

interface PromotionStudent {
  studentId: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  totalSubjects: number;
  passedSubjects: number;
  failedSubjects: number;
  overallAverage: number;
  promoted: boolean;
}

export interface GradeReport {
  gradeId: string;
  year: number;
  totalStudents: number;
  promoted: number;
  notPromoted: number;
  promotionRate: number;
  students: PromotionStudent[];
}

// ============== useExamMutations ==============

export function useExamMutations() {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId ?? '';

  const createExam = useCallback(async (data: ExamPayload): Promise<Exam> => {
    const res = await apiClient.post('/academic/exams', { ...data, schoolId });
    return unwrapResponse<Exam>(res);
  }, [schoolId]);

  const updateExam = useCallback(async (id: string, data: ExamPayload): Promise<Exam> => {
    const res = await apiClient.put(`/academic/exams/${id}`, { ...data, schoolId });
    return unwrapResponse<Exam>(res);
  }, [schoolId]);

  const deleteExam = useCallback(async (id: string): Promise<void> => {
    await apiClient.delete(`/academic/exams/${id}`);
  }, []);

  return { createExam, updateExam, deleteExam };
}

// ============== useExamSlotMutations ==============

export function useExamSlotMutations() {
  const createExamSlot = useCallback(async (data: ExamSlotPayload): Promise<unknown> => {
    const res = await apiClient.post('/academic/exam-timetable', data);
    return unwrapResponse<unknown>(res);
  }, []);

  const deleteExamSlot = useCallback(async (id: string): Promise<void> => {
    await apiClient.delete(`/academic/exam-timetable/${id}`);
  }, []);

  return { createExamSlot, deleteExamSlot };
}

// ============== usePastPaperMutations ==============

export function usePastPaperMutations() {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId ?? '';

  const createPastPaper = useCallback(async (data: PastPaperPayload): Promise<unknown> => {
    const res = await apiClient.post('/academic/past-papers', { ...data, schoolId });
    return unwrapResponse<unknown>(res);
  }, [schoolId]);

  const deletePastPaper = useCallback(async (id: string): Promise<void> => {
    await apiClient.delete(`/academic/past-papers/${id}`);
  }, []);

  return { createPastPaper, deletePastPaper };
}

// ============== useRemedialMutations ==============

export function useRemedialMutations() {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId ?? '';

  const createRemedial = useCallback(async (data: RemedialPayload): Promise<unknown> => {
    const res = await apiClient.post('/academic/remedials', { ...data, schoolId });
    return unwrapResponse<unknown>(res);
  }, [schoolId]);

  const updateRemedial = useCallback(async (id: string, data: RemedialPayload): Promise<unknown> => {
    const res = await apiClient.put(`/academic/remedials/${id}`, { ...data, schoolId });
    return unwrapResponse<unknown>(res);
  }, [schoolId]);

  const deleteRemedial = useCallback(async (id: string): Promise<void> => {
    await apiClient.delete(`/academic/remedials/${id}`);
  }, []);

  return { createRemedial, updateRemedial, deleteRemedial };
}

// ============== useWeightingMutations ==============

export function useWeightingMutations() {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId ?? '';

  const createWeighting = useCallback(async (data: WeightingPayload): Promise<unknown> => {
    const res = await apiClient.post('/academic/subject-weightings', { ...data, schoolId });
    return unwrapResponse<unknown>(res);
  }, [schoolId]);

  const deleteWeighting = useCallback(async (id: string): Promise<void> => {
    await apiClient.delete(`/academic/subject-weightings/${id}`);
  }, []);

  return { createWeighting, deleteWeighting };
}

// ============== usePromotionReport ==============

export function usePromotionReport() {
  const fetchPromotionReport = useCallback(async (
    gradeId: string,
    year: number,
  ): Promise<GradeReport> => {
    const res = await apiClient.get(`/academic/promotion/grade/${gradeId}`, {
      params: { year },
    });
    return unwrapResponse<GradeReport>(res);
  }, []);

  return { fetchPromotionReport };
}
