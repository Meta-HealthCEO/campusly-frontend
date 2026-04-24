import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { unwrapResponse, unwrapList } from '@/lib/api-helpers';

interface MarkingQuestion {
  questionNumber: string;
  studentAnswer: string;
  correctAnswer: string;
  marksAwarded: number;
  maxMarks: number;
  feedback: string;
}

interface PaperMarking {
  id: string;
  paperId: string;
  paperType: 'generated' | 'assessment';
  studentId?: string;
  studentName: string;
  totalMarks: number;
  maxMarks: number;
  percentage: number;
  questions: MarkingQuestion[];
  status: 'processing' | 'completed' | 'needs_review' | 'failed' | 'published';
  errorMessage?: string;
  extractedHeader: string | null;
  paperMismatch: boolean;
  mismatchReason: string | null;
  createdAt: string;
}

export interface MarkingPaperOption {
  id: string;
  title: string;
  type: 'generated' | 'assessment';
  maxMarks: number;
}

export type { PaperMarking, MarkingQuestion };

export function useTeacherMarking() {
  const [loading, setLoading] = useState(false);
  const [markings, setMarkings] = useState<PaperMarking[]>([]);
  const [currentMarking, setCurrentMarking] = useState<PaperMarking | null>(null);
  const [papers, setPapers] = useState<MarkingPaperOption[]>([]);
  const [papersLoading, setPapersLoading] = useState(false);

  const markPaper = useCallback(async (data: {
    paperId: string;
    studentName: string;
    studentId?: string;
    images: string[];
    imageTypes: string[];
  }): Promise<PaperMarking> => {
    setLoading(true);
    try {
      const res = await apiClient.post('/ai-tools/mark-paper', data);
      const marking = unwrapResponse<PaperMarking>(res);
      setCurrentMarking(marking);
      return marking;
    } catch (err: unknown) {
      console.error('Failed to mark paper', err);
      toast.error('Failed to mark paper. Please try again.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getMarkings = useCallback(async (paperId: string): Promise<void> => {
    try {
      const res = await apiClient.get('/ai-tools/markings', { params: { paperId } });
      const raw = unwrapResponse<{ markings: PaperMarking[]; total: number }>(res);
      setMarkings(raw.markings ?? []);
    } catch (err: unknown) {
      console.error('Failed to load markings', err);
      toast.error('Could not load marking history.');
    }
  }, []);

  const getMarking = useCallback(async (id: string): Promise<PaperMarking> => {
    const res = await apiClient.get(`/ai-tools/markings/${id}`);
    const marking = unwrapResponse<PaperMarking>(res);
    setCurrentMarking(marking);
    return marking;
  }, []);

  const updateMarking = useCallback(async (
    id: string,
    questions: MarkingQuestion[],
  ): Promise<void> => {
    try {
      const res = await apiClient.put(`/ai-tools/markings/${id}`, { questions });
      const updated = unwrapResponse<PaperMarking>(res);
      setCurrentMarking(updated);
      toast.success('Marks updated');
    } catch (err: unknown) {
      console.error('Failed to update marking', err);
      toast.error('Failed to update marks.');
    }
  }, []);

  const publishMarking = useCallback(async (
    id: string,
    assessmentId: string,
    studentId?: string,
    comment?: string,
  ): Promise<PaperMarking | null> => {
    try {
      const res = await apiClient.post(`/ai-tools/markings/${id}/publish`, {
        assessmentId,
        studentId,
        comment,
      });
      const updated = unwrapResponse<PaperMarking>(res);
      setCurrentMarking(updated);
      setMarkings((prev) => prev.map((m) => (m.id === id ? updated : m)));
      toast.success('Marks published to gradebook');
      return updated;
    } catch (err: unknown) {
      console.error('Failed to publish marking', err);
      toast.error('Failed to publish marks.');
      return null;
    }
  }, []);

  const fetchPapers = useCallback(async () => {
    setPapersLoading(true);
    try {
      const [genRes, assessRes] = await Promise.allSettled([
        apiClient.get('/ai-tools/papers'),
        apiClient.get('/curriculum/papers'),
      ]);
      const combined: MarkingPaperOption[] = [];
      if (genRes.status === 'fulfilled') {
        const genPapers = unwrapList<Record<string, unknown>>(genRes.value);
        for (const p of genPapers) {
          if (p.status === 'generating') continue;
          combined.push({
            id: (p.id ?? p._id) as string,
            title: `${p.subject as string} - Grade ${p.grade as number} - ${p.topic as string} (AI Paper)`,
            type: 'generated',
            maxMarks: (p.totalMarks ?? 0) as number,
          });
        }
      }
      if (assessRes.status === 'fulfilled') {
        const assessPapers = unwrapList<Record<string, unknown>>(assessRes.value);
        for (const p of assessPapers) {
          combined.push({
            id: (p.id ?? p._id) as string,
            title: ((p.title ?? p.name ?? 'Assessment') as string) + ' (Assessment)',
            type: 'assessment',
            maxMarks: (p.totalMarks ?? 0) as number,
          });
        }
      }
      setPapers(combined);
    } catch (err: unknown) {
      console.error('Failed to load papers', err);
      toast.error('Could not load papers.');
    } finally {
      setPapersLoading(false);
    }
  }, []);

  return {
    loading,
    markings,
    currentMarking,
    papers,
    papersLoading,
    markPaper,
    getMarkings,
    getMarking,
    updateMarking,
    publishMarking,
    fetchPapers,
  };
}
