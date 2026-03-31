import { create } from 'zustand';
import apiClient from '@/lib/api-client';

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

interface AuditState {
  logs: AuditLog[];
  total: number;
  loading: boolean;
  error: string | null;
  filters: AuditFilterParams;
  exporting: boolean;
  exportError: string | null;

  fetchLogs: () => Promise<void>;
  setFilter: (patch: Partial<AuditFilterParams>) => void;
  resetFilters: () => void;
  exportLogs: () => Promise<AuditLog[]>;
}

const DEFAULT_FILTERS: AuditFilterParams = { page: 1, limit: 20 };

export const useAuditStore = create<AuditState>((set, get) => ({
  logs: [],
  total: 0,
  loading: false,
  error: null,
  filters: { ...DEFAULT_FILTERS },
  exporting: false,
  exportError: null,

  fetchLogs: async () => {
    set({ loading: true, error: null });
    try {
      const { filters } = get();
      const params: Record<string, string | number> = {};
      if (filters.page) params.page = filters.page;
      if (filters.limit) params.limit = filters.limit;
      if (filters.userId) params.userId = filters.userId;
      if (filters.entity) params.entity = filters.entity;
      if (filters.action) params.action = filters.action;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.schoolId) params.schoolId = filters.schoolId;

      const res = await apiClient.get('/audit/logs', { params });
      const raw = res.data.data ?? res.data;
      const logs: AuditLog[] = Array.isArray(raw) ? raw : raw.logs ?? [];
      const total: number = typeof raw.total === 'number' ? raw.total : logs.length;
      set({ logs, total });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to load audit logs';
      set({ error: msg, logs: [], total: 0 });
    } finally {
      set({ loading: false });
    }
  },

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

  resetFilters: () => {
    set({ filters: { ...DEFAULT_FILTERS } });
  },

  exportLogs: async () => {
    set({ exporting: true, exportError: null });
    try {
      const { filters } = get();
      const params: Record<string, string> = {};
      if (filters.userId) params.userId = filters.userId;
      if (filters.entity) params.entity = filters.entity;
      if (filters.action) params.action = filters.action;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.schoolId) params.schoolId = filters.schoolId;

      const res = await apiClient.get('/audit/logs/export', { params });
      const raw = res.data.data ?? res.data;
      const logs: AuditLog[] = Array.isArray(raw) ? raw : [];
      return logs;
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        ?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Failed to export audit logs';
      set({ exportError: msg });
      throw new Error('Export failed');
    } finally {
      set({ exporting: false });
    }
  },
}));
