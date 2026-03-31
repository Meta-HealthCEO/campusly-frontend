'use client';

import { useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';

// ---------- Types ----------

export interface ReportFilters {
  startDate: string;
  endDate: string;
  classId: string;
  term: string;
  academicYear: string;
  tuckShopPeriod: 'daily' | 'weekly' | 'monthly';
}

export interface RevenueDataPoint {
  month: number;
  year: number;
  total: number;
}

export interface AttendanceStatusCount {
  status: string;
  count: number;
}

export interface AcademicPerformanceEntry {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  averagePercentage: number;
  totalMarks: number;
}

interface PopulatedSubject {
  _id: string;
  name: string;
  code: string;
}

interface PopulatedAssessment {
  _id: string;
  name: string;
  type: string;
  term: number;
  academicYear: number;
  totalMarks: number;
  weight: number;
  subjectId: PopulatedSubject;
}

export interface ReportCardMark {
  _id: string;
  studentId: string;
  assessmentId: PopulatedAssessment;
  mark: number;
  percentage: number;
  comment?: string;
}

export interface ReportCardData {
  studentId: string;
  term: number;
  academicYear: number;
  marks: ReportCardMark[];
}

interface PopulatedStudent {
  _id: string;
  admissionNumber?: string;
  userId?: { firstName?: string; lastName?: string };
  [key: string]: unknown;
}

export interface DebtorReportEntry {
  invoiceId: string;
  invoiceNumber: string;
  studentId: PopulatedStudent;
  totalAmount: number;
  paidAmount: number;
  outstanding: number;
  ageDays: number;
  bucket: '0-30' | '31-60' | '61-90' | '90+';
}

interface TuckShopPeriodShape {
  year: number;
  month?: number;
  day?: number;
  week?: number;
}

export interface TuckShopSalesEntry {
  period: TuckShopPeriodShape;
  totalSales: number;
  orderCount: number;
}

function unwrap<T>(responseData: unknown): T {
  const outer = responseData as Record<string, unknown>;
  const raw = (outer?.data ?? outer) as T;
  return raw;
}

function unwrapArray<T>(responseData: unknown): T[] {
  const outer = responseData as Record<string, unknown>;
  const raw = outer?.data ?? outer;
  if (Array.isArray(raw)) return raw as T[];
  const inner = (raw as Record<string, unknown>)?.data;
  if (Array.isArray(inner)) return inner as T[];
  return [];
}

// ---------- Hook ----------

export function useReports() {
  const [loading, setLoading] = useState(false);

  const fetchRevenue = useCallback(async (filters: Partial<ReportFilters>) => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      const response = await apiClient.get('/reports/revenue', { params });
      return unwrapArray<RevenueDataPoint>(response.data);
    } catch {
      console.error('Failed to load revenue report');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAttendance = useCallback(async (filters: Partial<ReportFilters>) => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.classId) params.classId = filters.classId;
      const response = await apiClient.get('/reports/attendance', { params });
      return unwrapArray<AttendanceStatusCount>(response.data);
    } catch {
      console.error('Failed to load attendance report');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAcademicPerformance = useCallback(
    async (filters: Partial<ReportFilters>) => {
      setLoading(true);
      try {
        const params: Record<string, string> = {};
        if (filters.term) params.term = filters.term;
        if (filters.academicYear) params.academicYear = filters.academicYear;
        const response = await apiClient.get('/reports/academic-performance', { params });
        return unwrapArray<AcademicPerformanceEntry>(response.data);
      } catch {
        console.error('Failed to load academic performance report');
        return [];
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const fetchStudentReportCard = useCallback(
    async (studentId: string, term: string, academicYear: string) => {
      setLoading(true);
      try {
        const response = await apiClient.get(
          `/reports/student-report-card/${studentId}`,
          { params: { term, academicYear } }
        );
        return unwrap<ReportCardData>(response.data);
      } catch {
        console.error('Failed to load student report card');
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const fetchDebtors = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/reports/debtors');
      return unwrapArray<DebtorReportEntry>(response.data);
    } catch {
      console.error('Failed to load debtors report');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTuckShopSales = useCallback(
    async (filters: Partial<ReportFilters>) => {
      setLoading(true);
      try {
        const params: Record<string, string> = {};
        if (filters.tuckShopPeriod) params.period = filters.tuckShopPeriod;
        if (filters.startDate) params.startDate = filters.startDate;
        if (filters.endDate) params.endDate = filters.endDate;
        const response = await apiClient.get('/reports/tuck-shop-sales', { params });
        return unwrapArray<TuckShopSalesEntry>(response.data);
      } catch {
        console.error('Failed to load tuck shop sales report');
        return [];
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    loading,
    fetchRevenue,
    fetchAttendance,
    fetchAcademicPerformance,
    fetchStudentReportCard,
    fetchDebtors,
    fetchTuckShopSales,
  };
}
