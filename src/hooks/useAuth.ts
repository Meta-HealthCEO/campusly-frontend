'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/useAuthStore';
import { getRoleDashboardPath } from '@/lib/auth';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import type { LoginCredentials, User } from '@/types';

export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
  phone?: string;
}

export interface RegisterTeacherPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  schoolName?: string;
}

export interface ResetPasswordPayload {
  token: string;
  password: string;
}

export function useAuth() {
  const router = useRouter();
  const { login: storeLogin, logout: storeLogout, user, isAuthenticated } = useAuthStore();

  const login = async (credentials: LoginCredentials) => {
    const response = await apiClient.post('/auth/login', credentials);
    const responseData = unwrapResponse(response);
    const userData = responseData.user ?? responseData;
    const accessToken = responseData.accessToken ?? responseData.access_token;
    const refreshToken = responseData.refreshToken ?? responseData.refresh_token;
    // Normalize school_admin → admin for frontend routing
    const role = userData.role === 'school_admin' ? 'admin' : userData.role;
    const authUser: User = {
      id: userData._id ?? userData.id,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      role,
      phone: userData.phone ?? '',
      schoolId: userData.schoolId ?? '',
      isActive: userData.isActive ?? true,
      avatar: userData.profileImage ?? userData.avatar ?? undefined,
      createdAt: userData.createdAt ?? '',
      updatedAt: userData.updatedAt ?? '',
    };
    storeLogin(authUser, { accessToken, refreshToken: refreshToken ?? '' });
    router.push(getRoleDashboardPath(role));
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

  const registerTeacher = async (payload: RegisterTeacherPayload) => {
    const response = await apiClient.post('/auth/register-teacher', payload);
    const responseData = unwrapResponse(response);
    const userData = responseData.user ?? responseData;
    const accessToken = responseData.accessToken ?? responseData.access_token;
    const refreshToken = responseData.refreshToken ?? responseData.refresh_token;
    const role = userData.role === 'school_admin' ? 'admin' : userData.role;
    const authUser: User = {
      id: userData._id ?? userData.id,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      role,
      phone: userData.phone ?? '',
      schoolId: userData.schoolId ?? '',
      isActive: userData.isActive ?? true,
      avatar: userData.profileImage ?? userData.avatar ?? undefined,
      createdAt: userData.createdAt ?? '',
      updatedAt: userData.updatedAt ?? '',
    };
    storeLogin(authUser, { accessToken, refreshToken: refreshToken ?? '' });
    router.push('/teacher/onboarding');
  };

  const forgotPassword = async (email: string) => {
    await apiClient.post('/auth/forgot-password', { email });
  };

  const resetPassword = async (payload: ResetPasswordPayload) => {
    await apiClient.post('/auth/reset-password', payload);
  };

  return { login, logout, register, registerTeacher, forgotPassword, resetPassword, user, isAuthenticated };
}
