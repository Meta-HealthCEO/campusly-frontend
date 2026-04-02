import { useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import { useMigrationStore } from '@/stores/useMigrationStore';
import type {
  MigrationJob,
  MigrationPreview,
  MigrationTemplate,
  MigrationHistoryResponse,
  UploadFileInput,
} from '@/types/migration';

function extractError(err: unknown, fallback: string): string {
  const e = err as {
    response?: { data?: { error?: string; message?: string } };
  };
  return (
    e?.response?.data?.error ??
    e?.response?.data?.message ??
    (err instanceof Error ? err.message : fallback)
  );
}

function mapJob(raw: Record<string, unknown>): MigrationJob {
  return { ...raw, id: (raw._id as string) ?? (raw.id as string) } as MigrationJob;
}

function mapTemplate(raw: Record<string, unknown>): MigrationTemplate {
  return { ...raw, id: (raw._id as string) ?? (raw.id as string) } as MigrationTemplate;
}

export function useMigrationApi() {
  const setActiveJob = useMigrationStore((s) => s.setActiveJob);
  const setActiveJobLoading = useMigrationStore((s) => s.setActiveJobLoading);
  const setActiveJobError = useMigrationStore((s) => s.setActiveJobError);
  const mergeActiveJobMapping = useMigrationStore((s) => s.mergeActiveJobMapping);
  const setWizardStep = useMigrationStore((s) => s.setWizardStep);
  const setPreview = useMigrationStore((s) => s.setPreview);
  const setPreviewLoading = useMigrationStore((s) => s.setPreviewLoading);
  const setJobs = useMigrationStore((s) => s.setJobs);
  const setJobsLoading = useMigrationStore((s) => s.setJobsLoading);
  const setJobsError = useMigrationStore((s) => s.setJobsError);
  const setTemplates = useMigrationStore((s) => s.setTemplates);
  const setTemplatesLoading = useMigrationStore((s) => s.setTemplatesLoading);

  const uploadFile = useCallback(async (payload: UploadFileInput): Promise<MigrationJob> => {
    setActiveJobLoading(true);
    setActiveJobError(null);
    try {
      const response = await apiClient.post('/migration/upload', payload);
      const raw = unwrapResponse(response);
      const job = mapJob(raw as Record<string, unknown>);
      setActiveJob(job);
      setActiveJobLoading(false);
      setWizardStep(3);
      return job;
    } catch (err: unknown) {
      const msg = extractError(err, 'Upload failed');
      setActiveJobLoading(false);
      setActiveJobError(msg);
      throw err;
    }
  }, [setActiveJob, setActiveJobLoading, setActiveJobError, setWizardStep]);

  const validateJob = useCallback(async (jobId: string): Promise<MigrationJob> => {
    setActiveJobLoading(true);
    setActiveJobError(null);
    try {
      const response = await apiClient.get(`/migration/${jobId}/validate`);
      const raw = unwrapResponse(response);
      const job = mapJob(raw as Record<string, unknown>);
      setActiveJob(job);
      setActiveJobLoading(false);
      const hasBlockingErrors = job.validationResults?.errors?.some((e) => e.row === 0) ?? false;
      if (!hasBlockingErrors) {
        setWizardStep(5);
      }
      return job;
    } catch (err: unknown) {
      const msg = extractError(err, 'Validation failed');
      setActiveJobLoading(false);
      setActiveJobError(msg);
      throw err;
    }
  }, [setActiveJob, setActiveJobLoading, setActiveJobError, setWizardStep]);

  const getPreview = useCallback(async (jobId: string) => {
    setPreviewLoading(true);
    try {
      const response = await apiClient.get(`/migration/${jobId}/preview`);
      const raw = unwrapResponse(response);
      setPreview(raw as MigrationPreview);
    } catch {
      // silently fail
    } finally {
      setPreviewLoading(false);
    }
  }, [setPreview, setPreviewLoading]);

  const updateMapping = useCallback(
    async (jobId: string, mapping: Record<string, string>): Promise<MigrationJob> => {
      setActiveJobLoading(true);
      setActiveJobError(null);
      try {
        const response = await apiClient.put(`/migration/${jobId}/mapping`, { mapping });
        const raw = unwrapResponse(response);
        const job = mapJob(raw as Record<string, unknown>);
        mergeActiveJobMapping(job.mapping);
        setActiveJobLoading(false);
        return job;
      } catch (err: unknown) {
        const msg = extractError(err, 'Failed to update mapping');
        setActiveJobLoading(false);
        setActiveJobError(msg);
        throw err;
      }
    },
    [setActiveJobLoading, setActiveJobError, mergeActiveJobMapping],
  );

  const executeImport = useCallback(async (jobId: string): Promise<MigrationJob> => {
    setActiveJobLoading(true);
    setActiveJobError(null);
    try {
      const response = await apiClient.post(`/migration/${jobId}/execute`);
      const raw = unwrapResponse(response);
      const job = mapJob(raw as Record<string, unknown>);
      setActiveJob(job);
      setActiveJobLoading(false);
      return job;
    } catch (err: unknown) {
      const msg = extractError(err, 'Import failed');
      setActiveJobLoading(false);
      setActiveJobError(msg);
      throw err;
    }
  }, [setActiveJob, setActiveJobLoading, setActiveJobError]);

  const pollStatus = useCallback(async (jobId: string): Promise<MigrationJob> => {
    try {
      const response = await apiClient.get(`/migration/${jobId}/status`);
      const raw = unwrapResponse(response);
      const job = mapJob(raw as Record<string, unknown>);
      setActiveJob(job);
      return job;
    } catch (err: unknown) {
      throw err;
    }
  }, [setActiveJob]);

  const fetchHistory = useCallback(
    async (params?: { page?: number; limit?: number; status?: string }) => {
      setJobsLoading(true);
      setJobsError(null);
      try {
        const { jobsPage, jobsLimit, jobsStatusFilter } = useMigrationStore.getState();
        const query: Record<string, string | number> = {
          page: params?.page ?? jobsPage,
          limit: params?.limit ?? jobsLimit,
        };
        const status = params?.status ?? jobsStatusFilter;
        if (status) query.status = status;

        const response = await apiClient.get('/migration/history', { params: query });
        const raw = unwrapResponse(response);
        const historyData = raw as MigrationHistoryResponse;
        const jobsArr = Array.isArray(historyData.data)
          ? historyData.data.map((j) => mapJob(j as unknown as Record<string, unknown>))
          : Array.isArray(historyData)
            ? (historyData as unknown as Record<string, unknown>[]).map(mapJob)
            : [];

        setJobs(
          jobsArr,
          historyData.total ?? jobsArr.length,
          historyData.page ?? 1,
          historyData.limit ?? 10,
        );
      } catch (err: unknown) {
        const msg = extractError(err, 'Failed to load history');
        setJobsError(msg);
      } finally {
        setJobsLoading(false);
      }
    },
    [setJobs, setJobsLoading, setJobsError],
  );

  const fetchTemplates = useCallback(
    async (sourceSystem?: string, entityType?: string) => {
      setTemplatesLoading(true);
      try {
        const params: Record<string, string> = {};
        if (sourceSystem) params.sourceSystem = sourceSystem;
        if (entityType) params.entityType = entityType;
        const response = await apiClient.get('/migration/templates', { params });
        const raw = unwrapResponse(response);
        const arr = Array.isArray(raw) ? raw : [];
        setTemplates(arr.map((t) => mapTemplate(t as Record<string, unknown>)));
      } catch {
        // silently fail
      } finally {
        setTemplatesLoading(false);
      }
    },
    [setTemplates, setTemplatesLoading],
  );

  return {
    uploadFile,
    validateJob,
    getPreview,
    updateMapping,
    executeImport,
    pollStatus,
    fetchHistory,
    fetchTemplates,
  };
}
