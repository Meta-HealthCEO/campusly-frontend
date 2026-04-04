'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import { useAuthStore } from '@/stores/useAuthStore';
import type { User } from '@/types';

interface JoinSchoolResult {
  joinSchool: (joinCode: string) => Promise<void>;
  fetchJoinCode: () => Promise<string>;
  isLoading: boolean;
}

export function useJoinSchool(): JoinSchoolResult {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { login: storeLogin } = useAuthStore();

  const joinSchool = async (joinCode: string): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await apiClient.post('/auth/join-school', { joinCode });
      const responseData = unwrapResponse(response);
      const userData = responseData.user ?? responseData;
      const accessToken = responseData.accessToken ?? responseData.access_token;
      const refreshToken = responseData.refreshToken ?? responseData.refresh_token ?? '';

      const role = userData.role === 'school_admin' ? 'admin' : (userData.role as string);
      const authUser: User = {
        id: userData._id ?? userData.id,
        email: userData.email as string,
        firstName: userData.firstName as string,
        lastName: userData.lastName as string,
        role: role as User['role'],
        phone: (userData.phone as string) ?? '',
        schoolId: (userData.schoolId as string) ?? '',
        isActive: (userData.isActive as boolean) ?? true,
        avatar: (userData.profileImage as string) ?? (userData.avatar as string) ?? undefined,
        createdAt: (userData.createdAt as string) ?? '',
        updatedAt: (userData.updatedAt as string) ?? '',
      };

      storeLogin(authUser, { accessToken: accessToken as string, refreshToken });
      toast.success('You have successfully joined the school!');
      router.push('/teacher');
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to join school. Please check your join code.';
      toast.error(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const fetchJoinCode = async (): Promise<string> => {
    const response = await apiClient.get('/schools/join-code');
    const data = unwrapResponse(response);
    return (data.joinCode as string) ?? '';
  };

  return { joinSchool, fetchJoinCode, isLoading };
}
