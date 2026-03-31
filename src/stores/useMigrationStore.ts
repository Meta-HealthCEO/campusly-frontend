import { create } from 'zustand';
import apiClient from '@/lib/api-client';

function extractError(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { error?: string; message?: string } } };
  return e?.response?.data?.error ?? e?.response?.data?.message ?? (err instanceof Error ? err.message : fallback);
}
import type {
  MigrationJob,
  MigrationPreview,
  MigrationTemplate,
  MigrationStatus,
  UploadFileInput,
  WizardStep,
  MigrationHistoryResponse,
} from '@/types/migration';

function mapJob(raw: Record<string, unknown>): MigrationJob {
  return { ...raw, id: (raw._id as string) ?? (raw.id as string) } as MigrationJob;
}

function mapTemplate(raw: Record<string, unknown>): MigrationTemplate {
  return { ...raw, id: (raw._id as string) ?? (raw.id as string) } as MigrationTemplate;
}

interface MigrationStore {
  activeJob: MigrationJob | null;
  activeJobLoading: boolean;
  activeJobError: string | null;
  wizardStep: WizardStep;
  preview: MigrationPreview | null;
  previewLoading: boolean;
  jobs: MigrationJob[];
  jobsTotal: number;
  jobsPage: number;
  jobsLimit: number;
  jobsStatusFilter: MigrationStatus | '';
  jobsLoading: boolean;
  jobsError: string | null;
  templates: MigrationTemplate[];
  templatesLoading: boolean;
  uploadFile: (payload: UploadFileInput) => Promise<MigrationJob>;
  validateJob: (jobId: string) => Promise<MigrationJob>;
  getPreview: (jobId: string) => Promise<void>;
  updateMapping: (jobId: string, mapping: Record<string, string>) => Promise<MigrationJob>;
  executeImport: (jobId: string) => Promise<MigrationJob>;
  pollStatus: (jobId: string) => Promise<MigrationJob>;
  fetchHistory: (params?: { page?: number; limit?: number; status?: string }) => Promise<void>;
  fetchTemplates: (sourceSystem?: string, entityType?: string) => Promise<void>;
  setActiveJob: (job: MigrationJob | null) => void;
  setWizardStep: (step: WizardStep) => void;
  setJobsStatusFilter: (status: MigrationStatus | '') => void;
  resetWizard: () => void;
}

export const useMigrationStore = create<MigrationStore>((set, get) => ({
  activeJob: null,
  activeJobLoading: false,
  activeJobError: null,
  wizardStep: 1,
  preview: null,
  previewLoading: false,
  jobs: [],
  jobsTotal: 0,
  jobsPage: 1,
  jobsLimit: 10,
  jobsStatusFilter: '',
  jobsLoading: false,
  jobsError: null,
  templates: [],
  templatesLoading: false,

  uploadFile: async (payload) => {
    set({ activeJobLoading: true, activeJobError: null });
    try {
      const response = await apiClient.post('/migration/upload', payload);
      const raw = response.data.data ?? response.data;
      const job = mapJob(raw as Record<string, unknown>);
      set({ activeJob: job, activeJobLoading: false, wizardStep: 3 });
      return job;
    } catch (err) {
      const msg = extractError(err, 'Upload failed');
      set({ activeJobLoading: false, activeJobError: msg });
      throw err;
    }
  },

  validateJob: async (jobId) => {
    set({ activeJobLoading: true, activeJobError: null });
    try {
      const response = await apiClient.get(`/migration/${jobId}/validate`);
      const raw = response.data.data ?? response.data;
      const job = mapJob(raw as Record<string, unknown>);
      set({ activeJob: job, activeJobLoading: false });
      const hasBlockingErrors = job.validationResults?.errors?.some((e) => e.row === 0) ?? false;
      if (!hasBlockingErrors) {
        set({ wizardStep: 5 });
      }
      return job;
    } catch (err) {
      const msg = extractError(err, 'Validation failed');
      set({ activeJobLoading: false, activeJobError: msg });
      throw err;
    }
  },

  getPreview: async (jobId) => {
    set({ previewLoading: true });
    try {
      const response = await apiClient.get(`/migration/${jobId}/preview`);
      const raw = response.data.data ?? response.data;
      set({ preview: raw as MigrationPreview, previewLoading: false });
    } catch {
      set({ previewLoading: false });
    }
  },

  updateMapping: async (jobId, mapping) => {
    set({ activeJobLoading: true, activeJobError: null });
    try {
      const response = await apiClient.put(`/migration/${jobId}/mapping`, { mapping });
      const raw = response.data.data ?? response.data;
      const job = mapJob(raw as Record<string, unknown>);
      set((state) => ({
        activeJob: state.activeJob ? { ...state.activeJob, mapping: job.mapping } : job,
        activeJobLoading: false,
      }));
      return job;
    } catch (err) {
      const msg = extractError(err, 'Failed to update mapping');
      set({ activeJobLoading: false, activeJobError: msg });
      throw err;
    }
  },

  executeImport: async (jobId) => {
    set({ activeJobLoading: true, activeJobError: null });
    try {
      const response = await apiClient.post(`/migration/${jobId}/execute`);
      const raw = response.data.data ?? response.data;
      const job = mapJob(raw as Record<string, unknown>);
      set({ activeJob: job, activeJobLoading: false });
      return job;
    } catch (err) {
      const msg = extractError(err, 'Import failed');
      set({ activeJobLoading: false, activeJobError: msg });
      throw err;
    }
  },

  pollStatus: async (jobId) => {
    try {
      const response = await apiClient.get(`/migration/${jobId}/status`);
      const raw = response.data.data ?? response.data;
      const job = mapJob(raw as Record<string, unknown>);
      set({ activeJob: job });
      return job;
    } catch (err) {
      throw err;
    }
  },

  fetchHistory: async (params) => {
    set({ jobsLoading: true, jobsError: null });
    try {
      const { jobsPage, jobsLimit, jobsStatusFilter } = get();
      const query: Record<string, string | number> = {
        page: params?.page ?? jobsPage,
        limit: params?.limit ?? jobsLimit,
      };
      const status = params?.status ?? jobsStatusFilter;
      if (status) query.status = status;

      const response = await apiClient.get('/migration/history', { params: query });
      const raw = response.data.data ?? response.data;
      const historyData = raw as MigrationHistoryResponse;
      const jobsArr = Array.isArray(historyData.data)
        ? historyData.data.map((j) => mapJob(j as unknown as Record<string, unknown>))
        : Array.isArray(historyData)
          ? (historyData as unknown as Record<string, unknown>[]).map(mapJob)
          : [];

      set({
        jobs: jobsArr,
        jobsTotal: historyData.total ?? jobsArr.length,
        jobsPage: historyData.page ?? 1,
        jobsLimit: historyData.limit ?? 10,
        jobsLoading: false,
      });
    } catch (err) {
      const msg = extractError(err, 'Failed to load history');
      set({ jobsLoading: false, jobsError: msg });
    }
  },

  fetchTemplates: async (sourceSystem, entityType) => {
    set({ templatesLoading: true });
    try {
      const params: Record<string, string> = {};
      if (sourceSystem) params.sourceSystem = sourceSystem;
      if (entityType) params.entityType = entityType;
      const response = await apiClient.get('/migration/templates', { params });
      const raw = response.data.data ?? response.data;
      const arr = Array.isArray(raw) ? raw : [];
      set({
        templates: arr.map((t) => mapTemplate(t as Record<string, unknown>)),
        templatesLoading: false,
      });
    } catch {
      set({ templatesLoading: false });
    }
  },

  setActiveJob: (job) => set({ activeJob: job }),
  setWizardStep: (step) => set({ wizardStep: step }),
  setJobsStatusFilter: (status) => set({ jobsStatusFilter: status }),
  resetWizard: () => set({ activeJob: null, preview: null, wizardStep: 1, activeJobError: null }),
}));
