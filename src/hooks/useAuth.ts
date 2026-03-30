'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/useAuthStore';
import { getRoleDashboardPath } from '@/lib/auth';
import apiClient from '@/lib/api-client';
import type { LoginCredentials } from '@/types';

export function useAuth() {
  const router = useRouter();
  const { login: storeLogin, logout: storeLogout, user, isAuthenticated } = useAuthStore();

  const login = async (credentials: LoginCredentials) => {
    const { data } = await apiClient.post('/auth/login', credentials);
    const responseData = data.data ?? data;
    const userData = responseData.user ?? responseData;
    const accessToken = responseData.accessToken ?? responseData.access_token;
    const refreshToken = responseData.refreshToken ?? responseData.refresh_token;
    // Normalize school_admin → admin for frontend routing
    const role = userData.role === 'school_admin' ? 'admin' : userData.role;
    storeLogin({ ...userData, role }, { accessToken, refreshToken });
    router.push(getRoleDashboardPath(role));
  };

  const logout = () => {
    storeLogout();
    router.push('/login');
  };

  return { login, logout, user, isAuthenticated };
}
