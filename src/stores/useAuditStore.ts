import { create } from 'zustand';

type AuditAction = 'create' | 'update' | 'delete' | 'login' | 'export';

interface AuditChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

interface AuditLogUser {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface AuditLog {
  _id: string;
  userId: AuditLogUser;
  schoolId?: string;
  action: AuditAction;
  entity: string;
  entityId?: string;
  changes: AuditChange[];
  ipAddress?: string;
  userAgent?: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuditFilterParams {
  page?: number;
  limit?: number;
  userId?: string;
  entity?: string;
  action?: AuditAction;
  startDate?: string;
  endDate?: string;
  schoolId?: string;
}

export interface AuditSchool {
  _id: string;
  name: string;
}

interface AuditState {
  logs: AuditLog[];
  total: number;
  loading: boolean;
  error: string | null;
  filters: AuditFilterParams;
  exporting: boolean;
  exportError: string | null;
  schools: AuditSchool[];

  // State setters
  setLogs: (logs: AuditLog[], total: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setFilter: (patch: Partial<AuditFilterParams>) => void;
  resetFilters: () => void;
  setExporting: (exporting: boolean) => void;
  setExportError: (error: string | null) => void;
  setSchools: (schools: AuditSchool[]) => void;
}

const DEFAULT_FILTERS: AuditFilterParams = { page: 1, limit: 20 };

export const useAuditStore = create<AuditState>((set) => ({
  logs: [],
  total: 0,
  loading: false,
  error: null,
  filters: { ...DEFAULT_FILTERS },
  exporting: false,
  exportError: null,
  schools: [],

  setLogs: (logs, total) => set({ logs, total }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  setFilter: (patch) => {
    set((state) => {
      const isPageOnly =
        Object.keys(patch).length === 1 && 'page' in patch;
      const newFilters = {
        ...state.filters,
        ...patch,
        ...(isPageOnly ? {} : { page: 1 }),
      };
      return { filters: newFilters };
    });
  },

  resetFilters: () => set({ filters: { ...DEFAULT_FILTERS } }),

  setExporting: (exporting) => set({ exporting }),
  setExportError: (error) => set({ exportError: error }),
  setSchools: (schools) => set({ schools }),
}));
