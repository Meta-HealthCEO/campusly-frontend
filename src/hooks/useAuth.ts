'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore, type StudentSignUp } from '@/stores/useAuthStore';
import { getRoleDashboardPath } from '@/lib/auth';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import type { LoginCredentials, User } from '@/types';
import { userFromApi } from '@/lib/user-from-api';

export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
  phone?: string;
}

export type RegisterStudentPayload = StudentSignUp;

export interface ResetPasswordPayload {
  token: string;
  password: string;
}

export function useAuth() {
  const router = useRouter();
  const { login: storeLogin, logout: storeLogout, refreshAccount, signUpStudent, user, isAuthenticated } = useAuthStore();

  /** Store the session from a login response and open the role's home. The password
   *  login and the development sign-in (useDevSignIn) both end here. */
  const startSession = (response: { data: { data?: unknown } }) => {
    const responseData = unwrapResponse(response);
    const userData = responseData.user ?? responseData;
    const accessToken = responseData.accessToken ?? responseData.access_token;
    const refreshToken = responseData.refreshToken ?? responseData.refresh_token;
    const authUser: User = userFromApi(userData);
    storeLogin(authUser, { accessToken, refreshToken: refreshToken ?? '' });
    void refreshAccount();
    router.push(getRoleDashboardPath(authUser.role));
  };

  const login = async (credentials: LoginCredentials) => {
    startSession(await apiClient.post('/auth/login', credentials));
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Ignore errors — logout should always succeed locally
    }
    storeLogout();
    router.push('/login');
  };

  const register = async (payload: RegisterPayload) => {
    await apiClient.post('/auth/register', payload);
  };

  const registerStudent = async (payload: RegisterStudentPayload) => {
    await signUpStudent(payload);
    router.push(getRoleDashboardPath('student'));
  };

  const forgotPassword = async (email: string) => {
    await apiClient.post('/auth/forgot-password', { email });
  };

  const resetPassword = async (payload: ResetPasswordPayload) => {
    await apiClient.post('/auth/reset-password', payload);
  };

  return { login, startSession, logout, register, registerStudent, forgotPassword, resetPassword, user, isAuthenticated };
}
