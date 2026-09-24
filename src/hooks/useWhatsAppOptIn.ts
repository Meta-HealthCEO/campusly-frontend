'use client';

import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import { toE164, toOptInStatus } from '@/lib/whatsapp';
import { toast } from 'sonner';
import type { WhatsAppOptInStatus } from '@/types/whatsapp';

type OptInResponse = Parameters<typeof toOptInStatus>[0];

export function useWhatsAppOptIn() {
  const [optInStatus, setOptInStatus] = useState<WhatsAppOptInStatus | null>(null);
  const [loading, setLoading] = useState(false);
  // False when the status can't be read, so the page can say so instead of offering a broken form.
  const [available, setAvailable] = useState(true);

  const loadOptInStatus = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/whatsapp/opt-in-status');
      setOptInStatus(toOptInStatus(unwrapResponse<OptInResponse>(res)));
      setAvailable(true);
    } catch {
      setAvailable(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const optIn = useCallback(async (phone: string, language: string) => {
    const res = await apiClient.post('/whatsapp/opt-in', {
      phoneNumber: toE164(phone),
      preferredLanguage: language,
    });
    const status = toOptInStatus(unwrapResponse<OptInResponse>(res));
    setOptInStatus(status);
    toast.success('Opted in to WhatsApp notifications');
    return status;
  }, []);

  const optOut = useCallback(async () => {
    await apiClient.post('/whatsapp/opt-out', {});
    setOptInStatus({ optedIn: false });
    toast.success('Opted out of WhatsApp notifications');
  }, []);

  return { optInStatus, loading, available, loadOptInStatus, optIn, optOut };
}
