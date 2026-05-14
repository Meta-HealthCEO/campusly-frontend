import { create } from 'zustand';
import { scheduleTokenRefresh, cancelTokenRefresh } from '@/lib/token-refresh';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import type { User, UserRole, AuthTokens, UserPermissions, PermissionFlag } from '@/types';
import type { Subscription, Plan } from '@/types/subscription';

const DEFAULT_PERMISSIONS: UserPermissions = {
  isSchoolPrincipal: false,
  isHOD: false,
  departmentId: null,
  isBursar: false,
  isReceptionist: false,
  isCounselor: false,
  isStandaloneTeacher: false,
  isStandaloneCoach: false,
};

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  permissions: UserPermissions;
  subscription: Subscription | null;
  plan: Plan | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User) => void;
  setTokens: (tokens: AuthTokens) => void;
  setSubscription: (sub: Subscription | null, plan: Plan | null) => void;
  login: (user: User, tokens: AuthTokens, subscription?: Subscription | null, plan?: Plan | null) => void;
  logout: () => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  setLoading: (loading: boolean) => void;
  hasRole: (role: UserRole) => boolean;
  hasPermission: (flag: PermissionFlag) => boolean;
}

/** Extract permission flags from an auth/me response user object. */
function parsePermissions(raw: Record<string, unknown>): UserPermissions {
  return {
    isSchoolPrincipal: raw.isSchoolPrincipal === true,
    isHOD: raw.isHOD === true,
    departmentId: typeof raw.departmentId === 'string' ? raw.departmentId : null,
    isBursar: raw.isBursar === true,
    isReceptionist: raw.isReceptionist === true,
    isCounselor: raw.isCounselor === true,
    isStandaloneTeacher: raw.isStandaloneTeacher === true,
    isStandaloneCoach: raw.isStandaloneCoach === true,
  };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  tokens: null,
  permissions: DEFAULT_PERMISSIONS,
  subscription: null,
  plan: null,
  isAuthenticated: false,
  isLoading: true,
  setUser: (user) => {
    const perms = parsePermissions(user as unknown as Record<string, unknown>);
    set({ user, permissions: perms, isAuthenticated: true });
  },
  setTokens: (tokens) => set({ tokens }),
  setSubscription: (subscription, plan) => set({ subscription, plan }),
  login: (user, tokens, subscription = null, plan = null) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
    }
    const perms = parsePermissions(user as unknown as Record<string, unknown>);
    set({ user, tokens, permissions: perms, subscription, plan, isAuthenticated: true, isLoading: false });
    scheduleTokenRefresh();
  },
  logout: () => {
    cancelTokenRefresh();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
    set({ user: null, tokens: null, permissions: DEFAULT_PERMISSIONS, subscription: null, plan: null, isAuthenticated: false, isLoading: false });
  },
  changePassword: async (currentPassword: string, newPassword: string) => {
    await apiClient.post('/auth/change-password', { currentPassword, newPassword });
    // Refresh the user from /auth/me so mustChangePassword flips to false in-store.
    const response = await apiClient.get('/auth/me');
    const raw = unwrapResponse<Record<string, unknown>>(response);
    const userData = (raw.user ?? raw) as Record<string, unknown>;
    const role = userData.role === 'school_admin' ? 'admin' : (userData.role as UserRole);
    const user: User = {
      id: (userData._id as string) ?? (userData.id as string),
      email: userData.email as string,
      firstName: userData.firstName as string,
      lastName: userData.lastName as string,
      role,
      phone: (userData.phone as string) ?? '',
      schoolId: (userData.schoolId as string) ?? '',
      isActive: (userData.isActive as boolean) ?? true,
      isSchoolPrincipal: userData.isSchoolPrincipal === true,
      isHOD: userData.isHOD === true,
      isBursar: userData.isBursar === true,
      isCounselor: userData.isCounselor === true,
      isReceptionist: userData.isReceptionist === true,
      isStandaloneTeacher: userData.isStandaloneTeacher === true,
      isStandaloneCoach: userData.isStandaloneCoach === true,
      mustChangePassword: userData.mustChangePassword === true,
      avatar: (userData.profileImage as string) ?? (userData.avatar as string) ?? undefined,
      createdAt: (userData.createdAt as string) ?? '',
      updatedAt: (userData.updatedAt as string) ?? '',
    };
    const perms = parsePermissions(userData);
    set({ user, permissions: perms, isAuthenticated: true });
  },
  setLoading: (isLoading) => set({ isLoading }),
  hasRole: (role) => get().user?.role === role,
  hasPermission: (flag) => {
    const val = get().permissions[flag];
    return typeof val === 'boolean' ? val : val !== null;
  },
}));
