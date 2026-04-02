'use client';

import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import { toast } from 'sonner';
import type { WhatsAppOptInStatus } from '@/types/whatsapp';

export function useWhatsAppOptIn() {
  const [optInStatus, setOptInStatus] = useState<WhatsAppOptInStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const loadOptInStatus = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/whatsapp/opt-in');
      setOptInStatus(unwrapResponse<WhatsAppOptInStatus>(res));
    } catch (err: unknown) {
      console.error('Failed to load opt-in status', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const optIn = useCallback(async (phone: string, language: string) => {
    const res = await apiClient.post('/whatsapp/opt-in', {
      phoneNumber: phone,
      preferredLanguage: language,
    });
    const status = unwrapResponse<WhatsAppOptInStatus>(res);
    setOptInStatus(status);
    toast.success('Opted in to WhatsApp notifications');
    return status;
  }, []);

  const optOut = useCallback(async () => {
    await apiClient.delete('/whatsapp/opt-in');
    setOptInStatus({ optedIn: false });
    toast.success('Opted out of WhatsApp notifications');
  }, []);

  return { optInStatus, loading, loadOptInStatus, optIn, optOut };
}
