'use client';

import { useCallback, useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { extractErrorMessage, unwrapResponse } from '@/lib/api-helpers';
import { toast } from 'sonner';
import type {
  Paper,
  PaperMemo,
  GeneratePaperRequest,
  CreatePaperManualInput,
  AddQuestionInput,
} from '@/types/papers';
import type { PaperFilters, UseTeacherPapersResult, PaperListResponse } from './useTeacherPapers.types';

export type { PaperFilters, UseTeacherPapersResult } from './useTeacherPapers.types';

const API_PREFIX = '/question-bank/papers';


export function useTeacherPapers(autoFetch = true): UseTeacherPapersResult {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFiltersState] = useState<PaperFilters>({ page: 1, limit: 100 });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(100);

  const fetchPapers = useCallback(async (
    overrideFilters?: PaperFilters,
  ): Promise<void> => {
    setLoading(true);
    try {
      const params = overrideFilters ?? filters;
      const res = await apiClient.get(API_PREFIX, { params });
      const data = unwrapResponse<PaperListResponse | Paper[]>(res);
      if (Array.isArray(data)) {
        setPapers(data);
        setTotal(data.length);
        setPage(1);
        setLimit(data.length || 100);
      } else {
        setPapers(data.papers ?? []);
        setTotal(data.total ?? 0);
        setPage(data.page ?? 1);
        setLimit(data.limit ?? 100);
      }
    } catch (err: unknown) {
      const msg = extractErrorMessage(err, 'Failed to load papers');
      toast.error(msg);
      setPapers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    if (!autoFetch) return;
    void fetchPapers();
  }, [autoFetch, fetchPapers]);

  const setFilters = useCallback((f: PaperFilters): void => {
    setFiltersState({ page: 1, limit: 100, ...f });
  }, []);

  const getPaperById = useCallback(async (id: string): Promise<Paper | null> => {
    try {
      const res = await apiClient.get(`${API_PREFIX}/${id}`);
      return unwrapResponse<Paper>(res);
    } catch {
      return null;
    }
  }, []);

  const getMemoByPaperId = useCallback(async (id: string): Promise<PaperMemo | null> => {
    try {
      const res = await apiClient.get(`${API_PREFIX}/${id}/memo`);
      return unwrapResponse<PaperMemo>(res);
    } catch {
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
      toast.error(extractErrorMessage(err, 'AI generation failed'));
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
      toast.error(extractErrorMessage(err, 'Create failed'));
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
      toast.error(extractErrorMessage(err, 'Update failed'));
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
      toast.error(extractErrorMessage(err, 'Add failed'));
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
      toast.error(extractErrorMessage(err, 'Update failed'));
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
      toast.error(extractErrorMessage(err, 'Regenerate failed'));
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
      toast.error(extractErrorMessage(err, 'Delete failed'));
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
      toast.error(extractErrorMessage(err, 'Memo update failed'));
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
      toast.error(extractErrorMessage(err, 'Finalise failed'));
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
      window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Download failed'));
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
      window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Download failed'));
    }
  }, []);

  const deletePaper = useCallback(async (id: string): Promise<boolean> => {
    try {
      await apiClient.delete(`${API_PREFIX}/${id}`);
      await fetchPapers();
      toast.success('Paper deleted');
      return true;
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err, 'Delete failed'));
      return false;
    }
  }, [fetchPapers]);

  return {
    papers,
    loading,
    total,
    page,
    limit,
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
