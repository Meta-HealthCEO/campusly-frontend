import { useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { extractErrorMessage, unwrapResponse } from '@/lib/api-helpers';
import type { FeeTypeFormData } from '@/lib/validations';

// ============== Fee Type Mutations ==============

export function useFeeTypeMutations(schoolId: string) {
  const createFeeType = useCallback(
    async (data: FeeTypeFormData) => {
      const response = await apiClient.post('/fees/types', { ...data, schoolId });
      return unwrapResponse(response);
    },
    [schoolId],
  );

  const updateFeeType = useCallback(
    async (feeId: string, data: FeeTypeFormData) => {
      const response = await apiClient.patch(`/fees/types/${feeId}`, data);
      return unwrapResponse(response);
    },
    [],
  );

  const deleteFeeType = useCallback(async (feeId: string) => {
    await apiClient.delete(`/fees/types/${feeId}`);
  }, []);

  return { createFeeType, updateFeeType, deleteFeeType };
}

// ============== Invoice Mutations ==============

interface CreateInvoicePayload {
  studentId: string;
  schoolId: string;
  feeScheduleId: string;
  items: { description: string; amount: number }[];
  dueDate: string;
}

interface BulkInvoicePayload {
  schoolId: string;
  studentIds: string[];
  items: { description: string; amount: number }[];
  dueDate: string;
  feeScheduleId?: string;
}

interface RecordPaymentPayload {
  amount: number;
  paymentMethod: string;
  reference?: string;
  notes?: string;
}

export function useInvoiceMutations() {
  const createInvoice = useCallback(async (payload: CreateInvoicePayload) => {
    const response = await apiClient.post('/fees/invoices', payload);
    return unwrapResponse(response);
  }, []);

  const createBulkInvoices = useCallback(
    async (payload: BulkInvoicePayload) => {
      const response = await apiClient.post('/fees/invoices/bulk', payload);
      return unwrapResponse(response);
    },
    [],
  );

  const recordPayment = useCallback(
    async (invoiceId: string, payload: RecordPaymentPayload) => {
      const response = await apiClient.post(
        `/fees/invoices/${invoiceId}/pay`,
        payload,
      );
      return unwrapResponse(response);
    },
    [],
  );

  const applyDiscount = useCallback(
    async (invoiceId: string, amount: number, reason: string) => {
      const response = await apiClient.post('/fees/discount', {
        invoiceId,
        amount,
        reason,
      });
      return unwrapResponse(response);
    },
    [],
  );

  return { createInvoice, createBulkInvoices, recordPayment, applyDiscount };
}

// ============== Schedule Mutations ==============

interface SchedulePayload {
  feeTypeId: string;
  schoolId: string;
  academicYear: number;
  term?: number;
  dueDate: string;
  appliesTo: { type: 'school' | 'grade' | 'student'; targetId: string };
}

interface ScheduleUpdatePayload {
  academicYear: number;
  term?: number;
  dueDate: string;
  appliesTo: { type: 'school' | 'grade' | 'student'; targetId: string };
}

export function useScheduleMutations() {
  const createSchedule = useCallback(async (payload: SchedulePayload) => {
    const response = await apiClient.post('/fees/schedules', payload);
    return unwrapResponse(response);
  }, []);

  const updateSchedule = useCallback(
    async (scheduleId: string, payload: ScheduleUpdatePayload) => {
      const response = await apiClient.patch(
        `/fees/schedules/${scheduleId}`,
        payload,
      );
      return unwrapResponse(response);
    },
    [],
  );

  const deleteSchedule = useCallback(async (scheduleId: string) => {
    await apiClient.delete(`/fees/schedules/${scheduleId}`);
  }, []);

  return { createSchedule, updateSchedule, deleteSchedule };
}

// ============== Debt / Collection Mutations ==============

interface WriteOffPayload {
  invoiceId: string;
  amount: number;
  reason: string;
}

interface EscalatePayload {
  invoiceId: string;
  stage: string;
  notes?: string;
}

export function useDebtMutations() {
  const writeOff = useCallback(async (payload: WriteOffPayload) => {
    const response = await apiClient.post('/fees/write-off', payload);
    return unwrapResponse(response);
  }, []);

  const escalateCollection = useCallback(async (payload: EscalatePayload) => {
    const response = await apiClient.post(
      '/fees/collections/escalate',
      payload,
    );
    return unwrapResponse(response);
  }, []);

  return { writeOff, escalateCollection };
}

// ============== Exemption Mutations ==============

interface CreateExemptionPayload {
  studentId: string;
  schoolId: string;
  feeTypeId: string;
  exemptionType: string;
  reason: string;
  validFrom: string;
  validTo: string;
  discountPercentage?: number;
  fixedAmount?: number;
}

export function useExemptionMutations() {
  const createExemption = useCallback(
    async (payload: CreateExemptionPayload) => {
      const response = await apiClient.post('/fees/exemptions', payload);
      return unwrapResponse(response);
    },
    [],
  );

  return { createExemption };
}

// ============== Arrangement Mutations ==============

interface CreateArrangementPayload {
  studentId: string;
  schoolId: string;
  totalOutstanding: number;
  instalmentAmount: number;
  numberOfInstalments: number;
  frequency: string;
  startDate: string;
}

export function useArrangementMutations() {
  const createArrangement = useCallback(
    async (payload: CreateArrangementPayload) => {
      const response = await apiClient.post(
        '/fees/payment-arrangements',
        payload,
      );
      return unwrapResponse(response);
    },
    [],
  );

  return { createArrangement };
}

// ============== Credit Note Mutations ==============

interface CreateCreditNotePayload {
  invoiceId: string;
  studentId: string;
  schoolId: string;
  amount: number;
  reason: string;
}

export function useCreditNoteMutations() {
  const createCreditNote = useCallback(
    async (payload: CreateCreditNotePayload) => {
      const response = await apiClient.post('/fees/credit-notes', payload);
      return unwrapResponse(response);
    },
    [],
  );

  return { createCreditNote };
}

// Re-export extractErrorMessage for components to use
export { extractErrorMessage };
