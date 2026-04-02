import { create } from 'zustand';
import type { SchoolDocument } from '@/types';

export function mapSchool(raw: Record<string, unknown>): SchoolDocument {
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
  school: SchoolDocument | null;
  schoolLoading: boolean;
  schoolError: string | null;

  schools: SchoolDocument[];
  schoolsTotal: number;
  schoolsPage: number;
  schoolsLimit: number;
  schoolsSearch: string;
  schoolsLoading: boolean;
  schoolsError: string | null;

  // State setters
  setSchool: (school: SchoolDocument | null) => void;
  setSchoolLoading: (loading: boolean) => void;
  setSchoolError: (error: string | null) => void;
  setSchools: (data: {
    schools: SchoolDocument[];
    total: number;
    page: number;
    limit: number;
  }) => void;
  setSchoolsLoading: (loading: boolean) => void;
  setSchoolsError: (error: string | null) => void;
  setSchoolsSearch: (search: string) => void;
  setSchoolsPage: (page: number) => void;
  clearSchool: () => void;
}

export const useSchoolStore = create<SchoolState>((set) => ({
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

  setSchool: (school) => set({ school }),
  setSchoolLoading: (loading) => set({ schoolLoading: loading }),
  setSchoolError: (error) => set({ schoolError: error }),
  setSchools: (data) =>
    set({
      schools: data.schools,
      schoolsTotal: data.total,
      schoolsPage: data.page,
      schoolsLimit: data.limit,
    }),
  setSchoolsLoading: (loading) => set({ schoolsLoading: loading }),
  setSchoolsError: (error) => set({ schoolsError: error }),
  setSchoolsSearch: (search) => set({ schoolsSearch: search }),
  setSchoolsPage: (page) => set({ schoolsPage: page }),
  clearSchool: () => set({ school: null }),
}));
