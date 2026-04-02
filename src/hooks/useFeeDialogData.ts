import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { unwrapList } from '@/lib/api-helpers';
import type { Student, FeeType, Invoice, Grade } from '@/types';

// ============== useStudentsList ==============

export function useStudentsList(enabled = true) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    async function fetchStudents() {
      try {
        const response = await apiClient.get('/students');
        setStudents(unwrapList<Student>(response, 'students'));
      } catch {
        console.error('Failed to load students');
      } finally {
        setLoading(false);
      }
    }
    fetchStudents();
  }, [enabled]);

  return { students, loading };
}

// ============== useInvoicesList ==============

export function useInvoicesList(
  schoolId: string,
  studentId?: string,
  enabled = true,
) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled || !schoolId) {
      setLoading(false);
      return;
    }
    async function fetchInvoices() {
      setLoading(true);
      try {
        const params: Record<string, string> = {};
        if (studentId) params.studentId = studentId;
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
    }
    fetchInvoices();
  }, [schoolId, studentId, enabled]);

  return { invoices, loading };
}

// ============== useFeeTypesList ==============

export function useFeeTypesList(schoolId: string, enabled = true) {
  const [feeTypes, setFeeTypes] = useState<FeeType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled || !schoolId) {
      setLoading(false);
      return;
    }
    async function fetchFeeTypes() {
      try {
        const response = await apiClient.get(
          `/fees/types/school/${schoolId}`,
        );
        setFeeTypes(unwrapList<FeeType>(response, 'feeTypes'));
      } catch {
        console.error('Failed to load fee types');
      } finally {
        setLoading(false);
      }
    }
    fetchFeeTypes();
  }, [schoolId, enabled]);

  return { feeTypes, loading };
}

// ============== useLedgerEntries ==============

export interface LedgerEntry {
  _id: string;
  type: string;
  amount: number;
  runningBalance: number;
  reference: string;
  description: string;
  relatedInvoiceId?: string;
  createdAt: string;
}

export function useLedgerEntries(studentId: string, schoolId: string) {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!studentId || !schoolId) {
      setEntries([]);
      return;
    }
    async function fetchLedger() {
      setLoading(true);
      try {
        const response = await apiClient.get(
          `/fees/ledger/student/${studentId}/school/${schoolId}`,
        );
        setEntries(unwrapList<LedgerEntry>(response, 'entries'));
      } catch {
        console.error('Failed to load ledger');
      } finally {
        setLoading(false);
      }
    }
    fetchLedger();
  }, [studentId, schoolId]);

  return { entries, loading };
}

// ============== useGradesList ==============

export function useGradesList(enabled = true) {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    async function fetchGrades() {
      try {
        const response = await apiClient.get('/academic/grades');
        setGrades(unwrapList<Grade>(response, 'grades'));
      } catch {
        console.error('Failed to load grades');
      } finally {
        setLoading(false);
      }
    }
    fetchGrades();
  }, [enabled]);

  return { grades, loading };
}

// ============== useFeeScheduleOptions ==============

export interface FeeScheduleOption {
  id: string;
  _id?: string;
  feeTypeId: FeeType | string;
  academicYear: number;
  term?: number;
  dueDate: string;
}

export function useFeeScheduleOptions(schoolId: string, enabled = true) {
  const [schedules, setSchedules] = useState<FeeScheduleOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled || !schoolId) {
      setLoading(false);
      return;
    }
    async function fetchSchedules() {
      try {
        const response = await apiClient.get(
          `/fees/schedules/school/${schoolId}`,
        );
        setSchedules(unwrapList<FeeScheduleOption>(response, 'schedules'));
      } catch {
        console.error('Failed to load fee schedules');
      } finally {
        setLoading(false);
      }
    }
    fetchSchedules();
  }, [schoolId, enabled]);

  return { schedules, loading };
}

// ============== useInvoiceDialogData ==============
// Combined hook for CreateInvoiceDialog: fetches students + schedules

export function useInvoiceDialogData(schoolId: string, enabled = true) {
  const { students, loading: studentsLoading } = useStudentsList(enabled);
  const { schedules, loading: schedulesLoading } = useFeeScheduleOptions(
    schoolId,
    enabled,
  );

  return {
    students,
    schedules,
    loading: studentsLoading || schedulesLoading,
  };
}

// ============== useBulkInvoiceDialogData ==============
// Combined hook for BulkInvoiceDialog: fetches grades + students + schedules

export function useBulkInvoiceDialogData(schoolId: string, enabled = true) {
  const { grades, loading: gradesLoading } = useGradesList(enabled);
  const { students, loading: studentsLoading } = useStudentsList(enabled);
  const { schedules, loading: schedulesLoading } = useFeeScheduleOptions(
    schoolId,
    enabled,
  );

  return {
    grades,
    allStudents: students,
    schedules,
    loading: gradesLoading || studentsLoading || schedulesLoading,
  };
}

// ============== useDebtorInvoices ==============
// Fetches unpaid invoices for a specific student (DebtorActions)

export function useDebtorInvoices(
  schoolId: string,
  studentId: string,
  enabled = true,
) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !schoolId) return;
    async function fetchInvoices() {
      setLoading(true);
      try {
        const response = await apiClient.get(
          `/fees/invoices/school/${schoolId}`,
          { params: { studentId } },
        );
        const list = unwrapList<Invoice>(response, 'invoices');
        setInvoices(
          list.filter(
            (inv) => inv.status !== 'paid' && inv.status !== 'cancelled',
          ),
        );
      } catch {
        console.error('Failed to load invoices');
      } finally {
        setLoading(false);
      }
    }
    fetchInvoices();
  }, [enabled, schoolId, studentId]);

  return { invoices, loading };
}
