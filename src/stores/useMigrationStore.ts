import { create } from 'zustand';
import type {
  MigrationJob,
  MigrationPreview,
  MigrationTemplate,
  MigrationStatus,
  WizardStep,
} from '@/types/migration';

interface MigrationState {
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

  // State setters
  setActiveJob: (job: MigrationJob | null) => void;
  setActiveJobLoading: (loading: boolean) => void;
  setActiveJobError: (error: string | null) => void;
  mergeActiveJobMapping: (mapping: Record<string, string>) => void;
  setWizardStep: (step: WizardStep) => void;
  setPreview: (preview: MigrationPreview | null) => void;
  setPreviewLoading: (loading: boolean) => void;
  setJobs: (jobs: MigrationJob[], total: number, page: number, limit: number) => void;
  setJobsLoading: (loading: boolean) => void;
  setJobsError: (error: string | null) => void;
  setJobsStatusFilter: (status: MigrationStatus | '') => void;
  setTemplates: (templates: MigrationTemplate[]) => void;
  setTemplatesLoading: (loading: boolean) => void;
  resetWizard: () => void;
}

export const useMigrationStore = create<MigrationState>((set) => ({
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

  setActiveJob: (job) => set({ activeJob: job }),
  setActiveJobLoading: (loading) => set({ activeJobLoading: loading }),
  setActiveJobError: (error) => set({ activeJobError: error }),
  mergeActiveJobMapping: (mapping) =>
    set((s) =>
      s.activeJob
        ? { activeJob: { ...s.activeJob, mapping } }
        : {},
    ),
  setWizardStep: (step) => set({ wizardStep: step }),
  setPreview: (preview) => set({ preview }),
  setPreviewLoading: (loading) => set({ previewLoading: loading }),
  setJobs: (jobs, total, page, limit) =>
    set({ jobs, jobsTotal: total, jobsPage: page, jobsLimit: limit }),
  setJobsLoading: (loading) => set({ jobsLoading: loading }),
  setJobsError: (error) => set({ jobsError: error }),
  setJobsStatusFilter: (status) => set({ jobsStatusFilter: status }),
  setTemplates: (templates) => set({ templates }),
  setTemplatesLoading: (loading) => set({ templatesLoading: loading }),
  resetWizard: () =>
    set({ activeJob: null, preview: null, wizardStep: 1, activeJobError: null }),
}));
