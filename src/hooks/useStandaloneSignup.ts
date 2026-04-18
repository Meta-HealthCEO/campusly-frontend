import { useState } from 'react';
import apiClient from '@/lib/api-client';
import { useAuthStore } from '@/stores/useAuthStore';
import { unwrapResponse } from '@/lib/api-helpers';
import type { User, AuthTokens } from '@/types';

interface SignupPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  country?: string;
}

interface SignupResult {
  user: User;
  accessToken: string;
}

export function useStandaloneSignup() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const login = useAuthStore((s) => s.login);

  const signup = async (data: SignupPayload): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.post('/auth/signup/standalone-teacher', data);
      const result = unwrapResponse<SignupResult>(res);
      login(result.user, { accessToken: result.accessToken, refreshToken: '' } as AuthTokens);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? 'Signup failed. Please try again.';
      setError(
        message === 'A user with this email already exists'
          ? 'An account with this email already exists. Try signing in instead.'
          : message,
      );
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { signup, loading, error };
}
