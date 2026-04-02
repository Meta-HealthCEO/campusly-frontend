import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { unwrapList } from '@/lib/api-helpers';
import { useAuthStore } from '@/stores/useAuthStore';
import type { FeeType, Invoice, Grade } from '@/types';

// ============== useFeeOverview (main fees page) ==============

export function useFeeOverview() {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId ?? '';
  const [feeTypes, setFeeTypes] = useState<FeeType[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFeeTypes = useCallback(async () => {
    if (!schoolId) return;
    try {
      const response = await apiClient.get(`/fees/types/school/${schoolId}`);
      setFeeTypes(unwrapList<FeeType>(response, 'feeTypes'));
    } catch {
      console.error('Failed to refresh fee types');
    }
  }, [schoolId]);

  useEffect(() => {
    async function fetchData() {
      if (!schoolId) return;
      try {
        const [feeTypesRes, invoicesRes] = await Promise.all([
          apiClient.get(`/fees/types/school/${schoolId}`),
          apiClient.get(`/fees/invoices/school/${schoolId}`),
        ]);
        setFeeTypes(unwrapList<FeeType>(feeTypesRes, 'feeTypes'));
        setInvoices(unwrapList<Invoice>(invoicesRes, 'invoices'));
      } catch {
        console.error('Failed to load fee data');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [schoolId]);

  return { feeTypes, invoices, loading, refetchFeeTypes: fetchFeeTypes, schoolId };
}

// ============== useInvoices ==============

export function useInvoices(statusFilter = 'all') {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId ?? '';
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvoices = useCallback(async () => {
    if (!schoolId) return;
    try {
      const params: Record<string, string> = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      const response = await apiClient.get(
        `/fees/invoices/school/${schoolId}`,
        { params },
      );
      setInvoices(unwrapList<Invoice>(response, 'invoices'));
    } catch {
      console.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }, [schoolId, statusFilter]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  return { invoices, loading, refetch: fetchInvoices, schoolId };
}

// ============== useCreditNotes ==============

export interface CreditNote {
  _id: string;
  creditNoteNumber: string;
  invoiceId: string | { _id: string; invoiceNumber?: string };
  studentId:
    | string
    | { _id: string; user?: { firstName?: string; lastName?: string } };
  amount: number;
  reason: string;
  status: string;
  createdAt: string;
}

export function useCreditNotes() {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId ?? '';
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCreditNotes = useCallback(async () => {
    if (!schoolId) return;
    try {
      const response = await apiClient.get(
        `/fees/credit-notes/school/${schoolId}`,
      );
      setCreditNotes(unwrapList<CreditNote>(response, 'creditNotes'));
    } catch {
      console.error('Failed to load credit notes');
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  const approveRejectCreditNote = async (
    id: string,
    status: 'approved' | 'rejected',
  ) => {
    try {
      await apiClient.patch(`/fees/credit-notes/${id}/approve`, { status });
      toast.success(`Credit note ${status} successfully`);
      fetchCreditNotes();
    } catch {
      toast.error(
        `Failed to ${status === 'approved' ? 'approve' : 'reject'} credit note`,
      );
    }
  };

  useEffect(() => {
    fetchCreditNotes();
  }, [fetchCreditNotes]);

  return {
    creditNotes,
    loading,
    refetch: fetchCreditNotes,
    approveRejectCreditNote,
    schoolId,
  };
}

// ============== useExemptions ==============

export interface FeeExemption {
  _id: string;
  studentId:
    | string
    | { _id: string; user?: { firstName?: string; lastName?: string } };
  feeTypeId: string | { _id: string; name?: string };
  exemptionType: string;
  discountPercentage?: number;
  fixedAmount?: number;
  reason: string;
  status: string;
  validFrom: string;
  validTo: string;
  createdAt: string;
}

export function useExemptions(statusFilter = 'all') {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId ?? '';
  const [exemptions, setExemptions] = useState<FeeExemption[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchExemptions = useCallback(async () => {
    if (!schoolId) return;
    try {
      const params: Record<string, string> = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      const response = await apiClient.get(
        `/fees/exemptions/school/${schoolId}`,
        { params },
      );
      setExemptions(unwrapList<FeeExemption>(response, 'exemptions'));
    } catch {
      console.error('Failed to load exemptions');
    } finally {
      setLoading(false);
    }
  }, [schoolId, statusFilter]);

  useEffect(() => {
    fetchExemptions();
  }, [fetchExemptions]);

  return { exemptions, loading, refetch: fetchExemptions, schoolId };
}

// ============== useArrangements ==============

interface Instalment {
  dueDate: string;
  amount: number;
  paidAmount: number;
  status: string;
}

export interface PaymentArrangementRow {
  _id: string;
  studentId:
    | string
    | { _id: string; user?: { firstName?: string; lastName?: string } };
  totalOutstanding: number;
  instalmentAmount: number;
  numberOfInstalments: number;
  remainingInstalments: number;
  frequency: string;
  startDate: string;
  nextPaymentDate?: string;
  status: string;
  instalments: Instalment[];
  createdAt: string;
}

export function useArrangements() {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId ?? '';
  const [arrangements, setArrangements] = useState<PaymentArrangementRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchArrangements = useCallback(async () => {
    if (!schoolId) return;
    try {
      const response = await apiClient.get(
        `/fees/payment-arrangements/school/${schoolId}`,
      );
      setArrangements(
        unwrapList<PaymentArrangementRow>(response, 'arrangements'),
      );
    } catch {
      console.error('Failed to load payment arrangements');
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    fetchArrangements();
  }, [fetchArrangements]);

  return { arrangements, loading, refetch: fetchArrangements, schoolId };
}

// ============== useFeeSchedules ==============

export interface FeeScheduleData {
  id: string;
  _id?: string;
  feeTypeId: Record<string, unknown> | string;
  schoolId: string;
  academicYear: number;
  term?: number;
  dueDate: string;
  appliesTo: { type: 'school' | 'grade' | 'student'; targetId: string };
  isDeleted?: boolean;
  createdAt?: string;
}

export function useFeeSchedules(schoolId: string) {
  const [schedules, setSchedules] = useState<FeeScheduleData[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSchedules = useCallback(async () => {
    if (!schoolId) return;
    try {
      const res = await apiClient.get(`/fees/schedules/school/${schoolId}`);
      setSchedules(unwrapList<FeeScheduleData>(res, 'schedules'));
    } catch {
      console.error('Failed to load fee schedules');
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    if (!schoolId) return;
    async function init() {
      try {
        const [, gradeRes] = await Promise.all([
          fetchSchedules(),
          apiClient.get('/academic/grades'),
        ]);
        setGrades(unwrapList<Grade>(gradeRes, 'grades'));
      } catch {
        console.error('Failed to load grades');
      }
    }
    init();
  }, [schoolId, fetchSchedules]);

  return { schedules, grades, loading, refetch: fetchSchedules };
}
