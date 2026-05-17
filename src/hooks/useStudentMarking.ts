import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { unwrapResponse, unwrapList, extractErrorMessage } from '@/lib/api-helpers';
import type { PaperMarking } from '@/hooks/useTeacherMarking';

export interface StudentMarkingSummary {
  id: string;
  paperId: string;
  paperTitle: string;
  subjectId: string;
  subjectName: string;
  totalMarks: number;
  maxMarks: number;
  percentage: number;
  issuedAt: string;
}

export interface StudentMarkingDetail extends PaperMarking {
  paperTitle: string;
  subjectId: string;
  subjectName: string;
}

export function useStudentMarking() {
  const [loading, setLoading] = useState(false);

  const getMarkingByPaper = useCallback(async (paperId: string): Promise<StudentMarkingSummary | null> => {
    setLoading(true);
    try {
      const res = await apiClient.get('/ai-tools/students/me/markings', { params: { paperId } });
      const list = unwrapList<StudentMarkingSummary>(res);
      return list[0] ?? null;
    } catch (err: unknown) {
      console.error('Failed to load marking by paper', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getMarking = useCallback(async (id: string): Promise<StudentMarkingDetail | null> => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/ai-tools/students/me/markings/${id}`);
      return unwrapResponse<StudentMarkingDetail>(res);
    } catch (err: unknown) {
      console.error('Failed to load marking detail', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const downloadMarkingPdf = useCallback(async (id: string, studentName: string, paperTitle: string): Promise<void> => {
    try {
      const res = await apiClient.get(`/ai-tools/markings/${id}/pdf`, { responseType: 'blob' });
      const blob = new Blob([res.data as BlobPart], { type: 'application/pdf' });
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

  return { loading, getMarkingByPaper, getMarking, downloadMarkingPdf };
}
