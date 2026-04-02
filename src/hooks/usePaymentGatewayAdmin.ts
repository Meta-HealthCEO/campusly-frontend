import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse, unwrapList, extractErrorMessage } from '@/lib/api-helpers';
import { useAuthStore } from '@/stores/useAuthStore';
import type {
  PaymentGatewayConfig,
  OnlinePayment,
  PaymentAnalytics,
} from '@/types';

interface PaymentGatewayAdminResult {
  config: PaymentGatewayConfig | null;
  payments: OnlinePayment[];
  analytics: PaymentAnalytics | null;
  loading: boolean;
  saving: boolean;
  loadConfig: () => Promise<void>;
  saveConfig: (data: Partial<PaymentGatewayConfig>) => Promise<void>;
  loadPayments: (filters?: Record<string, string>, page?: number, limit?: number) => Promise<void>;
  loadAnalytics: () => Promise<void>;
  refundPayment: (paymentId: string, amount: number, reason: string) => Promise<void>;
}

export function usePaymentGatewayAdmin(): PaymentGatewayAdminResult {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId ?? '';
  const [config, setConfig] = useState<PaymentGatewayConfig | null>(null);
  const [payments, setPayments] = useState<OnlinePayment[]>([]);
  const [analytics, setAnalytics] = useState<PaymentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadConfig = useCallback(async () => {
    if (!schoolId) return;
    try {
      const response = await apiClient.get('/payment-gateway/config');
      setConfig(unwrapResponse<PaymentGatewayConfig>(response));
    } catch {
      console.error('Failed to load payment gateway config');
    }
  }, [schoolId]);

  const saveConfig = useCallback(async (data: Partial<PaymentGatewayConfig>) => {
    setSaving(true);
    try {
      const response = await apiClient.put('/payment-gateway/config', data);
      setConfig(unwrapResponse<PaymentGatewayConfig>(response));
    } catch (err: unknown) {
      throw new Error(extractErrorMessage(err, 'Failed to save config'));
    } finally {
      setSaving(false);
    }
  }, []);

  const loadPayments = useCallback(async (
    filters?: Record<string, string>,
    page = 1,
    limit = 50,
  ) => {
    if (!schoolId) return;
    try {
      const params = { ...filters, page: String(page), limit: String(limit) };
      const response = await apiClient.get('/payment-gateway/payments', { params });
      setPayments(unwrapList<OnlinePayment>(response, 'payments'));
    } catch {
      console.error('Failed to load online payments');
    }
  }, [schoolId]);

  const loadAnalytics = useCallback(async () => {
    if (!schoolId) return;
    try {
      const response = await apiClient.get('/payment-gateway/analytics');
      setAnalytics(unwrapResponse<PaymentAnalytics>(response));
    } catch {
      console.error('Failed to load payment analytics');
    }
  }, [schoolId]);

  const refundPayment = useCallback(async (paymentId: string, amount: number, reason: string) => {
    try {
      await apiClient.post('/payment-gateway/refund', { paymentId, amount, reason });
    } catch (err: unknown) {
      throw new Error(extractErrorMessage(err, 'Failed to process refund'));
    }
  }, []);

  useEffect(() => {
    if (!schoolId) return;
    async function init() {
      setLoading(true);
      await Promise.all([loadConfig(), loadPayments(), loadAnalytics()]);
      setLoading(false);
    }
    init();
  }, [schoolId, loadConfig, loadPayments, loadAnalytics]);

  return {
    config, payments, analytics, loading, saving,
    loadConfig, saveConfig, loadPayments, loadAnalytics, refundPayment,
  };
}
