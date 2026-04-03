import { create } from 'zustand';
import type { User, UserRole, AuthTokens, UserPermissions, PermissionFlag } from '@/types';

const DEFAULT_PERMISSIONS: UserPermissions = {
  isSchoolPrincipal: false,
  isHOD: false,
  departmentId: null,
  isBursar: false,
  isReceptionist: false,
  isCounselor: false,
};

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  permissions: UserPermissions;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User) => void;
  setTokens: (tokens: AuthTokens) => void;
  login: (user: User, tokens: AuthTokens) => void;
  logout: () => void;
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
  };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  tokens: null,
  permissions: DEFAULT_PERMISSIONS,
  isAuthenticated: false,
  isLoading: true,
  setUser: (user) => {
    const perms = parsePermissions(user as unknown as Record<string, unknown>);
    set({ user, permissions: perms, isAuthenticated: true });
  },
  setTokens: (tokens) => set({ tokens }),
  login: (user, tokens) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
    }
    const perms = parsePermissions(user as unknown as Record<string, unknown>);
    set({ user, tokens, permissions: perms, isAuthenticated: true, isLoading: false });
  },
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
    set({ user: null, tokens: null, permissions: DEFAULT_PERMISSIONS, isAuthenticated: false, isLoading: false });
  },
  setLoading: (isLoading) => set({ isLoading }),
  hasRole: (role) => get().user?.role === role,
  hasPermission: (flag) => {
    const val = get().permissions[flag];
    return typeof val === 'boolean' ? val : val !== null;
  },
}));
