import { useState, useCallback, useRef } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import { toast } from 'sonner';
import type {
  GeneratedPaper,
  GradingJob,
  UsageStats,
  GeneratePaperPayload,
  GradePayload,
  BulkGradePayload,
  PaperSection,
} from '@/components/ai-tools/types';

export interface MarkPaperQuestionResult {
  questionNumber: number;
  studentAnswer: string;
  correctAnswer: string;
  marksAwarded: number;
  maxMarks: number;
  feedback: string;
}

export interface MarkPaperResult {
  studentName: string;
  totalMarks: number;
  maxMarks: number;
  percentage: number;
  questions: MarkPaperQuestionResult[];
}

interface MarkPaperPayload {
  paperId: string;
  studentName: string;
  image: string;
  imageType: 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf';
}

function mapPaper(raw: Record<string, unknown>): GeneratedPaper {
  return { ...raw, id: (raw._id as string) ?? (raw.id as string) } as GeneratedPaper;
}

function mapJob(raw: Record<string, unknown>): GradingJob {
  return { ...raw, id: (raw._id as string) ?? (raw.id as string) } as GradingJob;
}

export function useAITools() {
  const [loading, setLoading] = useState(false);
  const [papers, setPapers] = useState<GeneratedPaper[]>([]);
  const [papersTotal, setPapersTotal] = useState(0);
  const [currentPaper, setCurrentPaper] = useState<GeneratedPaper | null>(null);
  const [gradingJobs, setGradingJobs] = useState<GradingJob[]>([]);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const pollingRefs = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  const generatePaper = useCallback(async (payload: GeneratePaperPayload) => {
    setLoading(true);
    try {
      const response = await apiClient.post('/ai-tools/generate-paper', payload);
      const raw = unwrapResponse(response);
      const paper = mapPaper(raw as Record<string, unknown>);
      setCurrentPaper(paper);
      toast.success('Paper generated successfully!');
      return paper;
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to generate paper. Please try again.';
      toast.error(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPapers = useCallback(async (
    filters?: { subject?: string; grade?: number; status?: string },
    page?: number,
  ) => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = {};
      if (filters?.subject) params.subject = filters.subject;
      if (filters?.grade) params.grade = filters.grade;
      if (filters?.status) params.status = filters.status;
      if (page) params.page = page;
      const response = await apiClient.get('/ai-tools/papers', { params });
      const raw = unwrapResponse(response);
      const papersData = raw.papers ?? (Array.isArray(raw) ? raw : []);
      setPapers(
        (papersData as Record<string, unknown>[]).map(mapPaper),
      );
      setPapersTotal(typeof raw.total === 'number' ? raw.total : papersData.length);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to load papers';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPaperById = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/ai-tools/papers/${id}`);
      const raw = unwrapResponse(response);
      const paper = mapPaper(raw as Record<string, unknown>);
      setCurrentPaper(paper);
      return paper;
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to load paper';
      toast.error(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const savePaper = useCallback(async (
    id: string,
    updates: Partial<{ subject: string; topic: string; difficulty: string; duration: number; totalMarks: number; sections: PaperSection[]; memorandum: string }>,
  ) => {
    try {
      const response = await apiClient.put(`/ai-tools/papers/${id}`, updates);
      const raw = unwrapResponse(response);
      const paper = mapPaper(raw as Record<string, unknown>);
      setCurrentPaper(paper);
      setPapers(prev => prev.map(p => p.id === id ? paper : p));
      toast.success('Paper saved successfully!');
      return paper;
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to save paper';
      toast.error(msg);
      return null;
    }
  }, []);

  const deletePaper = useCallback(async (id: string) => {
    try {
      await apiClient.put(`/ai-tools/papers/${id}`, { isDeleted: true });
      setPapers(prev => prev.filter(p => p.id !== id));
      toast.success('Paper deleted');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to delete paper';
      toast.error(msg);
    }
  }, []);

  const regenerateQuestion = useCallback(async (
    paperId: string,
    sectionIndex: number,
    questionIndex: number,
  ) => {
    try {
      const response = await apiClient.post(
        `/ai-tools/papers/${paperId}/regenerate-question`,
        { sectionIndex, questionIndex },
      );
      const raw = unwrapResponse(response);
      const paper = mapPaper(raw as Record<string, unknown>);
      setCurrentPaper(paper);
      toast.success('Question regenerated!');
      return paper;
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to regenerate question';
      toast.error(msg);
      return null;
    }
  }, []);

  const submitGrade = useCallback(async (payload: GradePayload) => {
    try {
      const response = await apiClient.post('/ai-tools/grade', payload);
      const raw = unwrapResponse(response);
      const job = mapJob(raw as Record<string, unknown>);
      setGradingJobs(prev => [...prev, job]);
      return job;
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to submit for grading';
      toast.error(msg);
      return null;
    }
  }, []);

  const submitBulkGrade = useCallback(async (payload: BulkGradePayload) => {
    try {
      const response = await apiClient.post('/ai-tools/grade/bulk', payload);
      const raw = unwrapResponse(response);
      const jobs = (Array.isArray(raw) ? raw : [raw]).map(
        (j: unknown) => mapJob(j as Record<string, unknown>),
      );
      setGradingJobs(prev => [...prev, ...jobs]);
      return jobs;
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to submit bulk grading';
      toast.error(msg);
      return [];
    }
  }, []);

  const pollGradingJob = useCallback((jobId: string, onComplete?: (job: GradingJob) => void) => {
    if (pollingRefs.current.has(jobId)) return;
    const interval = setInterval(async () => {
      try {
        const response = await apiClient.get(`/ai-tools/grade/${jobId}`);
        const raw = unwrapResponse(response);
        const job = mapJob(raw as Record<string, unknown>);
        setGradingJobs(prev => prev.map(j => j.id === jobId ? job : j));
        if (['completed', 'reviewed', 'published'].includes(job.status)) {
          clearInterval(interval);
          pollingRefs.current.delete(jobId);
          onComplete?.(job);
        }
      } catch {
        clearInterval(interval);
        pollingRefs.current.delete(jobId);
      }
    }, 3000);
    pollingRefs.current.set(jobId, interval);
  }, []);

  const stopAllPolling = useCallback(() => {
    pollingRefs.current.forEach(interval => clearInterval(interval));
    pollingRefs.current.clear();
  }, []);

  const reviewGrade = useCallback(async (jobId: string, finalMark: number, teacherNotes?: string) => {
    try {
      const response = await apiClient.post(`/ai-tools/grade/${jobId}/review`, {
        finalMark,
        teacherNotes: teacherNotes ?? '',
      });
      const raw = unwrapResponse(response);
      const job = mapJob(raw as Record<string, unknown>);
      setGradingJobs(prev => prev.map(j => j.id === jobId ? job : j));
      toast.success('Grade reviewed successfully');
      return job;
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to review grade';
      toast.error(msg);
      return null;
    }
  }, []);

  const publishGrade = useCallback(async (jobId: string) => {
    try {
      const response = await apiClient.post(`/ai-tools/grade/${jobId}/publish`);
      const raw = unwrapResponse(response);
      const job = mapJob(raw as Record<string, unknown>);
      setGradingJobs(prev => prev.map(j => j.id === jobId ? job : j));
      toast.success('Grade published');
      return job;
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to publish grade';
      toast.error(msg);
      return null;
    }
  }, []);

  const markPaperFromImage = useCallback(async (payload: MarkPaperPayload): Promise<MarkPaperResult | null> => {
    setLoading(true);
    try {
      const response = await apiClient.post('/ai-tools/mark-paper', payload);
      const raw = unwrapResponse(response);
      toast.success('Paper marked successfully!');
      return raw as MarkPaperResult;
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to mark paper. Please try again.';
      toast.error(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUsageStats = useCallback(async (startDate?: string, endDate?: string) => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const response = await apiClient.get('/ai-tools/usage', { params });
      const raw = unwrapResponse(response);
      setUsageStats(raw as UsageStats);
    } catch {
      console.error('Failed to load usage stats');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    papers, papersTotal,
    currentPaper, setCurrentPaper,
    gradingJobs, setGradingJobs,
    usageStats,
    generatePaper,
    markPaperFromImage,
    loadPapers,
    loadPaperById,
    savePaper,
    deletePaper,
    regenerateQuestion,
    submitGrade,
    submitBulkGrade,
    pollGradingJob,
    stopAllPolling,
    reviewGrade,
    publishGrade,
    loadUsageStats,
  };
}
