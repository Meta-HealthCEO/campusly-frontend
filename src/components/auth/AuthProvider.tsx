'use client';

import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { getStoredTokens, clearStoredTokens } from '@/lib/auth';
import { scheduleTokenRefresh } from '@/lib/token-refresh';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import type { User } from '@/types';
import type { Subscription, Plan, FreeAllowance } from '@/types/subscription';
import { userFromApi } from '@/lib/user-from-api';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  useEffect(() => {
    const { setUser, setTokens, setLoading, setSubscription, setFreeAllowance } = useAuthStore.getState();

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
        const user: User = userFromApi(userData);
        const subscription = (raw.subscription as Subscription | null) ?? null;
        const plan = (raw.plan as Plan | null) ?? null;

        setUser(user);
        setTokens(tokens);
        setSubscription(subscription, plan);
        setFreeAllowance((raw.freeAllowance as FreeAllowance | null) ?? null);
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
