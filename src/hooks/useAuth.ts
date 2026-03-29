'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/useAuthStore';
import { getRoleDashboardPath } from '@/lib/auth';
import { mockUsers } from '@/lib/mock-data';
import type { LoginCredentials } from '@/types';

export function useAuth() {
  const router = useRouter();
  const { login: storeLogin, logout: storeLogout, user, isAuthenticated } = useAuthStore();

  const login = async (credentials: LoginCredentials) => {
    // Mock login - find user by email
    const found = mockUsers.find((u) => u.email === credentials.email);
    if (!found) {
      throw new Error('Invalid email or password');
    }
    const tokens = { accessToken: 'mock-access-token', refreshToken: 'mock-refresh-token' };
    storeLogin(found, tokens);
    router.push(getRoleDashboardPath(found.role));
  };

  const logout = () => {
    storeLogout();
    router.push('/login');
  };

  return { login, logout, user, isAuthenticated };
}
