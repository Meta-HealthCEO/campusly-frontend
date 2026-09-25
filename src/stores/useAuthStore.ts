import { create } from 'zustand';
import { scheduleTokenRefresh, cancelTokenRefresh } from '@/lib/token-refresh';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import type { User, UserRole, AuthTokens, UserPermissions, PermissionFlag } from '@/types';
import type { Subscription, Plan } from '@/types/subscription';
import { userFromApi } from '@/lib/user-from-api';

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

/** Learner sign-up (POST /auth/register-student). */
export interface StudentSignUp {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  classroomCode: string;
}

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
  /** Re-read the user and plan from /auth/me (sign-in and sign-up responses don't carry the plan). */
  refreshAccount: () => Promise<void>;
  /** Learner sign-up: sign in, then re-read the account so the portal flags are there on the first page. */
  signUpStudent: (payload: StudentSignUp) => Promise<User>;
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
  refreshAccount: async () => {
    try {
      const raw = unwrapResponse<Record<string, unknown>>(await apiClient.get('/auth/me'));
      const userData = raw.user as Record<string, unknown> | undefined;
      // Also re-read the user, so changes made elsewhere (e.g. a verified email) show at once.
      const fresh = userData ? { user: userFromApi(userData), permissions: parsePermissions(userData) } : {};
      set({
        ...fresh,
        subscription: (raw.subscription as Subscription | null) ?? null,
        plan: (raw.plan as Plan | null) ?? null,
      });
    } catch {
      // Not fatal: the user stays signed in and AuthProvider re-reads these on the next load.
      console.warn('Failed to load account plan details');
    }
  },
  signUpStudent: async (payload) => {
    const raw = unwrapResponse<Record<string, unknown>>(await apiClient.post('/auth/register-student', payload));
    const userData = (raw.user ?? raw) as Record<string, unknown>;
    const accessToken = String(raw.accessToken ?? raw.access_token ?? '');
    const user: User = { ...userFromApi(userData), role: 'student' };
    get().login(user, { accessToken, refreshToken: '' });
    await get().refreshAccount();
    return get().user ?? user;
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
    const user: User = userFromApi(userData);
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
