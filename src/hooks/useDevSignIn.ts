'use client';

import { useCallback, useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import { devSignInErrorMessage, groupDevAccounts, parseDevAccounts } from '@/lib/dev-sign-in';
import { useAuth } from '@/hooks/useAuth';
import type { DevSignInAccount, DevSignInGroups } from '@/types/dev-sign-in';

const EMPTY_GROUPS: DevSignInGroups = { own: [], roles: [] };

/**
 * Development-only one-click sign-in: lists the accounts the backend offers
 * and signs in as one through the same session path as the password login.
 * Pass enabled=false and it makes no requests.
 */
export function useDevSignIn(enabled: boolean) {
  const { startSession } = useAuth();
  const [groups, setGroups] = useState<DevSignInGroups>(EMPTY_GROUPS);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [signInError, setSignInError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/auth/dev-sign-in/accounts');
      setGroups(groupDevAccounts(parseDevAccounts(unwrapResponse<unknown>(response))));
    } catch (err: unknown) {
      setGroups(EMPTY_GROUPS);
      setError(devSignInErrorMessage(err, 'Could not load the development accounts.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) void load();
  }, [enabled, load]);

  const signIn = async (account: DevSignInAccount) => {
    setBusyId(account.id);
    setSignInError(null);
    try {
      startSession(await apiClient.post('/auth/dev-sign-in', { userId: account.id }));
    } catch (err: unknown) {
      setSignInError(devSignInErrorMessage(err, `Could not sign in as ${account.name}.`));
      setBusyId(null);
    }
  };

  return { groups, loading, error, busyId, signInError, reload: load, signIn };
}
