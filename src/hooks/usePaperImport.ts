'use client';

import { useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import type { CreatePaperImportPayload, PaperImportJob, PaperImportJobStatus } from '@/types';

interface ListParams {
  status?: PaperImportJobStatus;
  limit?: number;
  offset?: number;
}

export function usePaperImport() {
  const createJob = useCallback(async (payload: CreatePaperImportPayload): Promise<PaperImportJob> => {
    const form = new FormData();
    form.append('subjectId', payload.subjectId);
    form.append('gradeId', payload.gradeId);
    form.append('term', String(payload.term));
    form.append('curriculumNodeId', payload.curriculumNodeId);
    form.append('generateAnswers', String(payload.generateAnswers));
    form.append('addHints', String(payload.addHints));
    form.append('addWorkedExample', String(payload.addWorkedExample));
    form.append('addExplanations', String(payload.addExplanations));
    if (payload.instructions) form.append('instructions', payload.instructions);
    form.append('source', payload.file);
    const response = await apiClient.post('/paper-imports', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return unwrapResponse<PaperImportJob>(response);
  }, []);

  const listJobs = useCallback(async (params?: ListParams): Promise<{ items: PaperImportJob[]; total: number }> => {
    const response = await apiClient.get('/paper-imports', { params });
    const raw = response.data;
    return {
      items: (raw.data as PaperImportJob[]) ?? [],
      total: raw.total ?? 0,
    };
  }, []);

  const getJob = useCallback(async (jobId: string): Promise<PaperImportJob> => {
    const response = await apiClient.get(`/paper-imports/${jobId}`);
    return unwrapResponse<PaperImportJob>(response);
  }, []);

  const cancelJob = useCallback(async (jobId: string): Promise<void> => {
    await apiClient.post(`/paper-imports/${jobId}/cancel`);
  }, []);

  const deleteJob = useCallback(async (jobId: string): Promise<void> => {
    await apiClient.delete(`/paper-imports/${jobId}`);
  }, []);

  const sourceUrl = useCallback((jobId: string): string => {
    return `${apiClient.defaults.baseURL ?? ''}/paper-imports/${jobId}/source`;
  }, []);

  return { createJob, listJobs, getJob, cancelJob, deleteJob, sourceUrl };
}
