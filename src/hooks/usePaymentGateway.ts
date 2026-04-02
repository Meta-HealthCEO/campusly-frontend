import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapResponse, extractErrorMessage } from '@/lib/api-helpers';
import type {
  InitiatePaymentPayload,
  InitiateWalletTopupPayload,
  PaymentFormData,
  OnlinePayment,
} from '@/types';

interface PaymentGatewayResult {
  loading: boolean;
  initiatePayment: (payload: InitiatePaymentPayload) => Promise<PaymentFormData>;
  initiateWalletTopup: (payload: InitiateWalletTopupPayload) => Promise<PaymentFormData>;
  checkPaymentStatus: (paymentId: string) => Promise<OnlinePayment>;
}

export function usePaymentGateway(): PaymentGatewayResult {
  const [loading, setLoading] = useState(false);

  const initiatePayment = useCallback(async (payload: InitiatePaymentPayload): Promise<PaymentFormData> => {
    setLoading(true);
    try {
      const response = await apiClient.post('/payment-gateway/pay', payload);
      return unwrapResponse<PaymentFormData>(response);
    } catch (err: unknown) {
      throw new Error(extractErrorMessage(err, 'Failed to initiate payment'));
    } finally {
      setLoading(false);
    }
  }, []);

  const initiateWalletTopup = useCallback(async (payload: InitiateWalletTopupPayload): Promise<PaymentFormData> => {
    setLoading(true);
    try {
      const response = await apiClient.post('/payment-gateway/wallet-topup', payload);
      return unwrapResponse<PaymentFormData>(response);
    } catch (err: unknown) {
      throw new Error(extractErrorMessage(err, 'Failed to initiate wallet top-up'));
    } finally {
      setLoading(false);
    }
  }, []);

  const checkPaymentStatus = useCallback(async (paymentId: string): Promise<OnlinePayment> => {
    try {
      const response = await apiClient.get(`/payment-gateway/status/${paymentId}`);
      return unwrapResponse<OnlinePayment>(response);
    } catch (err: unknown) {
      throw new Error(extractErrorMessage(err, 'Failed to check payment status'));
    }
  }, []);

  return { loading, initiatePayment, initiateWalletTopup, checkPaymentStatus };
}
