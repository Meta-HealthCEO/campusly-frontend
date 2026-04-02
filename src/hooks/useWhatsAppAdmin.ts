'use client';

import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse, unwrapList } from '@/lib/api-helpers';
import { toast } from 'sonner';
import type {
  WhatsAppConfig,
  WhatsAppMessage,
  WhatsAppDeliveryStats,
} from '@/types/whatsapp';

export function useWhatsAppAdmin(schoolId: string) {
  const [config, setConfig] = useState<WhatsAppConfig | null>(null);
  const [deliveryStats, setDeliveryStats] = useState<WhatsAppDeliveryStats | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/whatsapp/config/school/${schoolId}`);
      setConfig(unwrapResponse<WhatsAppConfig>(res));
    } catch (err: unknown) {
      console.error('Failed to load WhatsApp config', err);
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  const saveConfig = useCallback(async (data: Partial<WhatsAppConfig>) => {
    const res = await apiClient.put(`/whatsapp/config/school/${schoolId}`, data);
    const saved = unwrapResponse<WhatsAppConfig>(res);
    setConfig(saved);
    toast.success('WhatsApp configuration saved');
    return saved;
  }, [schoolId]);

  const loadStats = useCallback(async () => {
    try {
      const res = await apiClient.get(`/whatsapp/stats/school/${schoolId}`);
      setDeliveryStats(unwrapResponse<WhatsAppDeliveryStats>(res));
    } catch (err: unknown) {
      console.error('Failed to load delivery stats', err);
    }
  }, [schoolId]);

  const loadMessages = useCallback(async () => {
    try {
      const res = await apiClient.get(`/whatsapp/messages/school/${schoolId}`);
      setMessages(unwrapList<WhatsAppMessage>(res));
    } catch (err: unknown) {
      console.error('Failed to load messages', err);
    }
  }, [schoolId]);

  const broadcast = useCallback(async (data: {
    templateType: string;
    recipientFilter?: Record<string, string>;
    message?: string;
  }) => {
    const res = await apiClient.post(`/whatsapp/broadcast/school/${schoolId}`, data);
    toast.success('Broadcast sent');
    return unwrapResponse(res);
  }, [schoolId]);

  return {
    config, deliveryStats, messages, loading,
    loadConfig, saveConfig, loadStats, loadMessages, broadcast,
  };
}
