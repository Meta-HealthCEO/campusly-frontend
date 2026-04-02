import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { unwrapResponse } from '@/lib/api-helpers';
import type { Student, Invoice } from '@/types';

export interface StatementSummary {
  totalInvoiced: number;
  totalPaid: number;
  totalCredits: number;
  outstanding: number;
}

export interface StatementPayment {
  id?: string;
  reference?: string;
  date: string;
  method: string;
  amount: number;
}

export interface StatementData {
  invoices: Invoice[];
  payments: StatementPayment[];
  summary: StatementSummary;
}

export function useStatementStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStudents() {
      try {
        const response = await apiClient.get('/students');
        const raw = unwrapResponse(response);
        const list = Array.isArray(raw)
          ? raw
          : (raw as Record<string, unknown>).students ??
            (raw as Record<string, unknown>).data ??
            [];
        setStudents(
          (list as Record<string, unknown>[]).map((s) => ({
            ...s,
            id: (s._id as string) ?? (s.id as string) ?? '',
          })) as Student[],
        );
      } catch {
        console.error('Failed to load students');
      } finally {
        setLoading(false);
      }
    }
    fetchStudents();
  }, []);

  return { students, loading };
}

export async function generateStatement(
  studentId: string,
  schoolId: string,
  fromDate?: string,
  toDate?: string,
): Promise<StatementData | null> {
  try {
    const body: Record<string, string> = { studentId, schoolId };
    if (fromDate) body.fromDate = fromDate;
    if (toDate) body.toDate = toDate;
    const response = await apiClient.post('/fees/statements', body);
    const raw = unwrapResponse(response);
    const invoicesArr: Invoice[] = Array.isArray(raw.invoices)
      ? (raw.invoices as Invoice[])
      : [];
    const paymentsArr: StatementPayment[] = Array.isArray(raw.payments)
      ? (raw.payments as StatementPayment[])
      : [];
    const summary: StatementSummary = (raw.summary as StatementSummary) ?? {
      totalInvoiced: 0,
      totalPaid: 0,
      totalCredits: 0,
      outstanding: 0,
    };
    return { invoices: invoicesArr, payments: paymentsArr, summary };
  } catch {
    toast.error('Failed to generate statement');
    return null;
  }
}
