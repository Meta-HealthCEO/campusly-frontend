import { create } from 'zustand';
import apiClient from '@/lib/api-client';
import type {
  SchoolDocument,
  CreateSchoolInput,
  UpdateSchoolInput,
  UpdateSettingsInput,
} from '@/types';

function mapSchool(raw: Record<string, unknown>): SchoolDocument {
  return {
    id: (raw._id ?? raw.id) as string,
    name: raw.name as string,
    address: raw.address as SchoolDocument['address'],
    logo: raw.logo as string | undefined,
    contactInfo: raw.contactInfo as SchoolDocument['contactInfo'],
    subscription: raw.subscription as SchoolDocument['subscription'],
    modulesEnabled: (raw.modulesEnabled ?? []) as string[],
    settings: raw.settings as SchoolDocument['settings'],
    principal: raw.principal as string | undefined,
    emisNumber: raw.emisNumber as string | undefined,
    type: raw.type as SchoolDocument['type'],
    isActive: (raw.isActive ?? true) as boolean,
    isDeleted: (raw.isDeleted ?? false) as boolean,
    createdAt: raw.createdAt as string,
    updatedAt: raw.updatedAt as string,
  };
}

interface SchoolState {
  // Current school context (for admin/teacher/parent/student)
  school: SchoolDocument | null;
  schoolLoading: boolean;
  schoolError: string | null;

  // Super admin: school list
  schools: SchoolDocument[];
  schoolsTotal: number;
  schoolsPage: number;
  schoolsLimit: number;
  schoolsSearch: string;
  schoolsLoading: boolean;
  schoolsError: string | null;

  // Actions
  fetchSchool: (id: string) => Promise<void>;
  fetchSchools: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    sort?: string;
  }) => Promise<void>;
  createSchool: (data: CreateSchoolInput) => Promise<SchoolDocument>;
  updateSchool: (id: string, data: UpdateSchoolInput) => Promise<void>;
  deleteSchool: (id: string) => Promise<void>;
  updateSettings: (id: string, data: UpdateSettingsInput) => Promise<void>;
  setSchoolsSearch: (search: string) => void;
  setSchoolsPage: (page: number) => void;
  clearSchool: () => void;
}

export const useSchoolStore = create<SchoolState>((set, get) => ({
  school: null,
  schoolLoading: false,
  schoolError: null,

  schools: [],
  schoolsTotal: 0,
  schoolsPage: 1,
  schoolsLimit: 20,
  schoolsSearch: '',
  schoolsLoading: false,
  schoolsError: null,

  fetchSchool: async (id) => {
    set({ schoolLoading: true, schoolError: null });
    try {
      const response = await apiClient.get(`/schools/${id}`);
      const payload = response.data.data;
      const raw: Record<string, unknown> =
        (payload.school as Record<string, unknown> | undefined) ?? payload;
      set({ school: mapSchool(raw), schoolLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch school';
      set({ schoolError: message, schoolLoading: false });
      throw err;
    }
  },

  fetchSchools: async (params) => {
    set({ schoolsLoading: true, schoolsError: null });
    try {
      const response = await apiClient.get('/schools', { params });
      const payload = response.data.data as Record<string, unknown>;
      const rawList = (payload.schools ?? payload.data ?? []) as Record<string, unknown>[];
      const pagination = payload.pagination as Record<string, number> | undefined;
      const total = (pagination?.total ?? payload.total ?? rawList.length) as number;
      const page = (pagination?.page ?? payload.page ?? params?.page ?? 1) as number;
      const limit = (pagination?.limit ?? payload.limit ?? params?.limit ?? 20) as number;
      set({
        schools: rawList.map(mapSchool),
        schoolsTotal: total,
        schoolsPage: page,
        schoolsLimit: limit,
        schoolsLoading: false,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch schools';
      set({ schoolsError: message, schoolsLoading: false });
      throw err;
    }
  },

  createSchool: async (data) => {
    try {
      const response = await apiClient.post('/schools', data);
      const payload = response.data.data as Record<string, unknown>;
      const raw: Record<string, unknown> =
        (payload.school as Record<string, unknown> | undefined) ?? payload;
      return mapSchool(raw);
    } catch (err) {
      throw err;
    }
  },

  updateSchool: async (id, data) => {
    try {
      await apiClient.put(`/schools/${id}`, data);
      if (get().school?.id === id) {
        await get().fetchSchool(id);
      }
    } catch (err) {
      throw err;
    }
  },

  deleteSchool: async (id) => {
    try {
      await apiClient.delete(`/schools/${id}`);
    } catch (err) {
      throw err;
    }
  },

  updateSettings: async (id, data) => {
    try {
      await apiClient.patch(`/schools/${id}/settings`, data);
      if (get().school?.id === id) {
        await get().fetchSchool(id);
      }
    } catch (err) {
      throw err;
    }
  },

  setSchoolsSearch: (search) => set({ schoolsSearch: search }),

  setSchoolsPage: (page) => set({ schoolsPage: page }),

  clearSchool: () => set({ school: null }),
}));
