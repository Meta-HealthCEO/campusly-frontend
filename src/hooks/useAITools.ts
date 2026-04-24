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
import {
  mapPaper,
  mapJob,
  extractApiError,
  triggerBlobDownload,
} from './ai-tools-helpers';
import type {
  MarkPaperPayload,
  MarkPaperResult,
} from './ai-tools-helpers';

export type {
  MarkPaperQuestionResult,
  MarkPaperResult,
  MarkPaperPayload,
} from './ai-tools-helpers';

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
      toast.error(extractApiError(err, 'Failed to generate paper. Please try again.'));
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
      setPapers((papersData as Record<string, unknown>[]).map(mapPaper));
      setPapersTotal(typeof raw.total === 'number' ? raw.total : papersData.length);
    } catch (err: unknown) {
      toast.error(extractApiError(err, 'Failed to load papers'));
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
      toast.error(extractApiError(err, 'Failed to load paper'));
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
      toast.error(extractApiError(err, 'Failed to save paper'));
      return null;
    }
  }, []);

  const deletePaper = useCallback(async (id: string) => {
    try {
      await apiClient.put(`/ai-tools/papers/${id}`, { isDeleted: true });
      setPapers(prev => prev.filter(p => p.id !== id));
      toast.success('Paper deleted');
    } catch (err: unknown) {
      toast.error(extractApiError(err, 'Failed to delete paper'));
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
      toast.error(extractApiError(err, 'Failed to regenerate question'));
      return null;
    }
  }, []);

  const downloadPaperPdf = useCallback(async (id: string, filename?: string) => {
    try {
      const response = await apiClient.get(`/ai-tools/papers/${id}/pdf`, { responseType: 'blob' });
      triggerBlobDownload(response.data as Blob, filename ?? `paper-${id}.pdf`);
      toast.success('Paper downloaded');
    } catch (err: unknown) {
      toast.error(extractApiError(err, 'Failed to download paper'));
    }
  }, []);

  const downloadMemoPdf = useCallback(async (id: string, filename?: string) => {
    try {
      const response = await apiClient.get(`/ai-tools/papers/${id}/memo-pdf`, { responseType: 'blob' });
      triggerBlobDownload(response.data as Blob, filename ?? `memo-${id}.pdf`);
      toast.success('Memo downloaded');
    } catch (err: unknown) {
      toast.error(extractApiError(err, 'Failed to download memo'));
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
      toast.error(extractApiError(err, 'Failed to submit for grading'));
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
      toast.error(extractApiError(err, 'Failed to submit bulk grading'));
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
        if (['completed', 'reviewed', 'published', 'failed'].includes(job.status)) {
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
      toast.error(extractApiError(err, 'Failed to review grade'));
      return null;
    }
  }, []);

  const publishGrade = useCallback(async (jobId: string, assessmentId: string, comment?: string) => {
    try {
      const response = await apiClient.post(`/ai-tools/grade/${jobId}/publish`, { assessmentId, comment });
      const raw = unwrapResponse(response);
      const job = mapJob(raw as Record<string, unknown>);
      setGradingJobs(prev => prev.map(j => j.id === jobId ? job : j));
      toast.success('Grade published to gradebook');
      return job;
    } catch (err: unknown) {
      toast.error(extractApiError(err, 'Failed to publish grade'));
      return null;
    }
  }, []);

  const retryGrade = useCallback(async (jobId: string) => {
    try {
      const response = await apiClient.post(`/ai-tools/grade/${jobId}/retry`);
      const raw = unwrapResponse(response);
      const job = mapJob(raw as Record<string, unknown>);
      setGradingJobs(prev => prev.map(j => j.id === jobId ? job : j));
      toast.success('Grade re-queued');
      return job;
    } catch (err: unknown) {
      toast.error(extractApiError(err, 'Failed to retry grade'));
      return null;
    }
  }, []);

  const loadIncompleteGradingJobs = useCallback(async (assignmentId?: string) => {
    try {
      const response = await apiClient.get('/ai-tools/grade', {
        params: { assignmentId, status: 'queued,grading,completed,reviewed' },
      });
      const raw = unwrapResponse(response);
      const jobs = (Array.isArray(raw) ? raw : (raw as Record<string, unknown>).jobs ?? []) as Record<string, unknown>[];
      const mapped = jobs.map(mapJob);
      setGradingJobs(mapped);
      return mapped;
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status !== 404) {
        toast.error(extractApiError(err, 'Failed to load grading jobs'));
      }
      return [];
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
      toast.error(extractApiError(err, 'Failed to mark paper. Please try again.'));
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
    downloadPaperPdf,
    downloadMemoPdf,
    submitGrade,
    submitBulkGrade,
    pollGradingJob,
    stopAllPolling,
    reviewGrade,
    publishGrade,
    retryGrade,
    loadIncompleteGradingJobs,
    loadUsageStats,
  };
}
