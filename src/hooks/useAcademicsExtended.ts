import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { useAuthStore } from '@/stores/useAuthStore';
import type { Student } from '@/types';

// ============== useExams ==============

export interface Exam {
  id: string; name: string; term: number; year: number;
  startDate: string; endDate: string; status: string;
}

export interface ExamSlot {
  id: string; subjectName: string; gradeName: string;
  date: string; startTime: string; endTime: string;
  venue: string; invigilatorName: string; duration: number;
}

export function useExams() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchExams = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/academic/exams');
      const raw = (res.data as Record<string, unknown>).data ?? res.data;
      const arr = Array.isArray(raw) ? raw : (raw as Record<string, unknown>).data ?? [];
      setExams((arr as Record<string, unknown>[]).map((e) => ({
        id: (e.id as string) ?? '',
        name: (e.name as string) ?? '',
        term: (e.term as number) ?? 0,
        year: (e.year as number) ?? 0,
        startDate: (e.startDate as string) ?? '',
        endDate: (e.endDate as string) ?? '',
        status: (e.status as string) ?? '',
      })));
    } catch {
      console.error('Failed to load exams');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchExams(); }, [fetchExams]);

  return { exams, loading, refetch: fetchExams };
}

export function useExamSlots(examId: string | null) {
  const [slots, setSlots] = useState<ExamSlot[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSlots = useCallback(async () => {
    if (!examId) { setSlots([]); return; }
    try {
      setLoading(true);
      const res = await apiClient.get(`/academic/exam-timetable/exam/${examId}`);
      const raw = (res.data as Record<string, unknown>).data ?? res.data;
      const arr = Array.isArray(raw) ? raw : (raw as Record<string, unknown>).data ?? [];
      setSlots((arr as Record<string, unknown>[]).map((s) => ({
        id: (s.id as string) ?? '',
        subjectName: (typeof s.subjectId === 'object'
          ? ((s.subjectId as Record<string, unknown>)?.name as string) : '') ?? '',
        gradeName: (typeof s.gradeId === 'object'
          ? ((s.gradeId as Record<string, unknown>)?.name as string) : '') ?? '',
        date: (s.date as string) ?? '',
        startTime: (s.startTime as string) ?? '',
        endTime: (s.endTime as string) ?? '',
        venue: (s.venue as string) ?? '',
        invigilatorName: typeof s.invigilator === 'object'
          ? `${((s.invigilator as Record<string, unknown>).firstName as string) ?? ''} ${((s.invigilator as Record<string, unknown>).lastName as string) ?? ''}`.trim()
          : '',
        duration: (s.duration as number) ?? 0,
      })));
    } catch {
      console.error('Failed to load exam timetable');
    } finally {
      setLoading(false);
    }
  }, [examId]);

  useEffect(() => { fetchSlots(); }, [fetchSlots]);

  return { slots, loading, refetch: fetchSlots };
}

// ============== usePastPapers ==============

export interface PastPaper {
  id: string;
  subjectName: string;
  gradeName: string;
  year: number;
  term: number;
  fileUrl: string;
  uploadedBy: string;
}

export function usePastPapers() {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId ?? '';
  const [papers, setPapers] = useState<PastPaper[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPapers = useCallback(async () => {
    if (!schoolId) return;
    try {
      setLoading(true);
      const res = await apiClient.get('/academic/past-papers', {
        params: { schoolId },
      });
      const raw = (res.data as Record<string, unknown>).data ?? res.data;
      const arr = Array.isArray(raw)
        ? raw
        : (raw as Record<string, unknown>).data ?? [];
      setPapers(
        (arr as Record<string, unknown>[]).map((p) => ({
          id: (p.id as string) ?? '',
          subjectName:
            typeof p.subjectId === 'object'
              ? ((p.subjectId as Record<string, unknown>)?.name as string) ?? ''
              : '',
          gradeName:
            typeof p.gradeId === 'object'
              ? ((p.gradeId as Record<string, unknown>)?.name as string) ?? ''
              : '',
          year: (p.year as number) ?? 0,
          term: (p.term as number) ?? 0,
          fileUrl: (p.fileUrl as string) ?? '',
          uploadedBy:
            typeof p.uploadedBy === 'object'
              ? `${
                  ((p.uploadedBy as Record<string, unknown>).firstName as string) ?? ''
                } ${
                  ((p.uploadedBy as Record<string, unknown>).lastName as string) ?? ''
                }`.trim()
              : '',
        }))
      );
    } catch {
      console.error('Failed to load past papers');
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => { fetchPapers(); }, [fetchPapers]);

  return { papers, loading, refetch: fetchPapers, schoolId };
}

// ============== useRemedials ==============

export interface RemedialRecord {
  id: string; studentName: string; subjectName: string;
  identifiedDate: string; status: string; areas: string[];
  interventions: string[]; progress: string[];
  studentId: string; subjectId: string; reviewDate?: string;
}

export function useRemedials() {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId ?? '';
  const [records, setRecords] = useState<RemedialRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecords = useCallback(async () => {
    if (!schoolId) return;
    try {
      setLoading(true);
      const [remRes, stuRes] = await Promise.allSettled([
        apiClient.get('/academic/remedials', { params: { schoolId } }),
        apiClient.get('/students'),
      ]);
      if (stuRes.status === 'fulfilled') {
        const raw = (stuRes.value.data as Record<string, unknown>).data ?? stuRes.value.data;
        const arr = Array.isArray(raw) ? raw : (raw as Record<string, unknown>).data ?? [];
        setStudents((arr as Record<string, unknown>[]).map((s) => {
          const userId = s.userId as Record<string, unknown> | undefined;
          return {
            id: (s.id as string) ?? '',
            admissionNumber: (s.admissionNumber as string) ?? '',
            user: userId ? { firstName: (userId.firstName as string) ?? '', lastName: (userId.lastName as string) ?? '' } : undefined,
            userId: s.userId,
          } as Student;
        }));
      }
      if (remRes.status === 'fulfilled') {
        const raw = (remRes.value.data as Record<string, unknown>).data ?? remRes.value.data;
        const arr = Array.isArray(raw) ? raw : (raw as Record<string, unknown>).data ?? [];
        setRecords((arr as Record<string, unknown>[]).map((r) => {
          const stu = r.studentId as Record<string, unknown> | string;
          const sub = r.subjectId as Record<string, unknown> | string;
          let studentName = '';
          let studentId = '';
          if (typeof stu === 'object' && stu !== null) {
            const u = (stu as Record<string, unknown>).userId ?? stu;
            studentName = `${((u as Record<string, unknown>).firstName as string) ?? ''} ${((u as Record<string, unknown>).lastName as string) ?? ''}`.trim();
            studentId = ((stu as Record<string, unknown>).id as string) ?? '';
          } else {
            studentId = stu as string;
          }
          return {
            id: (r.id as string) ?? '',
            studentName,
            subjectName: typeof sub === 'object' && sub !== null
              ? ((sub as Record<string, unknown>).name as string) ?? '' : '',
            identifiedDate: (r.identifiedDate as string) ?? '',
            status: (r.status as string) ?? 'identified',
            areas: (r.areas as string[]) ?? [],
            interventions: (r.interventions as string[]) ?? [],
            progress: (r.progress as string[]) ?? [],
            studentId,
            subjectId: typeof sub === 'object'
              ? ((sub as Record<string, unknown>).id as string) ?? '' : (sub as string),
            reviewDate: (r.reviewDate as string) ?? undefined,
          };
        }));
      }
    } catch {
      console.error('Failed to load remedials');
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  return { records, students, loading, refetch: fetchRecords, schoolId };
}

// ============== useWeightings ==============

export interface Weighting {
  id: string;
  subjectName: string;
  gradeName: string;
  assessmentType: string;
  weightPercentage: number;
  term: number;
}

export function useWeightings() {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId ?? '';
  const [weightings, setWeightings] = useState<Weighting[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWeightings = useCallback(async () => {
    if (!schoolId) return;
    try {
      setLoading(true);
      const res = await apiClient.get('/academic/subject-weightings', {
        params: { schoolId },
      });
      const raw = (res.data as Record<string, unknown>).data ?? res.data;
      const arr = Array.isArray(raw) ? raw : [];
      setWeightings((arr as Record<string, unknown>[]).map((w) => ({
        id: (w.id as string) ?? '',
        subjectName: typeof w.subjectId === 'object'
          ? ((w.subjectId as Record<string, unknown>)?.name as string) ?? '' : '',
        gradeName: typeof w.gradeId === 'object'
          ? ((w.gradeId as Record<string, unknown>)?.name as string) ?? '' : '',
        assessmentType: (w.assessmentType as string) ?? '',
        weightPercentage: (w.weightPercentage as number) ?? 0,
        term: (w.term as number) ?? 0,
      })));
    } catch {
      console.error('Failed to load weightings');
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => { fetchWeightings(); }, [fetchWeightings]);

  return { weightings, loading, refetch: fetchWeightings, schoolId };
}
