'use client';

import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { getStoredTokens, clearStoredTokens } from '@/lib/auth';
import { scheduleTokenRefresh } from '@/lib/token-refresh';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import type { User } from '@/types';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  useEffect(() => {
    const { setUser, setTokens, setLoading } = useAuthStore.getState();

    const tokens = getStoredTokens();
    if (!tokens) {
      setLoading(false);
      return;
    }

    apiClient
      .get('/auth/me')
      .then((response) => {
        const raw = unwrapResponse(response);
        const userData = raw.user ?? raw;
        const user: User = {
          id: userData._id ?? userData.id,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role === 'school_admin' ? 'admin' : userData.role,
          phone: userData.phone ?? '',
          schoolId: userData.schoolId ?? '',
          isActive: userData.isActive ?? true,
          isSchoolPrincipal: userData.isSchoolPrincipal === true,
          isHOD: userData.isHOD === true,
          isBursar: userData.isBursar === true,
          isCounselor: userData.isCounselor === true,
          isReceptionist: userData.isReceptionist === true,
          isStandaloneTeacher: userData.isStandaloneTeacher === true,
          isStandaloneCoach: userData.isStandaloneCoach === true,
          avatar: userData.profileImage ?? userData.avatar ?? undefined,
          createdAt: userData.createdAt ?? '',
          updatedAt: userData.updatedAt ?? '',
        };
        setUser(user);
        setTokens(tokens);
        setLoading(false);
        scheduleTokenRefresh();
      })
      .catch(() => {
        clearStoredTokens();
        setLoading(false);
      });
  }, []);

  return <>{children}</>;
}
