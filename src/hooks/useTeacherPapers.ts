'use client';

import { useCallback, useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse, unwrapList } from '@/lib/api-helpers';
import { toast } from 'sonner';
import type {
  Paper,
  PaperMemo,
  GeneratePaperRequest,
  CreatePaperManualInput,
  AddQuestionInput,
} from '@/types/papers';

const API_PREFIX = '/question-bank/papers';

interface PaperFilters {
  subjectId?: string;
  gradeId?: string;
  term?: number;
  year?: number;
  status?: string;
}

interface UseTeacherPapersResult {
  papers: Paper[];
  loading: boolean;
  fetchPapers: (overrideFilters?: PaperFilters) => Promise<void>;
  filters: PaperFilters;
  setFilters: (f: PaperFilters) => void;
  getPaperById: (id: string) => Promise<Paper | null>;
  getMemoByPaperId: (id: string) => Promise<PaperMemo | null>;
  generatePaperWithAI: (
    input: GeneratePaperRequest,
  ) => Promise<{ paperId: string } | null>;
  createPaperManual: (input: CreatePaperManualInput) => Promise<Paper | null>;
  updatePaperMetadata: (id: string, patch: Partial<Paper>) => Promise<Paper | null>;
  addQuestion: (
    paperId: string,
    sectionIdx: number,
    input: AddQuestionInput,
  ) => Promise<Paper | null>;
  updateQuestion: (
    paperId: string,
    sectionIdx: number,
    position: number,
    patch: Partial<AddQuestionInput>,
  ) => Promise<Paper | null>;
  regenerateQuestion: (
    paperId: string,
    sectionIdx: number,
    position: number,
  ) => Promise<Paper | null>;
  deleteQuestion: (
    paperId: string,
    sectionIdx: number,
    position: number,
  ) => Promise<boolean>;
  updateMemo: (
    paperId: string,
    sections: PaperMemo['sections'],
  ) => Promise<boolean>;
  finalisePaper: (id: string) => Promise<Paper | null>;
  downloadPaperPdf: (id: string) => Promise<void>;
  downloadMemoPdf: (id: string) => Promise<void>;
  deletePaper: (id: string) => Promise<boolean>;
}

export function useTeacherPapers(): UseTeacherPapersResult {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFiltersState] = useState<PaperFilters>({});

  const fetchPapers = useCallback(async (
    overrideFilters?: PaperFilters,
  ): Promise<void> => {
    setLoading(true);
    try {
      const params = overrideFilters ?? filters;
      const res = await apiClient.get(API_PREFIX, { params });
      setPapers(unwrapList<Paper>(res));
    } catch (err: unknown) {
      console.error('Failed to load papers', err);
      setPapers([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void fetchPapers();
  }, [fetchPapers]);

  const setFilters = useCallback((f: PaperFilters): void => {
    setFiltersState(f);
  }, []);

  const getPaperById = useCallback(async (id: string): Promise<Paper | null> => {
    try {
      const res = await apiClient.get(`${API_PREFIX}/${id}`);
      return unwrapResponse<Paper>(res);
    } catch (err: unknown) {
      console.error(err);
      return null;
    }
  }, []);

  const getMemoByPaperId = useCallback(async (id: string): Promise<PaperMemo | null> => {
    try {
      const res = await apiClient.get(`${API_PREFIX}/${id}/memo`);
      return unwrapResponse<PaperMemo>(res);
    } catch (err: unknown) {
      console.error(err);
      return null;
    }
  }, []);

  const generatePaperWithAI = useCallback(async (
    input: GeneratePaperRequest,
  ): Promise<{ paperId: string } | null> => {
    try {
      const res = await apiClient.post(`${API_PREFIX}/generate`, input);
      const data = unwrapResponse<{ paperId?: string; _id?: string }>(res);
      const paperId = data.paperId ?? data._id ?? '';
      toast.success('Paper generated');
      return { paperId };
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'AI generation failed');
      return null;
    }
  }, []);

  const createPaperManual = useCallback(async (
    input: CreatePaperManualInput,
  ): Promise<Paper | null> => {
    try {
      const res = await apiClient.post(API_PREFIX, input);
      const paper = unwrapResponse<Paper>(res);
      toast.success('Paper created');
      return paper;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Create failed');
      return null;
    }
  }, []);

  const updatePaperMetadata = useCallback(async (
    id: string,
    patch: Partial<Paper>,
  ): Promise<Paper | null> => {
    try {
      const res = await apiClient.put(`${API_PREFIX}/${id}`, patch);
      return unwrapResponse<Paper>(res);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
      return null;
    }
  }, []);

  const addQuestion = useCallback(async (
    paperId: string,
    sectionIdx: number,
    input: AddQuestionInput,
  ): Promise<Paper | null> => {
    try {
      const res = await apiClient.post(
        `${API_PREFIX}/${paperId}/sections/${sectionIdx}/questions`,
        input,
      );
      return unwrapResponse<Paper>(res);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Add failed');
      return null;
    }
  }, []);

  const updateQuestion = useCallback(async (
    paperId: string,
    sectionIdx: number,
    position: number,
    patch: Partial<AddQuestionInput>,
  ): Promise<Paper | null> => {
    try {
      const res = await apiClient.put(
        `${API_PREFIX}/${paperId}/sections/${sectionIdx}/questions/${position}`,
        patch,
      );
      return unwrapResponse<Paper>(res);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
      return null;
    }
  }, []);

  const regenerateQuestion = useCallback(async (
    paperId: string,
    sectionIdx: number,
    position: number,
  ): Promise<Paper | null> => {
    try {
      const res = await apiClient.post(
        `${API_PREFIX}/${paperId}/sections/${sectionIdx}/questions/${position}/regenerate`,
      );
      return unwrapResponse<Paper>(res);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Regenerate failed');
      return null;
    }
  }, []);

  const deleteQuestion = useCallback(async (
    paperId: string,
    sectionIdx: number,
    position: number,
  ): Promise<boolean> => {
    try {
      await apiClient.delete(
        `${API_PREFIX}/${paperId}/sections/${sectionIdx}/questions/${position}`,
      );
      return true;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
      return false;
    }
  }, []);

  const updateMemo = useCallback(async (
    paperId: string,
    sections: PaperMemo['sections'],
  ): Promise<boolean> => {
    try {
      await apiClient.put(`${API_PREFIX}/${paperId}/memo`, { sections });
      return true;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Memo update failed');
      return false;
    }
  }, []);

  const finalisePaper = useCallback(async (id: string): Promise<Paper | null> => {
    try {
      const res = await apiClient.post(`${API_PREFIX}/${id}/finalise`);
      const paper = unwrapResponse<Paper>(res);
      toast.success('Paper finalised');
      return paper;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Finalise failed');
      return null;
    }
  }, []);

  const downloadPaperPdf = useCallback(async (id: string): Promise<void> => {
    try {
      const res = await apiClient.get(`${API_PREFIX}/${id}/pdf`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(
        new Blob([res.data], { type: 'application/pdf' }),
      );
      const a = document.createElement('a');
      a.href = url;
      a.download = `paper-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Download failed');
    }
  }, []);

  const downloadMemoPdf = useCallback(async (id: string): Promise<void> => {
    try {
      const res = await apiClient.get(`${API_PREFIX}/${id}/memo-pdf`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(
        new Blob([res.data], { type: 'application/pdf' }),
      );
      const a = document.createElement('a');
      a.href = url;
      a.download = `memo-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Download failed');
    }
  }, []);

  const deletePaper = useCallback(async (id: string): Promise<boolean> => {
    try {
      await apiClient.delete(`${API_PREFIX}/${id}`);
      await fetchPapers();
      return true;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
      return false;
    }
  }, [fetchPapers]);

  return {
    papers,
    loading,
    fetchPapers,
    filters,
    setFilters,
    getPaperById,
    getMemoByPaperId,
    generatePaperWithAI,
    createPaperManual,
    updatePaperMetadata,
    addQuestion,
    updateQuestion,
    regenerateQuestion,
    deleteQuestion,
    updateMemo,
    finalisePaper,
    downloadPaperPdf,
    downloadMemoPdf,
    deletePaper,
  };
}
