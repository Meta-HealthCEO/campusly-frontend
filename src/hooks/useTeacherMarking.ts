import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { extractErrorMessage, unwrapResponse, unwrapList } from '@/lib/api-helpers';

interface MarkingQuestion {
  questionNumber: string;
  studentAnswer: string;
  correctAnswer: string;
  marksAwarded: number;
  maxMarks: number;
  feedback: string;
  rationale?: string;
}

interface PaperMarkingImage {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  pageNumber: number;
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
  paperVersion?: number;
  classId?: string | null;
  batchId?: string | null;
  images?: PaperMarkingImage[];
  imageCount?: number;
  issuedToStudent?: boolean;
  issuedAt?: string;
  issuedBy?: string;
}

export interface MarkingPaperOption {
  id: string;
  title: string;
  type: 'generated' | 'assessment';
  maxMarks: number;
  status?: string;
}

export type { PaperMarking, MarkingQuestion, PaperMarkingImage };

function resolveRefName(ref: unknown): string {
  if (typeof ref !== 'object' || ref === null) return '';
  const obj = ref as Record<string, unknown>;
  return typeof obj.name === 'string' ? obj.name : '';
}

function formatPaperType(value: unknown): string {
  return String(value ?? 'paper')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function mapAssessmentPaper(raw: Record<string, unknown>): MarkingPaperOption | null {
  const id = String(raw.id ?? raw._id ?? '');
  if (!id || raw.isDeleted === true || raw.status === 'archived') return null;

  const subject = resolveRefName(raw.subjectId);
  const grade = resolveRefName(raw.gradeId);
  const meta = [
    subject,
    grade,
    raw.term ? `Term ${raw.term}` : '',
    formatPaperType(raw.paperType),
  ].filter(Boolean);
  const status = typeof raw.status === 'string' ? raw.status : undefined;
  const statusLabel = status && status !== 'finalised' ? ` (${formatPaperType(status)})` : '';

  return {
    id,
    title: `${String(raw.title ?? 'Untitled paper')}${statusLabel}${meta.length ? ` - ${meta.join(' - ')}` : ''}`,
    type: 'assessment',
    maxMarks: Number(raw.totalMarks ?? 0),
    status,
  };
}

export function useTeacherMarking() {
  const [loading, setLoading] = useState(false);
  const [markings, setMarkings] = useState<PaperMarking[]>([]);
  const [currentMarking, setCurrentMarking] = useState<PaperMarking | null>(null);
  const [papers, setPapers] = useState<MarkingPaperOption[]>([]);
  const [papersLoading, setPapersLoading] = useState(false);
  const [papersError, setPapersError] = useState<string | null>(null);

  const markPaperFromText = useCallback(async (
    paperId: string,
    paperType: 'generated' | 'assessment',
    studentName: string,
    answers: Array<{ questionNumber: string; answer: string }>,
    options?: { studentId?: string; classId?: string },
  ): Promise<PaperMarking | null> => {
    setLoading(true);
    try {
      const res = await apiClient.post('/ai-tools/mark-paper-text', {
        paperId,
        paperType,
        studentName,
        studentId: options?.studentId,
        classId: options?.classId,
        answers,
      });
      const marking = unwrapResponse<PaperMarking>(res);
      setCurrentMarking(marking);
      return marking;
    } catch (err: unknown) {
      console.error('Failed to mark paper (text)', err);
      toast.error(err instanceof Error ? err.message : 'Failed to mark paper. Please try again.');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const markPaper = useCallback(async (
    paperId: string,
    paperType: 'generated' | 'assessment',
    studentName: string,
    files: File[],
    options?: { studentId?: string; classId?: string },
  ): Promise<PaperMarking | null> => {
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('paperId', paperId);
      fd.append('paperType', paperType);
      fd.append('studentName', studentName);
      if (options?.studentId) fd.append('studentId', options.studentId);
      if (options?.classId) fd.append('classId', options.classId);
      files.forEach((f) => fd.append('files', f));
      const res = await apiClient.post('/ai-tools/mark-paper', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const marking = unwrapResponse<PaperMarking>(res);
      setCurrentMarking(marking);
      return marking;
    } catch (err: unknown) {
      console.error('Failed to mark paper', err);
      toast.error(err instanceof Error ? err.message : 'Failed to mark paper. Please try again.');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getMarkings = useCallback(async (paperId?: string): Promise<void> => {
    try {
      // Backend treats paperId as optional — omit it to fetch ALL of the
      // teacher's markings. The History tab needs this so a teacher can land
      // on it directly without first selecting a paper.
      const params: Record<string, string | number> = { limit: 100 };
      if (paperId) params.paperId = paperId;
      const res = await apiClient.get('/ai-tools/markings', { params });
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

  const issueMarking = useCallback(async (
    id: string,
    assessmentId: string,
    studentId?: string,
    comment?: string,
  ): Promise<PaperMarking | null> => {
    try {
      const body: Record<string, unknown> = { studentId, comment };
      if (assessmentId) body.assessmentId = assessmentId;
      const res = await apiClient.post(`/ai-tools/markings/${id}/issue`, body);
      const updated = unwrapResponse<PaperMarking>(res);
      setCurrentMarking(updated);
      setMarkings((prev) => prev.map((m) => (m.id === id ? updated : m)));
      toast.success('Marking issued');
      return updated;
    } catch (err: unknown) {
      console.error('Failed to issue marking', err);
      toast.error(extractErrorMessage(err, 'Failed to issue marking.'));
      return null;
    }
  }, []);

  const fetchPapers = useCallback(async () => {
    setPapersLoading(true);
    setPapersError(null);
    try {
      const res = await apiClient.get('/question-bank/papers', {
        params: { limit: 100 },
      });
      const combined = unwrapList<Record<string, unknown>>(res)
        .map(mapAssessmentPaper)
        .filter((p): p is MarkingPaperOption => p !== null)
        .sort((a, b) => {
          if (a.status === 'finalised' && b.status !== 'finalised') return -1;
          if (a.status !== 'finalised' && b.status === 'finalised') return 1;
          return a.title.localeCompare(b.title);
        });
      setPapers(combined);
      return true;
    } catch (err: unknown) {
      const message = extractErrorMessage(err, 'Could not load papers.');
      setPapers([]);
      setPapersError(message);
      console.error('Failed to load papers', err);
      toast.error(message);
      return false;
    } finally {
      setPapersLoading(false);
    }
  }, []);

  const downloadMarkingPdf = useCallback(async (id: string, studentName: string, paperTitle: string): Promise<void> => {
    try {
      const res = await apiClient.get(`/ai-tools/markings/${id}/pdf`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const link = document.createElement('a');
      link.href = url;
      link.download = `${slug(studentName)}-${slug(paperTitle)}-marked.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      console.error('Failed to download marking PDF', err);
      toast.error(extractErrorMessage(err, 'Failed to download PDF.'));
    }
  }, []);

  return {
    loading,
    markings,
    currentMarking,
    papers,
    papersLoading,
    papersError,
    markPaper,
    markPaperFromText,
    getMarkings,
    getMarking,
    updateMarking,
    issueMarking,
    downloadMarkingPdf,
    fetchPapers,
    setCurrentMarking,
  };
}
